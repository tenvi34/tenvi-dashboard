import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readStorageMode, saveStorageMode, STORAGE_MODES } from './storageMode.js'

export const PROFILE_SETTINGS_STORAGE_MODES = STORAGE_MODES

// Profile/Settings 원격 동기화 선택값
export const readProfileSettingsStorageMode = (
  storage = globalThis.localStorage,
) => readStorageMode(STORAGE_KEYS.profileSettingsStorageMode, storage)

export const saveProfileSettingsStorageMode = (
  mode,
  storage = globalThis.localStorage,
) => saveStorageMode(STORAGE_KEYS.profileSettingsStorageMode, mode, storage)
