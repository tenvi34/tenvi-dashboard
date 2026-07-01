import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import {
  BOARD_STORAGE_MODES,
  readBoardStorageMode,
  saveBoardStorageMode,
} from './boardStorageMode.js'

const createStorage = (value = null) => ({
  getItem: vi.fn(() => value),
  setItem: vi.fn(),
})

describe('boardStorageMode', () => {
  it('defaults to local for missing or invalid values', () => {
    expect(readBoardStorageMode(createStorage())).toBe(BOARD_STORAGE_MODES.local)
    expect(readBoardStorageMode(createStorage('unknown'))).toBe(BOARD_STORAGE_MODES.local)
  })

  it('reads and saves remote mode with the dedicated storage key', () => {
    const storage = createStorage('remote')

    expect(readBoardStorageMode(storage)).toBe(BOARD_STORAGE_MODES.remote)
    expect(saveBoardStorageMode('remote', storage)).toBe(BOARD_STORAGE_MODES.remote)
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.boardStorageMode,
      BOARD_STORAGE_MODES.remote,
    )
  })

  it('normalizes unsupported values to local when saving', () => {
    const storage = createStorage()

    expect(saveBoardStorageMode('unsupported', storage)).toBe(BOARD_STORAGE_MODES.local)
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.boardStorageMode,
      BOARD_STORAGE_MODES.local,
    )
  })
})
