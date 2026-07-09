import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readStorageMode, saveStorageMode, STORAGE_MODES } from './storageMode.js'

export const TASKS_STORAGE_MODES = STORAGE_MODES

export const readTasksStorageMode = (storage = globalThis.localStorage) =>
  readStorageMode(STORAGE_KEYS.tasksStorageMode, storage)

export const saveTasksStorageMode = (mode, storage = globalThis.localStorage) =>
  saveStorageMode(STORAGE_KEYS.tasksStorageMode, mode, storage)
