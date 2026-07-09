import {
  REMOTE_APP_SETTING_KEYS,
  fetchRemoteAppSettings,
  saveRemoteAppSettings,
  saveRemoteAppSetting,
} from '../api/appSettingsApi.js'
import {
  createRemoteProfileImage,
  fetchProfileImages,
  saveRemoteProfile,
} from '../api/profileApi.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { isSupportedLanguage } from '../i18n/translations.js'
import { getAllProfileImages } from './profileImageStore.js'
import { START_MODULES, THEMES } from './settingsBackup.js'
import { parseUserProfile } from './userProfileLogic.js'

const HUD_EFFECTS = ['minimal', 'normal', 'max']

const createCopyResult = (total) => ({
  total,
  copied: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
})

const readStoredSetting = (storageKey, fallbackValue) => {
  try {
    return globalThis.localStorage?.getItem(storageKey) ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

export const parseRemoteSettingValue = (setting) => {
  try {
    return JSON.parse(setting?.valueJson ?? 'null')
  } catch {
    return null
  }
}

export const normalizeRemoteAppSettings = (settings = []) => {
  const nextSettings = {}

  settings.forEach((setting) => {
    const value = parseRemoteSettingValue(setting)

    if (setting.key === 'language' && isSupportedLanguage(value)) {
      nextSettings.language = value
    }

    if (setting.key === 'theme') {
      const normalizedTheme = value === 'hud' ? 'dark' : value

      if (THEMES.includes(normalizedTheme)) {
        nextSettings.theme = normalizedTheme
      }
    }

    if (setting.key === 'startModule' && START_MODULES.includes(value)) {
      nextSettings.startModule = value
    }

    if (setting.key === 'hudEffect' && HUD_EFFECTS.includes(value)) {
      nextSettings.hudEffect = value
    }
  })

  return nextSettings
}

export const loadRemoteAppSettings = async ({
  fetchSettings = fetchRemoteAppSettings,
} = {}) => normalizeRemoteAppSettings(await fetchSettings())

export const saveRemoteSettingValue = (key, value) =>
  REMOTE_APP_SETTING_KEYS.includes(key)
    ? saveRemoteAppSetting(key, JSON.stringify(value))
    : Promise.resolve(null)

const readLocalAppSettings = () => ({
  language: readStoredSetting(STORAGE_KEYS.language, 'ko'),
  theme: readStoredSetting(STORAGE_KEYS.theme, 'dark'),
  startModule: readStoredSetting(STORAGE_KEYS.startModule, 'tasks'),
  hudEffect: readStoredSetting(STORAGE_KEYS.hudEffect, 'normal'),
})

const toRemoteSettingPayload = ([key, value]) => ({
  key,
  valueJson: JSON.stringify(value),
})

// LOCAL Profile 원본 보존 후 REMOTE 프로필과 이미지에 반영
export const copyLocalProfileToRemote = async ({
  fetchImages = fetchProfileImages,
  getLocalImages = getAllProfileImages,
  saveImage = createRemoteProfileImage,
  saveProfile = saveRemoteProfile,
  storage = globalThis.localStorage,
} = {}) => {
  const localProfile = parseUserProfile(storage?.getItem(STORAGE_KEYS.userProfile))
  const localImages = await getLocalImages()
  const result = createCopyResult(1 + localImages.length)

  try {
    await saveProfile(localProfile)
    result.updated += 1
  } catch {
    result.failed += 1
  }

  if (localImages.length === 0) {
    return result
  }

  const remoteImages = await fetchImages()
  const remoteIds = new Set(remoteImages.map((image) => String(image.id)))

  for (const image of localImages) {
    if (!image?.id) {
      result.failed += 1
      continue
    }

    if (remoteIds.has(String(image.id))) {
      result.skipped += 1
      continue
    }

    try {
      const createdImage = await saveImage(image)
      remoteIds.add(String(createdImage?.id ?? image.id))
      result.copied += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}

// API URL과 저장소 모드는 기기별 값으로 남기고 공통 설정만 REMOTE에 복사
export const copyLocalSettingsToRemote = async ({
  fetchSettings = fetchRemoteAppSettings,
  saveSettings = saveRemoteAppSettings,
} = {}) => {
  const localSettings = readLocalAppSettings()
  const payload = Object.entries(localSettings).map(toRemoteSettingPayload)
  const result = createCopyResult(payload.length)
  const remoteSettings = await fetchSettings()
  const remoteSettingsByKey = new Map(
    remoteSettings.map((setting) => [setting.key, setting.valueJson]),
  )
  const changedPayload = []

  payload.forEach((setting) => {
    if (!remoteSettingsByKey.has(setting.key)) {
      result.copied += 1
      changedPayload.push(setting)
      return
    }

    if (remoteSettingsByKey.get(setting.key) === setting.valueJson) {
      result.skipped += 1
      return
    }

    result.updated += 1
    changedPayload.push(setting)
  })

  if (changedPayload.length === 0) {
    return result
  }

  try {
    await saveSettings(changedPayload)
  } catch {
    result.failed = changedPayload.length
    result.copied = 0
    result.updated = 0
  }

  return result
}
