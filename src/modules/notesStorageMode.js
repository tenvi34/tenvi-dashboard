import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readStorageMode, saveStorageMode, STORAGE_MODES } from './storageMode.js'

export const NOTES_STORAGE_MODES = STORAGE_MODES

export const readNotesStorageMode = (storage = globalThis.localStorage) =>
  readStorageMode(STORAGE_KEYS.notesStorageMode, storage)

export const saveNotesStorageMode = (mode, storage = globalThis.localStorage) =>
  saveStorageMode(STORAGE_KEYS.notesStorageMode, mode, storage)
