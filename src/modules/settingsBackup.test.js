import { describe, expect, it } from 'vitest'
import {
  BACKUP_APP,
  BACKUP_TYPE,
  BACKUP_VERSION,
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
    ...overrides,
  },
})

describe('settingsBackup validateBackupPayload', () => {
  it('accepts a valid TENVI backup payload', () => {
    expect(validateBackupPayload(createValidBackup())).toEqual({
      tasks: [{ id: 1, title: 'Task', completed: false }],
      notes: [{ id: 1, title: 'Note', content: 'Memo' }],
      timerCompletedSessions: 3,
      language: 'ko',
      startModule: 'tasks',
      hudEffect: 'normal',
    })
  })

  it('rejects payloads without TENVI backup metadata', () => {
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
  })
})
