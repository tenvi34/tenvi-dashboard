import { describe, expect, it } from 'vitest'
import { translations } from '../i18n/translations.js'
import { createResult, parseCommand } from './commandLogic.js'

const t = translations.en
const tasks = [
  { id: 1, title: 'Write project plan', completed: false },
  { id: 2, title: 'Review backup flow', completed: true },
  { id: 3, title: 'Prepare focus session', completed: false },
]
const notes = [
  { id: 1, title: 'Project note', content: 'TENVI command ideas' },
]
const calendarEvents = [
  {
    id: 'schedule-1',
    date: '2026-05-14',
    title: 'Planning sync',
    memo: 'Review roadmap',
    createdAt: '2026-05-13T09:00:00.000Z',
  },
  {
    id: 'schedule-2',
    date: '2026-05-20',
    title: 'Launch check',
    memo: 'TENVI calendar',
    createdAt: '2026-05-13T10:00:00.000Z',
  },
  {
    id: 'schedule-3',
    date: '2026-06-01',
    title: 'June planning',
    memo: '',
    createdAt: '2026-05-13T11:00:00.000Z',
  },
]

describe('commandLogic parseCommand', () => {
  it('supports existing English and Korean commands', () => {
    expect(parseCommand('analyze status')).toEqual({ type: 'analyzeStatus' })
    expect(parseCommand('상태 분석')).toEqual({ type: 'analyzeStatus' })
    expect(parseCommand('search notes TENVI')).toEqual({
      keyword: 'TENVI',
      type: 'searchNotes',
    })
    expect(parseCommand('노트 검색 프로젝트')).toEqual({
      keyword: '프로젝트',
      type: 'searchNotes',
    })
  })

  it('supports expanded command aliases', () => {
    expect(parseCommand('help')).toEqual({ type: 'help' })
    expect(parseCommand('도움말')).toEqual({ type: 'help' })
    expect(parseCommand('recommend task')).toEqual({ type: 'recommendTask' })
    expect(parseCommand('오늘 추천')).toEqual({ type: 'recommendTask' })
    expect(parseCommand('search tasks focus')).toEqual({
      keyword: 'focus',
      type: 'searchTasks',
    })
    expect(parseCommand('태스크 검색 집중')).toEqual({
      keyword: '집중',
      type: 'searchTasks',
    })
  })

  it('returns navigation intents for module commands', () => {
    expect(parseCommand('open timer')).toEqual({
      targetModule: 'timer',
      type: 'openModule',
    })
    expect(parseCommand('설정 열기')).toEqual({
      targetModule: 'settings',
      type: 'openModule',
    })
    expect(parseCommand('focus mode')).toEqual({
      targetModule: 'timer',
      type: 'focusMode',
    })
  })

  it('supports calendar command aliases', () => {
    expect(parseCommand('today schedules')).toEqual({ type: 'todaySchedules' })
    expect(parseCommand('오늘 일정')).toEqual({ type: 'todaySchedules' })
    expect(parseCommand('this month schedules')).toEqual({
      type: 'thisMonthSchedules',
    })
    expect(parseCommand('이번 달 일정')).toEqual({ type: 'thisMonthSchedules' })
    expect(parseCommand('search schedules roadmap')).toEqual({
      keyword: 'roadmap',
      type: 'searchSchedules',
    })
    expect(parseCommand('일정 검색 회의')).toEqual({
      keyword: '회의',
      type: 'searchSchedules',
    })
    expect(parseCommand('next schedule')).toEqual({ type: 'nextSchedule' })
    expect(parseCommand('다음 일정')).toEqual({ type: 'nextSchedule' })
    expect(parseCommand('schedule status')).toEqual({ type: 'scheduleStatus' })
    expect(parseCommand('일정 상태')).toEqual({ type: 'scheduleStatus' })
  })
})

describe('commandLogic createResult', () => {
  it('recommends the first active task without mutating task data', () => {
    const result = createResult({
      command: 'recommend task',
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 2 },
      notes,
      parsedCommand: parseCommand('recommend task'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.recommendTaskResult)
    expect(result.items[0].values).toEqual(['Write project plan'])
    expect(tasks[0].completed).toBe(false)
  })

  it('searches task titles by keyword', () => {
    const result = createResult({
      command: 'search tasks focus',
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 2 },
      notes,
      parsedCommand: parseCommand('search tasks focus'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.searchTasksResult)
    expect(result.items[0].values).toEqual(['Prepare focus session'])
    expect(result.metrics[0].value).toBe(1)
  })

  it('reports data status from injected state', () => {
    const result = createResult({
      command: 'data status',
      dataStatus: { language: 'en', startModule: 'command', timerSessions: 7 },
      notes,
      parsedCommand: parseCommand('data status'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.dataStatusResult)
    expect(result.metrics.map((metric) => metric.value)).toEqual([3, 1, 7])
  })

  it('returns navigation target for open timer', () => {
    const result = createResult({
      command: 'open timer',
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 0 },
      notes,
      parsedCommand: parseCommand('open timer'),
      tasks,
      t,
    })

    expect(result.navigateTo).toBe('timer')
    expect(result.type).toBe('action')
  })

  it('lists today schedules', () => {
    const result = createResult({
      calendarEvents,
      command: 'today schedules',
      currentDate: new Date(2026, 4, 14),
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 0 },
      notes,
      parsedCommand: parseCommand('today schedules'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.todaySchedulesResult)
    expect(result.items[0].values).toEqual([
      '2026-05-14 - Planning sync: Review roadmap',
    ])
    expect(result.metrics[0].value).toBe(1)
  })

  it('summarizes this month schedules by date', () => {
    const result = createResult({
      calendarEvents,
      command: 'this month schedules',
      currentDate: new Date(2026, 4, 14),
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 0 },
      notes,
      parsedCommand: parseCommand('this month schedules'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.thisMonthSchedulesResult)
    expect(result.metrics[0].value).toBe(2)
    expect(result.items[0].values).toEqual([
      '2026-05-14: 1 schedule',
      '2026-05-20: 1 schedule',
    ])
  })

  it('searches schedules by title and memo', () => {
    const result = createResult({
      calendarEvents,
      command: 'search schedules roadmap',
      currentDate: new Date(2026, 4, 14),
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 0 },
      notes,
      parsedCommand: parseCommand('search schedules roadmap'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.searchSchedulesResult)
    expect(result.items[0].values).toEqual([
      '2026-05-14 - Planning sync: Review roadmap',
    ])
  })

  it('finds the nearest schedule after today', () => {
    const result = createResult({
      calendarEvents,
      command: 'next schedule',
      currentDate: new Date(2026, 4, 14),
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 0 },
      notes,
      parsedCommand: parseCommand('next schedule'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.nextScheduleResult)
    expect(result.items[0].values).toEqual([
      '2026-05-20 - Launch check: TENVI calendar',
    ])
  })

  it('reports schedule status metrics', () => {
    const result = createResult({
      calendarEvents,
      command: 'schedule status',
      currentDate: new Date(2026, 4, 14),
      dataStatus: { language: 'en', startModule: 'tasks', timerSessions: 0 },
      notes,
      parsedCommand: parseCommand('schedule status'),
      tasks,
      t,
    })

    expect(result.title).toBe(t.command.scheduleStatusResult)
    expect(result.metrics.map((metric) => metric.value)).toEqual([3, 1, 2])
  })
})
