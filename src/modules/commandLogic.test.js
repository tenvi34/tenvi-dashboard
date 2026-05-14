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
})
