import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  BOARD_BACKUP_APP,
  BOARD_BACKUP_STORAGE_KEYS,
  BOARD_BACKUP_TYPE,
  BOARD_BACKUP_VERSION,
  collectBoardBackupData,
  createBoardBackupFileName,
  restoreBoardBackupData,
  validateBoardBackupData,
} from './boardBackupLogic.js'

const createStorageMock = (initialEntries = {}) => {
  const store = new Map(Object.entries(initialEntries))

  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    removeItem: vi.fn((key) => store.delete(key)),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    snapshot: () => Object.fromEntries(store.entries()),
  }
}

const createValidBoardBackup = (overrides = {}) => ({
  version: BOARD_BACKUP_VERSION,
  app: BOARD_BACKUP_APP,
  type: BOARD_BACKUP_TYPE,
  exportedAt: '2026-06-22T00:00:00.000Z',
  localStorage: {
    [STORAGE_KEYS.boardPosts]: '[{"id":"post-1"}]',
    [STORAGE_KEYS.boardCategories]: '[{"id":"general","name":"일반"}]',
    [STORAGE_KEYS.boardDraft]: null,
    [STORAGE_KEYS.boardDrafts]: '[]',
    [STORAGE_KEYS.userProfile]: '{"nickname":"TENVI"}',
  },
  indexedDb: {
    boardImages: [
      {
        id: 'board-image-1',
        dataUrl: 'data:image/png;base64,abc',
        name: 'image.png',
        type: 'image/png',
        createdAt: '2026-06-22T00:00:00.000Z',
      },
    ],
  },
  ...overrides,
})

describe('boardBackupLogic', () => {
  it('creates a Board backup payload with localStorage keys and images', async () => {
    const storage = createStorageMock({
      [STORAGE_KEYS.boardPosts]: '[{"id":"post-1"}]',
      [STORAGE_KEYS.userProfile]: '{"nickname":"TENVI"}',
    })
    const backupPayload = await collectBoardBackupData({
      now: new Date('2026-06-22T00:00:00.000Z'),
      readBoardImages: async () => [
        {
          id: 'board-image-1',
          dataUrl: 'data:image/png;base64,abc',
          name: 'image.png',
          type: 'image/png',
          createdAt: '2026-06-22T00:00:00.000Z',
        },
      ],
      readProfileImages: async () => [
        {
          id: 'profile-image-1',
          dataUrl: 'data:image/png;base64,profile',
          name: 'profile.png',
          type: 'image/png',
          createdAt: '2026-06-22T00:00:00.000Z',
        },
      ],
      storage,
    })

    expect(backupPayload).toMatchObject({
      app: BOARD_BACKUP_APP,
      type: BOARD_BACKUP_TYPE,
      version: BOARD_BACKUP_VERSION,
      exportedAt: '2026-06-22T00:00:00.000Z',
    })
    expect(Object.keys(backupPayload.localStorage)).toEqual(
      BOARD_BACKUP_STORAGE_KEYS,
    )
    expect(backupPayload.indexedDb.boardImages).toHaveLength(1)
    expect(backupPayload.indexedDb.profileImages).toHaveLength(1)
  })

  it('validates backup version and type metadata', () => {
    expect(validateBoardBackupData(createValidBoardBackup())).toMatchObject({
      app: BOARD_BACKUP_APP,
      type: BOARD_BACKUP_TYPE,
      version: BOARD_BACKUP_VERSION,
    })
    expect(validateBoardBackupData({ ...createValidBoardBackup(), type: 'bad' })).toBe(
      null,
    )
    expect(
      validateBoardBackupData({ ...createValidBoardBackup(), version: 999 }),
    ).toBe(null)
  })

  it('rejects malformed backup JSON shapes', () => {
    expect(validateBoardBackupData(null)).toBe(null)
    expect(validateBoardBackupData([])).toBe(null)
    expect(
      validateBoardBackupData({
        ...createValidBoardBackup(),
        localStorage: { [STORAGE_KEYS.boardPosts]: [] },
      }),
    ).toBe(null)
    expect(
      validateBoardBackupData({
        ...createValidBoardBackup(),
        indexedDb: { boardImages: [{ id: '', dataUrl: '' }] },
      }),
    ).toBe(null)
  })

  it('restores only allowed localStorage keys', async () => {
    const storage = createStorageMock({
      unrelated: 'keep-me',
      [STORAGE_KEYS.boardPosts]: '[]',
    })
    const putImages = vi.fn(async () => {})
    const putProfileImageRecords = vi.fn(async () => {})

    await restoreBoardBackupData(
      createValidBoardBackup({
        localStorage: {
          ...createValidBoardBackup().localStorage,
          unrelated: 'drop-me',
        },
      }),
      { putImages, putProfileImageRecords, storage },
    )

    expect(storage.snapshot().unrelated).toBe('keep-me')
    expect(storage.snapshot()[STORAGE_KEYS.boardPosts]).toBe('[{"id":"post-1"}]')
    expect(storage.snapshot()[STORAGE_KEYS.boardDraft]).toBeUndefined()
  })

  it('passes board image records to IndexedDB restore helper', async () => {
    const storage = createStorageMock()
    const putImages = vi.fn(async () => {})
    const putProfileImageRecords = vi.fn(async () => {})

    const restoredBackup = await restoreBoardBackupData(createValidBoardBackup(), {
      putImages,
      putProfileImageRecords,
      storage,
    })

    expect(restoredBackup.indexedDb.boardImages).toHaveLength(1)
    expect(putImages).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'board-image-1' }),
    ])
    expect(putProfileImageRecords).toHaveBeenCalledWith([])
  })

  it('validates and restores profile image records when included', async () => {
    const storage = createStorageMock()
    const putImages = vi.fn(async () => {})
    const putProfileImageRecords = vi.fn(async () => {})
    const backupPayload = createValidBoardBackup({
      indexedDb: {
        boardImages: [],
        profileImages: [
          {
            id: 'profile-image-1',
            dataUrl: 'data:image/png;base64,profile',
            name: 'profile.png',
            type: 'image/png',
            createdAt: '2026-06-22T00:00:00.000Z',
          },
        ],
      },
    })

    const restoredBackup = await restoreBoardBackupData(backupPayload, {
      putImages,
      putProfileImageRecords,
      storage,
    })

    expect(restoredBackup.indexedDb.profileImages).toHaveLength(1)
    expect(putProfileImageRecords).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'profile-image-1' }),
    ])
  })

  it('creates timestamped Board backup filenames', () => {
    expect(createBoardBackupFileName(new Date('2026-06-22T03:04:05.000Z'))).toBe(
      'tenvi-board-backup-20260622-030405.json',
    )
  })
})
