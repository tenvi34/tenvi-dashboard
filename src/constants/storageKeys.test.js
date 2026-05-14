import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from './storageKeys.js'

describe('STORAGE_KEYS', () => {
  it('keeps existing localStorage key strings stable', () => {
    expect(STORAGE_KEYS).toEqual({
      calendarEvents: 'tenvi.calendar.events',
      hudEffect: 'tenvi.hudEffect',
      language: 'tenvi.language',
      notes: 'tenvi.notes',
      startModule: 'tenvi.startModule',
      tasks: 'todo-manager-lite.todos',
      timerCompletedSessions: 'tenvi.timer.completedSessions',
    })
  })
})
