import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import useSettingsBackup from './settings/useSettingsBackup.js'
import SettingsBackupPanels from './settings/SettingsBackupPanels.jsx'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import UserAvatar from '../components/UserAvatar.jsx'
import {
  createRemoteProfileImage,
  deleteRemoteProfileImage,
  fetchRemoteProfile,
  saveRemoteProfile,
} from '../api/profileApi.js'
import BackendStatus from './BackendStatus.jsx'
import {
  BOARD_STORAGE_MODES,
  readBoardStorageMode,
  saveBoardStorageMode,
} from './board/boardStorageMode.js'
import {
  copyLocalBoardCategoriesToRemote,
  copyLocalBoardImagesToRemote,
  copyLocalBoardPostsToRemote,
} from './board/boardRemoteCopy.js'
import {
  MAP_STORAGE_MODES,
  readMapStorageMode,
  saveMapStorageMode,
} from './mapStorageMode.js'
import { copyLocalMapDataToRemote } from './map/mapRemoteCopy.js'
import {
  CALENDAR_STORAGE_MODES,
  readCalendarStorageMode,
  saveCalendarStorageMode,
} from './calendarStorageMode.js'
import { copyLocalCalendarEventsToRemote } from './calendarRemoteCopy.js'
import {
  PROFILE_SETTINGS_STORAGE_MODES,
  readProfileSettingsStorageMode,
  saveProfileSettingsStorageMode,
} from './profileSettingsStorageMode.js'
import {
  copyLocalProfileToRemote,
  copyLocalSettingsToRemote,
  saveRemoteSettingValue,
} from './profileSettingsRemoteCopy.js'
import './Settings.css'
import { getPhotoRecordCount } from '../services/photoArchiveRepository.js'
import { getAllBoardImages } from './boardImageStore.js'
import {
  deleteProfileImage,
  saveProfileImage,
} from './profileImageStore.js'
import {
  LANGUAGES,
  START_MODULES,
  THEMES,
} from './settingsBackup.js'
import {
  parseUserProfile,
  resetUserProfile,
  updateUserProfile,
} from './userProfileLogic.js'

// 배포 번들에는 데이터 변경용 개발 도구를 포함하지 않음
const DeveloperTools = import.meta.env.DEV
  ? lazy(() => import('./settings/SettingsDeveloperTools.jsx')) : null

// Settings 저장 key
const BOARD_POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts
const CALENDAR_EVENTS_STORAGE_KEY = STORAGE_KEYS.calendarEvents
const USER_PROFILE_STORAGE_KEY = STORAGE_KEYS.userProfile

const SETTINGS_TABS = [
  { id: 'general', label: '\uC77C\uBC18 \uC124\uC815' },
  { id: 'backup', label: '\uBC31\uC5C5/\uBCF5\uC6D0' },
  { id: 'server', label: '\uC11C\uBC84 \uAD00\uB9AC' },
]

// 저장 배열 개수 읽기
const readStoredCount = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return 0
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    // 저장 배열 개수 fallback
    return Array.isArray(parsedValue) ? parsedValue.length : 0
  } catch {
    return 0
  }
}

// 이미지 파일 data URL 변환
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// 프로필 이미지 id 생성
const createProfileImageId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `profile-image-${globalThis.crypto.randomUUID()}`
  }

  return `profile-image-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 프로필 localStorage 저장
const saveProfileToLocalStorage = (profile) => {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

// Settings 모듈
function Settings({
  activeTab = 'general',
  language,
  onLanguageChange,
  onStartModuleChange,
  onSettingsTabChange,
  onThemeChange,
  startModule,
  t,
  theme,
}) {
  const [activeSettingsTab, setActiveSettingsTab] = useState(activeTab)
  const [boardStorageMode, setBoardStorageMode] = useState(() =>
    readBoardStorageMode(),
  )
  const [mapStorageMode, setMapStorageMode] = useState(() =>
    readMapStorageMode(),
  )
  const [calendarStorageMode, setCalendarStorageMode] = useState(() =>
    readCalendarStorageMode(),
  )
  const [profileSettingsStorageMode, setProfileSettingsStorageMode] = useState(
    () => readProfileSettingsStorageMode(),
  )
  // 백업 복원과 프로필 변경 후 저장소 요약 갱신
  const [dataVersion, setDataVersion] = useState(0)
  const [boardRemoteCopyStatus, setBoardRemoteCopyStatus] = useState(null)
  const [boardCategoriesRemoteCopyStatus, setBoardCategoriesRemoteCopyStatus] =
    useState(null)
  const [boardImagesRemoteCopyStatus, setBoardImagesRemoteCopyStatus] =
    useState(null)
  const [mapRemoteCopyStatus, setMapRemoteCopyStatus] = useState(null)
  const [calendarRemoteCopyStatus, setCalendarRemoteCopyStatus] = useState(null)
  const [profileRemoteCopyStatus, setProfileRemoteCopyStatus] = useState(null)
  const [settingsRemoteCopyStatus, setSettingsRemoteCopyStatus] = useState(null)
  const [isBoardRemoteCopying, setIsBoardRemoteCopying] = useState(false)
  const [isBoardCategoriesRemoteCopying, setIsBoardCategoriesRemoteCopying] =
    useState(false)
  const [isBoardImagesRemoteCopying, setIsBoardImagesRemoteCopying] =
    useState(false)
  const [isMapRemoteCopying, setIsMapRemoteCopying] = useState(false)
  const [isCalendarRemoteCopying, setIsCalendarRemoteCopying] = useState(false)
  const [isProfileRemoteCopying, setIsProfileRemoteCopying] = useState(false)
  const [isSettingsRemoteCopying, setIsSettingsRemoteCopying] = useState(false)
  const [boardImageCount, setBoardImageCount] = useState(0)
  const [mapPhotoCount, setMapPhotoCount] = useState(0)
  const [profileStatus, setProfileStatus] = useState(null)
  const [profileForm, setProfileForm] = useState(() =>
    parseUserProfile(localStorage.getItem(USER_PROFILE_STORAGE_KEY)),
  )
  const profileImageInputRef = useRef(null)
  const boardPostCount = readStoredCount(BOARD_POSTS_STORAGE_KEY)
  const calendarEventCount = readStoredCount(CALENDAR_EVENTS_STORAGE_KEY)
  const isProfileSettingsRemote =
    profileSettingsStorageMode === PROFILE_SETTINGS_STORAGE_MODES.remote
  const calendarStorageModeLabel =
    t.settings.calendarStorageModeLabel ?? 'Calendar storage mode'
  const calendarStorageDescription =
    t.settings.calendarStorageDescription ??
    'Stores calendar event dates, ranges, and memos.'
  const calendarRemoteCopy =
    t.settings.calendarRemoteCopy ?? 'Copy LOCAL Calendar to REMOTE'
  const calendarRemoteCopying =
    t.settings.calendarRemoteCopying ?? 'Copying Calendar to REMOTE...'
  const calendarRemoteCopyEmpty =
    t.settings.calendarRemoteCopyEmpty ??
    'There are no LOCAL Calendar events to copy.'
  const calendarRemoteCopyConnectionError =
    t.settings.calendarRemoteCopyConnectionError ??
    'Calendar copy failed because the REMOTE API is unavailable.'
  const calendarRemoteCopyResult =
    t.settings.calendarRemoteCopyResult ??
    ((copied, skipped, failed) =>
      `Calendar copy complete: ${copied} copied, ${skipped} skipped, ${failed} failed`)

  useEffect(() => {
    let isMounted = true

    getPhotoRecordCount()
      .then((count) => {
        if (isMounted) {
          setMapPhotoCount(count)
        }
      })
      .catch(() => {
        if (isMounted) {
          setMapPhotoCount(0)
        }
      })

    getAllBoardImages()
      .then((images) => {
        if (isMounted) {
          setBoardImageCount(images.length)
        }
      })
      .catch(() => {
        if (isMounted) {
          setBoardImageCount(0)
        }
      })

    return () => {
      isMounted = false
    }
  }, [dataVersion])

  useEffect(() => {
    let isMounted = true

    if (!isProfileSettingsRemote) {
      return () => {
        isMounted = false
      }
    }

    fetchRemoteProfile()
      .then((remoteProfile) => {
        if (!isMounted) {
          return
        }

        const nextProfile = parseUserProfile(JSON.stringify(remoteProfile))

        saveProfileToLocalStorage(nextProfile)
        setProfileForm(nextProfile)
      })
      .catch(() => {
        if (isMounted) {
          setProfileStatus({
            type: 'info',
            message: t.settings.profileRemoteLoadError,
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [isProfileSettingsRemote, t.settings.profileRemoteLoadError])

  // Board LOCAL 원본 REMOTE 복사
  const handleCopyBoardPostsToRemote = async () => {
    setIsBoardRemoteCopying(true)
    setBoardRemoteCopyStatus(null)

    try {
      const result = await copyLocalBoardPostsToRemote()

      if (result.total === 0) {
        setBoardRemoteCopyStatus({ type: 'info', message: t.settings.boardRemoteCopyEmpty })
        return
      }

      setBoardRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.boardRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setBoardRemoteCopyStatus({
        type: 'error',
        message: t.settings.boardRemoteCopyConnectionError,
      })
    } finally {
      setIsBoardRemoteCopying(false)
    }
  }

  // Board 카테고리 REMOTE 복사
  const handleCopyBoardCategoriesToRemote = async () => {
    setIsBoardCategoriesRemoteCopying(true)
    setBoardCategoriesRemoteCopyStatus(null)

    try {
      const result = await copyLocalBoardCategoriesToRemote()

      if (result.total === 0) {
        setBoardCategoriesRemoteCopyStatus({
          type: 'info',
          message: t.settings.boardCategoriesRemoteCopyEmpty,
        })
        return
      }

      setBoardCategoriesRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.boardCategoriesRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setBoardCategoriesRemoteCopyStatus({
        type: 'error',
        message: t.settings.boardCategoriesRemoteCopyConnectionError,
      })
    } finally {
      setIsBoardCategoriesRemoteCopying(false)
    }
  }

  // Board 이미지 REMOTE 복사
  const handleCopyBoardImagesToRemote = async () => {
    setIsBoardImagesRemoteCopying(true)
    setBoardImagesRemoteCopyStatus(null)

    try {
      const result = await copyLocalBoardImagesToRemote()

      if (result.total === 0) {
        setBoardImagesRemoteCopyStatus({
          type: 'info',
          message: t.settings.boardImagesRemoteCopyEmpty,
        })
        return
      }

      setBoardImagesRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.boardImagesRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setBoardImagesRemoteCopyStatus({
        type: 'error',
        message: t.settings.boardImagesRemoteCopyConnectionError,
      })
    } finally {
      setIsBoardImagesRemoteCopying(false)
    }
  }

  // Map 컬렉션/기록 REMOTE 복사
  const handleCopyMapToRemote = async () => {
    setIsMapRemoteCopying(true)
    setMapRemoteCopyStatus(null)

    try {
      const result = await copyLocalMapDataToRemote()
      const total = result.collections.total + result.records.total

      if (total === 0) {
        setMapRemoteCopyStatus({ type: 'info', message: t.settings.mapRemoteCopyEmpty })
        return
      }

      setMapRemoteCopyStatus({
        type:
          result.collections.failed > 0 || result.records.failed > 0
            ? 'error'
            : 'success',
        message: t.settings.mapRemoteCopyResult(result.collections, result.records),
      })
    } catch {
      setMapRemoteCopyStatus({
        type: 'error',
        message: t.settings.mapRemoteCopyConnectionError,
      })
    } finally {
      setIsMapRemoteCopying(false)
    }
  }

  // Calendar 이벤트 REMOTE 복사
  const handleCopyCalendarToRemote = async () => {
    setIsCalendarRemoteCopying(true)
    setCalendarRemoteCopyStatus(null)

    try {
      const result = await copyLocalCalendarEventsToRemote()

      if (result.total === 0) {
        setCalendarRemoteCopyStatus({
          type: 'info',
          message: calendarRemoteCopyEmpty,
        })
        return
      }

      setCalendarRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: calendarRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setCalendarRemoteCopyStatus({
        type: 'error',
        message: calendarRemoteCopyConnectionError,
      })
    } finally {
      setIsCalendarRemoteCopying(false)
    }
  }

  // Profile 공통 데이터 REMOTE 복사
  const handleCopyProfileToRemote = async () => {
    setIsProfileRemoteCopying(true)
    setProfileRemoteCopyStatus(null)

    try {
      const result = await copyLocalProfileToRemote()

      setProfileRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.profileRemoteCopyResult(
          result.copied,
          result.updated,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setProfileRemoteCopyStatus({
        type: 'error',
        message: t.settings.profileRemoteCopyConnectionError,
      })
    } finally {
      setIsProfileRemoteCopying(false)
    }
  }

  // App Settings REMOTE 복사
  const handleCopySettingsToRemote = async () => {
    setIsSettingsRemoteCopying(true)
    setSettingsRemoteCopyStatus(null)

    try {
      const result = await copyLocalSettingsToRemote()

      setSettingsRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.appSettingsRemoteCopyResult(
          result.copied,
          result.updated,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setSettingsRemoteCopyStatus({
        type: 'error',
        message: t.settings.appSettingsRemoteCopyConnectionError,
      })
    } finally {
      setIsSettingsRemoteCopying(false)
    }
  }

  // Profile/Settings 저장 모드 변경
  const handleProfileSettingsModeChange = (mode) => {
    setProfileSettingsStorageMode(saveProfileSettingsStorageMode(mode))
    setProfileStatus(null)
  }

  // 언어 설정 저장
  const handleLanguageChange = (languageId) => {
    onLanguageChange(languageId)

    if (isProfileSettingsRemote) {
      saveRemoteSettingValue('language', languageId).catch(() => {
        setSettingsRemoteCopyStatus({
          type: 'error',
          message: t.settings.appSettingsRemoteSaveError,
        })
      })
    }
  }

  // 테마 설정 저장
  const handleThemeChange = (themeId) => {
    onThemeChange(themeId)

    if (isProfileSettingsRemote) {
      saveRemoteSettingValue('theme', themeId).catch(() => {
        setSettingsRemoteCopyStatus({
          type: 'error',
          message: t.settings.appSettingsRemoteSaveError,
        })
      })
    }
  }

  // 시작 모듈 설정 저장
  const handleStartModuleChange = (moduleId) => {
    onStartModuleChange(moduleId)

    if (isProfileSettingsRemote) {
      saveRemoteSettingValue('startModule', moduleId).catch(() => {
        setSettingsRemoteCopyStatus({
          type: 'error',
          message: t.settings.appSettingsRemoteSaveError,
        })
      })
    }
  }

  // Settings 내부 탭 전환
  const handleSettingsTabChange = (tabId) => {
    setActiveSettingsTab(tabId)
    onSettingsTabChange?.(tabId)
  }

  // 프로필 텍스트 저장
  const handleSaveProfile = async () => {
    const nextProfile = updateUserProfile(
      parseUserProfile(localStorage.getItem(USER_PROFILE_STORAGE_KEY)),
      {
        nickname: profileForm.nickname,
        bio: profileForm.bio,
      },
    )

    try {
      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'success', message: t.settings.profileSaved })
      setDataVersion((currentVersion) => currentVersion + 1)
    } catch {
      setProfileStatus({
        type: 'error',
        message: t.settings.profileRemoteSaveError,
      })
    }
  }

  // 프로필 이미지 선택 저장
  const handleSelectProfileImage = async (event) => {
    const imageFile = event.target.files?.[0]

    if (!imageFile) {
      return
    }

    try {
      const currentProfile = parseUserProfile(
        localStorage.getItem(USER_PROFILE_STORAGE_KEY),
      )
      const nextImage = isProfileSettingsRemote
        ? await createRemoteProfileImage({
            id: createProfileImageId(),
            dataUrl: await readFileAsDataUrl(imageFile),
            name: imageFile.name,
            type: imageFile.type,
            createdAt: new Date().toISOString(),
          })
        : await saveProfileImage(imageFile)
      const nextProfile = updateUserProfile(currentProfile, {
        ...profileForm,
        avatarImageId: nextImage.id,
      })

      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'success', message: t.settings.profileImageSaved })

      if (currentProfile.avatarImageId) {
        const deleteImage = isProfileSettingsRemote
          ? deleteRemoteProfileImage
          : deleteProfileImage

        deleteImage(currentProfile.avatarImageId).catch(() => {
          // 이전 프로필 이미지 정리 실패 무시
        })
      }
    } catch {
      setProfileStatus({ type: 'error', message: t.settings.profileImageError })
    } finally {
      event.target.value = ''
    }
  }

  // 프로필 이미지 연결 해제
  const handleRemoveProfileImage = async () => {
    const currentProfile = parseUserProfile(
      localStorage.getItem(USER_PROFILE_STORAGE_KEY),
    )
    const nextProfile = updateUserProfile(currentProfile, {
      ...profileForm,
      avatarImageId: '',
    })

    try {
      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'info', message: t.settings.profileImageRemoved })
    } catch {
      setProfileStatus({
        type: 'error',
        message: t.settings.profileRemoteSaveError,
      })
      return
    }

    if (currentProfile.avatarImageId) {
      const deleteImage = isProfileSettingsRemote
        ? deleteRemoteProfileImage
        : deleteProfileImage

      deleteImage(currentProfile.avatarImageId).catch(() => {
            // 이전 프로필 이미지 정리 실패 무시
          })
    }
  }

  // 프로필 기본값 초기화
  const handleResetProfile = async () => {
    const currentProfile = parseUserProfile(
      localStorage.getItem(USER_PROFILE_STORAGE_KEY),
    )
    const nextProfile = resetUserProfile()

    try {
      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'info', message: t.settings.profileReset })
      setDataVersion((currentVersion) => currentVersion + 1)
    } catch {
      setProfileStatus({
        type: 'error',
        message: t.settings.profileRemoteSaveError,
      })
      return
    }

    if (currentProfile.avatarImageId) {
      const deleteImage = isProfileSettingsRemote
        ? deleteRemoteProfileImage
        : deleteProfileImage

      deleteImage(currentProfile.avatarImageId).catch(() => {
            // 이전 프로필 이미지 정리 실패 무시
          })
    }
  }

  const backup = useSettingsBackup({ language, startModule, theme, t,
    onLanguageChange, onStartModuleChange, onThemeChange, setProfileForm, setDataVersion })

  return (
    <section
      className={`module-panel settings-module settings-module--${activeSettingsTab}`}
      aria-labelledby="settings-title"
    >
      {/* Settings 헤더 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.settings.label}</p>
          <h2 id="settings-title">{t.settings.title}</h2>
        </div>
      </div>

      {/* Settings 탭 */}
      <div className="settings-tabs" aria-label="Settings tabs">
        {SETTINGS_TABS.map((tab) => (
          <button
            className={`settings-tab ${
                  activeSettingsTab === tab.id ? 'is-active' : ''
            }`}
            key={tab.id}
            type="button"
            onClick={() => handleSettingsTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-grid">
        {/* 인터페이스 설정 패널 */}
        <section className="settings-panel settings-preference-panel settings-interface-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.language} / {t.settings.theme}</p>
            <h3>{t.settings.interface}</h3>
          </div>
          <div className="settings-options" aria-label={t.settings.language}>
            {LANGUAGES.map((languageId) => (
              <button
                className={`settings-option ${
                  language === languageId ? 'is-active' : ''
                }`}
                key={languageId}
                type="button"
                onClick={() => handleLanguageChange(languageId)}
              >
                {t.languages[languageId]}
              </button>
            ))}
          </div>
          <div className="settings-combined-group">
            <p className="settings-group-label">{t.settings.theme}</p>
            <div className="settings-options" aria-label={t.settings.theme}>
              {THEMES.map((themeId) => (
                <button
                  className={`settings-option ${
                    theme === themeId ? 'is-active' : ''
                  }`}
                  key={themeId}
                  type="button"
                  onClick={() => handleThemeChange(themeId)}
                >
                  {t.settings.themes[themeId]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 시작 모듈 설정 패널 */}
        <section className="settings-panel settings-preference-panel settings-start-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.defaultStartModule}</p>
            <h3>{t.settings.startup}</h3>
          </div>
          <div
            className="settings-options settings-options-grid"
            aria-label={t.settings.defaultStartModule}
          >
            {START_MODULES.map((moduleId) => (
              <button
                className={`settings-option ${
                  startModule === moduleId ? 'is-active' : ''
                }`}
                key={moduleId}
                type="button"
                onClick={() => handleStartModuleChange(moduleId)}
              >
                {t.modules[moduleId]}
              </button>
            ))}
          </div>
        </section>

        {/* 데이터 요약 패널 */}
        <section className="settings-panel settings-data-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.dataManagement}</p>
            <h3>{t.settings.storage}</h3>
          </div>
          <div className="data-metrics">
            <div className="data-metric">
              <span>{t.settings.boardData}</span>
              <strong>{boardPostCount}</strong>
            </div>
            <div className="data-metric">
              <span>{t.settings.boardImageData}</span>
              <strong>{boardImageCount}</strong>
            </div>
            <div className="data-metric">
              <span>{t.settings.calendarData}</span>
              <strong>{calendarEventCount}</strong>
            </div>
            <div className="data-metric">
              <span>{t.settings.mapData}</span>
              <strong>{mapPhotoCount}</strong>
            </div>
          </div>
        </section>

        {/* 프로필 설정 패널 */}
        <section className="settings-panel settings-profile-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.profileLabel}</p>
            <h3>{t.settings.profileTitle}</h3>
          </div>
          <div className="profile-settings__preview">
            <UserAvatar
              avatarImageId={profileForm.avatarImageId}
              nickname={profileForm.nickname}
              size="lg"
            />
            <div>
              <strong>{profileForm.nickname || 'TENVI'}</strong>
              <span>{profileForm.bio || t.settings.profileNoBio}</span>
            </div>
          </div>
          <div className="backup-actions profile-settings__image-actions">
            <button
              className="settings-option"
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
            >
              {t.settings.selectProfileImage}
            </button>
            <button
              className="settings-option"
              type="button"
              onClick={handleRemoveProfileImage}
              disabled={!profileForm.avatarImageId}
            >
              {t.settings.removeProfileImage}
            </button>
          </div>
          <input
            ref={profileImageInputRef}
            className="backup-file-input"
            type="file"
            accept="image/*"
            aria-label={t.settings.selectProfileImage}
            onChange={handleSelectProfileImage}
          />
          <div className="settings-profile-form">
            <label className="settings-field">
              <span>{t.settings.profileNickname}</span>
              <input
                type="text"
                value={profileForm.nickname}
                onChange={(event) =>
                  setProfileForm((currentProfile) => ({
                    ...currentProfile,
                    nickname: event.target.value,
                  }))
                }
                placeholder="TENVI"
              />
            </label>
            <label className="settings-field">
              <span>{t.settings.profileBio}</span>
              <textarea
                value={profileForm.bio}
                onChange={(event) =>
                  setProfileForm((currentProfile) => ({
                    ...currentProfile,
                    bio: event.target.value,
                  }))
                }
                rows={3}
                placeholder={t.settings.profileBioPlaceholder}
              />
            </label>
          </div>
          <div className="backup-actions">
            <button
              className="settings-option"
              type="button"
              onClick={handleSaveProfile}
            >
              {t.settings.saveProfile}
            </button>
            <button
              className="settings-option"
              type="button"
              onClick={handleResetProfile}
            >
              {t.settings.resetProfile}
            </button>
          </div>
          <p className="settings-note">{t.settings.profileNote}</p>
          {profileStatus ? (
            <p className={`backup-status is-${profileStatus.type}`}>
              {profileStatus.message}
            </p>
          ) : null}
        </section>

        {/* 백엔드 연결 확인 패널 */}
        <BackendStatus t={t} />

        <section className="settings-panel settings-board-storage-panel">
          <div className="settings-board-storage-copy">
            <div className="settings-panel-header">
              <p className="module-label">{t.settings.storageModeLabel}</p>
              <h3>{t.settings.storageModeTitle}</h3>
            </div>
            <p className="settings-note settings-board-storage-note">
              {t.settings.storageModeNote}
              <span>{t.settings.storageCopyNote}</span>
            </p>
          </div>

          <div className="settings-storage-grid">
            <div className="settings-storage-row">
              <div>
                <strong>{t.modules.board}</strong>
                <span>{t.settings.boardStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.boardStorageModeLabel}
                  role="group"
                >
                  {Object.values(BOARD_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={boardStorageMode === mode}
                      className={`settings-option ${boardStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => setBoardStorageMode(saveBoardStorageMode(mode))}
                    >
                      {mode === BOARD_STORAGE_MODES.local ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${boardStorageMode}`}>
                  {boardStorageMode === BOARD_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isBoardRemoteCopying}
                  onClick={handleCopyBoardPostsToRemote}
                >
                  {isBoardRemoteCopying
                    ? t.settings.boardRemoteCopying
                    : t.settings.boardRemoteCopy}
                </button>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isBoardCategoriesRemoteCopying}
                  onClick={handleCopyBoardCategoriesToRemote}
                >
                  {isBoardCategoriesRemoteCopying
                    ? t.settings.boardCategoriesRemoteCopying
                    : t.settings.boardCategoriesRemoteCopy}
                </button>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isBoardImagesRemoteCopying}
                  onClick={handleCopyBoardImagesToRemote}
                >
                  {isBoardImagesRemoteCopying
                    ? t.settings.boardImagesRemoteCopying
                    : t.settings.boardImagesRemoteCopy}
                </button>
              </div>
              {boardRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${boardRemoteCopyStatus.type}`}>
                  {boardRemoteCopyStatus.message}
                </p>
              ) : null}
              {boardCategoriesRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${boardCategoriesRemoteCopyStatus.type}`}>
                  {boardCategoriesRemoteCopyStatus.message}
                </p>
              ) : null}
              {boardImagesRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${boardImagesRemoteCopyStatus.type}`}>
                  {boardImagesRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>

            <div className="settings-storage-row">
              <div>
                <strong>{t.modules.map}</strong>
                <span>{t.settings.mapStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.mapStorageModeLabel}
                  role="group"
                >
                  {Object.values(MAP_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={mapStorageMode === mode}
                      className={`settings-option ${mapStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => setMapStorageMode(saveMapStorageMode(mode))}
                    >
                      {mode === MAP_STORAGE_MODES.local ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${mapStorageMode}`}>
                  {mapStorageMode === MAP_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isMapRemoteCopying}
                  onClick={handleCopyMapToRemote}
                >
                  {isMapRemoteCopying
                    ? t.settings.mapRemoteCopying
                    : t.settings.mapRemoteCopy}
                </button>
              </div>
              {mapRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${mapRemoteCopyStatus.type}`}>
                  {mapRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>

            <div className="settings-storage-row">
              <div>
                <strong>{t.modules.calendar}</strong>
                <span>{calendarStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={calendarStorageModeLabel}
                  role="group"
                >
                  {Object.values(CALENDAR_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={calendarStorageMode === mode}
                      className={`settings-option ${calendarStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => setCalendarStorageMode(saveCalendarStorageMode(mode))}
                    >
                      {mode === CALENDAR_STORAGE_MODES.local ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${calendarStorageMode}`}>
                  {calendarStorageMode === CALENDAR_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isCalendarRemoteCopying}
                  onClick={handleCopyCalendarToRemote}
                >
                  {isCalendarRemoteCopying
                    ? calendarRemoteCopying
                    : calendarRemoteCopy}
                </button>
              </div>
              {calendarRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${calendarRemoteCopyStatus.type}`}>
                  {calendarRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>

            <div className="settings-storage-row">
              <div>
                <strong>{t.settings.profileSettingsStorageTitle}</strong>
                <span>{t.settings.profileSettingsStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.profileSettingsStorageModeLabel}
                  role="group"
                >
                  {Object.values(PROFILE_SETTINGS_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={profileSettingsStorageMode === mode}
                      className={`settings-option ${profileSettingsStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => handleProfileSettingsModeChange(mode)}
                    >
                      {mode === PROFILE_SETTINGS_STORAGE_MODES.local
                        ? 'Local'
                        : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${profileSettingsStorageMode}`}>
                  {profileSettingsStorageMode === PROFILE_SETTINGS_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isProfileRemoteCopying}
                  onClick={handleCopyProfileToRemote}
                >
                  {isProfileRemoteCopying
                    ? t.settings.profileRemoteCopying
                    : t.settings.profileRemoteCopy}
                </button>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isSettingsRemoteCopying}
                  onClick={handleCopySettingsToRemote}
                >
                  {isSettingsRemoteCopying
                    ? t.settings.appSettingsRemoteCopying
                    : t.settings.appSettingsRemoteCopy}
                </button>
              </div>
              {profileRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${profileRemoteCopyStatus.type}`}>
                  {profileRemoteCopyStatus.message}
                </p>
              ) : null}
              {settingsRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${settingsRemoteCopyStatus.type}`}>
                  {settingsRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>
          </div>
        </section>
        {DeveloperTools && activeSettingsTab === 'server' && <Suspense fallback={null}><DeveloperTools t={t} /></Suspense>}

        <SettingsBackupPanels t={t} {...backup} />
      </div>
    </section>
  )
}

export default Settings
