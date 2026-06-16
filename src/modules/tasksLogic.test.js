import { describe, expect, it, vi } from 'vitest'
import {
  countDueTasksByDate,
  createTask,
  getActiveTasksDueOnDate,
  getTasksDueOnDate,
  getTodayDueTasks,
  normalizeDueDate,
} from './tasksLogic.js'

// dueDate 호환성 검증 fixture
const tasks = [
  { id: 'a', title: 'Plan release', completed: false, dueDate: '2026-05-14' },
  { id: 'b', title: 'Done task', completed: true, dueDate: '2026-05-14' },
  { id: 'c', title: 'No due date', completed: false },
  { id: 'd', title: 'Review', completed: false, dueDate: '2026-05-15' },
]

describe('tasksLogic dueDate helpers', () => {
  it('normalizes optional dueDate values without breaking old tasks', () => {
    expect(normalizeDueDate('2026-05-14')).toBe('2026-05-14')
    expect(normalizeDueDate(undefined)).toBe('')
    expect(normalizeDueDate('not-a-date')).toBe('')
  })

  it('creates tasks with an optional dueDate only when provided', () => {
    expect(createTask({ id: 'new-1', title: '  Write notes  ', dueDate: '2026-05-14' })).toEqual({
      id: 'new-1',
      title: 'Write notes',
      completed: false,
      dueDate: '2026-05-14',
    })
    expect(createTask({ id: 'new-2', title: 'Inbox', dueDate: '' })).toEqual({
      id: 'new-2',
      title: 'Inbox',
      completed: false,
    })
    expect(createTask({ id: 'new-3', title: '   ', dueDate: '2026-05-14' })).toBeNull()
  })

  it('filters due tasks by date while tolerating tasks without dueDate', () => {
    expect(getTasksDueOnDate(tasks, '2026-05-14')).toEqual([tasks[0], tasks[1]])
    expect(getActiveTasksDueOnDate(tasks, '2026-05-14')).toEqual([tasks[0]])
  })

  it('uses the provided date when finding today due tasks', () => {
    expect(getTodayDueTasks(tasks, new Date(2026, 4, 15))).toEqual([tasks[3]])
  })

  it('counts due tasks by date for calendar badges', () => {
    expect(countDueTasksByDate(tasks)).toEqual({
      '2026-05-14': 2,
      '2026-05-15': 1,
    })
  })

  it('uses crypto ids when no id is provided', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' })

    expect(createTask({ title: 'Generated id' })).toMatchObject({
      id: 'generated-id',
      title: 'Generated id',
    })

    vi.unstubAllGlobals()
  })
})
