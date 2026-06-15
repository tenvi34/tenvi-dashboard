import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP,
  BACKUP_TYPE,
  BACKUP_VERSION,
  START_MODULES,
  validateBackupPayload,
} from './settingsBackup.js'

const createValidBackup = (overrides = {}) => ({
  app: BACKUP_APP,
  type: BACKUP_TYPE,
  version: BACKUP_VERSION,
  createdAt: '2026-05-14T00:00:00.000Z',
  data: {
    tasks: [{ id: 1, title: 'Task', completed: false }],
    notes: [{ id: 1, title: 'Note', content: 'Memo' }],
    timerCompletedSessions: 3,
    language: 'ko',
    startModule: 'tasks',
    hudEffect: 'normal',
    theme: 'hud',
    ...overrides,
  },
})

describe('settingsBackup validateBackupPayload', () => {
  it('accepts a valid TENVI backup payload', () => {
    expect(validateBackupPayload(createValidBackup())).toEqual({
      tasks: [{ id: 1, title: 'Task', completed: false }],
      notes: [{ id: 1, title: 'Note', content: 'Memo' }],
      boardPosts: undefined,
      calendarEvents: undefined,
      hasBoardPosts: false,
      hasCalendarEvents: false,
      hasMapPhotoCollections: false,
      hasMapPhotoRecords: false,
      mapPhotoCollections: undefined,
      mapPhotoRecords: undefined,
      timerCompletedSessions: 3,
      language: 'ko',
      startModule: 'tasks',
      hudEffect: 'normal',
      theme: 'hud',
    })
  })

  it('normalizes numeric timer session strings from backup data', () => {
    expect(
      validateBackupPayload(
        createValidBackup({ timerCompletedSessions: '5' }),
      ).timerCompletedSessions,
    ).toBe(5)
  })

  it('accepts Board and Calendar backup data as optional v1 fields', () => {
    const restoredData = validateBackupPayload(
      createValidBackup({
        boardPosts: [
          {
            id: 'board-1',
            title: 'Board post',
            content: 'Memo',
            createdAt: '2026-05-14T00:00:00.000Z',
          },
        ],
        calendarEvents: [
          {
            id: 'calendar-1',
            date: '2026-05-14',
            title: 'Calendar event',
            memo: '',
            createdAt: '2026-05-14T00:00:00.000Z',
          },
        ],
      }),
    )

    expect(restoredData.hasBoardPosts).toBe(true)
    expect(restoredData.hasCalendarEvents).toBe(true)
    expect(restoredData.boardPosts).toHaveLength(1)
    expect(restoredData.calendarEvents).toHaveLength(1)
  })

  it('distinguishes missing Map backup data from an explicit empty Map backup', () => {
    const legacyBackup = validateBackupPayload(createValidBackup())
    const emptyMapBackup = validateBackupPayload(
      createValidBackup({ mapPhotoCollections: [], mapPhotoRecords: [] }),
    )

    expect(legacyBackup.hasMapPhotoCollections).toBe(false)
    expect(legacyBackup.hasMapPhotoRecords).toBe(false)
    expect(legacyBackup.mapPhotoCollections).toBeUndefined()
    expect(legacyBackup.mapPhotoRecords).toBeUndefined()
    expect(emptyMapBackup.hasMapPhotoCollections).toBe(true)
    expect(emptyMapBackup.hasMapPhotoRecords).toBe(true)
    expect(emptyMapBackup.mapPhotoCollections).toEqual([])
    expect(emptyMapBackup.mapPhotoRecords).toEqual([])
  })

  it('accepts Map backup records as an optional v1 backup field', () => {
    const restoredData = validateBackupPayload(
      createValidBackup({
        mapPhotoRecords: [
          {
            id: 'photo-1',
            previewImageDataUrl: 'data:image/jpeg;base64,cHJldmlldw==',
            latitude: 33.5903,
            longitude: 130.4208,
          },
        ],
        mapPhotoCollections: [{ id: 'trip-1', name: 'Fukuoka 2026' }],
      }),
    )

    expect(restoredData.hasMapPhotoCollections).toBe(true)
    expect(restoredData.hasMapPhotoRecords).toBe(true)
    expect(restoredData.mapPhotoCollections).toHaveLength(1)
    expect(restoredData.mapPhotoRecords).toHaveLength(1)
  })

  it('rejects payloads without TENVI backup metadata', () => {
    expect(validateBackupPayload(null)).toBe(null)
    expect(validateBackupPayload([])).toBe(null)
    expect(validateBackupPayload('not-json')).toBe(null)
    expect(validateBackupPayload({ ...createValidBackup(), data: null })).toBe(null)
    expect(validateBackupPayload({ ...createValidBackup(), app: 'OTHER' })).toBe(
      null,
    )
    expect(validateBackupPayload({ ...createValidBackup(), type: 'unknown' })).toBe(
      null,
    )
    expect(validateBackupPayload({ ...createValidBackup(), version: 999 })).toBe(
      null,
    )
  })

  it('rejects payloads with invalid data shapes', () => {
    expect(validateBackupPayload(createValidBackup({ tasks: {} }))).toBe(null)
    expect(validateBackupPayload(createValidBackup({ notes: {} }))).toBe(null)
    expect(validateBackupPayload(createValidBackup({ boardPosts: {} }))).toBe(null)
    expect(validateBackupPayload(createValidBackup({ calendarEvents: {} }))).toBe(
      null,
    )
    expect(validateBackupPayload(createValidBackup({ mapPhotoRecords: {} }))).toBe(
      null,
    )
    expect(
      validateBackupPayload(createValidBackup({ mapPhotoCollections: {} })),
    ).toBe(null)
    expect(
      validateBackupPayload(createValidBackup({ timerCompletedSessions: 'abc' })),
    ).toBe(null)
    expect(
      validateBackupPayload(createValidBackup({ timerCompletedSessions: -1 })),
    ).toBe(null)
  })

  it('rejects values outside supported app settings', () => {
    expect(validateBackupPayload(createValidBackup({ language: 'jp' }))).toBe(null)
    expect(validateBackupPayload(createValidBackup({ startModule: 'timer' }))).toBe(
      null,
    )
    expect(validateBackupPayload(createValidBackup({ hudEffect: 'max' }))).toBe(
      null,
    )
    expect(validateBackupPayload(createValidBackup({ theme: 'retro' }))).toBe(
      null,
    )
  })

  it('keeps the supported default start modules explicit', () => {
    expect(START_MODULES).toEqual(['dashboard', 'tasks', 'notes', 'board', 'command'])
    expect(START_MODULES).not.toContain('calendar')
  })
})
