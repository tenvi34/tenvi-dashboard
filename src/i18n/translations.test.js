import { describe, expect, it } from 'vitest'
import { translations } from './translations.js'

const requiredTopLevelKeys = [
  'app',
  'languages',
  'sidebar',
  'modules',
  'common',
  'command',
  'dashboard',
  'tasks',
  'notes',
  'calendar',
  'timer',
  'settings',
]

const requiredCommandKeys = [
  'helpTitle',
  'recommendTaskResult',
  'searchTasksResult',
  'dataStatusResult',
  'openModuleResult',
  'focusModeResult',
  'examples',
]

const requiredCalendarKeys = [
  'label',
  'title',
  'selectedDate',
  'titleLabel',
  'memoLabel',
  'addEvent',
  'eventsForDate',
  'monthlyCalendar',
  'previousMonth',
  'nextMonth',
  'year',
  'month',
  'monthValue',
  'weekdays',
  'eventCount',
  'noEvents',
  'deleteEvent',
]

describe('translations', () => {
  it('keeps ko and en language entries available', () => {
    expect(Object.keys(translations).sort()).toEqual(['en', 'ko'])
  })

  it.each(['ko', 'en'])('has required top-level keys for %s', (language) => {
    requiredTopLevelKeys.forEach((key) => {
      expect(translations[language]).toHaveProperty(key)
    })
  })

  it.each(['ko', 'en'])('has required command keys for %s', (language) => {
    requiredCommandKeys.forEach((key) => {
      expect(translations[language].command).toHaveProperty(key)
    })
  })

  it.each(['ko', 'en'])('has required calendar keys for %s', (language) => {
    requiredCalendarKeys.forEach((key) => {
      expect(translations[language].calendar).toHaveProperty(key)
    })
  })
})
