import { describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from './storageKeys.js'

// 기존 localStorage key 회귀 방지
describe('STORAGE_KEYS', () => {
  it('keeps existing localStorage key strings stable', () => {
    expect(STORAGE_KEYS).toEqual({
      boardDraft: 'tenvi.board.draft',
      boardDrafts: 'tenvi.board.drafts',
      boardCategories: 'tenvi.board.categories',
      boardPosts: 'tenvi.board.posts',
      calendarEvents: 'tenvi.calendar.events',
      hudEffect: 'tenvi.hudEffect',
      language: 'tenvi.language',
      notes: 'tenvi.notes',
      startModule: 'tenvi.startModule',
      tasks: 'todo-manager-lite.todos',
      theme: 'tenvi.theme',
      timerCompletedSessions: 'tenvi.timer.completedSessions',
      userProfile: 'tenvi.user.profile',
    })
  })
})
