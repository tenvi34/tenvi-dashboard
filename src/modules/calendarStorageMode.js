import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readStorageMode, saveStorageMode, STORAGE_MODES } from './storageMode.js'

export const CALENDAR_STORAGE_MODES = STORAGE_MODES

// Calendar LOCAL/REMOTE 선택값 보존
export const readCalendarStorageMode = (storage = globalThis.localStorage) =>
  readStorageMode(STORAGE_KEYS.calendarStorageMode, storage)

export const saveCalendarStorageMode = (
  mode,
  storage = globalThis.localStorage,
) => saveStorageMode(STORAGE_KEYS.calendarStorageMode, mode, storage)
