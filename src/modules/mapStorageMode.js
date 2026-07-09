import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readStorageMode, saveStorageMode, STORAGE_MODES } from './storageMode.js'

export const MAP_STORAGE_MODES = STORAGE_MODES

export const readMapStorageMode = (storage = globalThis.localStorage) =>
  readStorageMode(STORAGE_KEYS.mapStorageMode, storage)

export const saveMapStorageMode = (mode, storage = globalThis.localStorage) =>
  saveStorageMode(STORAGE_KEYS.mapStorageMode, mode, storage)
