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
  'todaySchedulesResult',
  'thisMonthSchedulesResult',
  'searchSchedulesResult',
  'nextScheduleResult',
  'scheduleStatusResult',
  'todayTasksResult',
  'todayDueTasks',
  'noTodayDueTasks',
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
  'dueTasksForDate',
  'monthlyCalendar',
  'previousMonth',
  'nextMonth',
  'year',
  'month',
  'monthValue',
  'weekdays',
  'eventCount',
  'fullMoon',
  'noEvents',
  'noDueTasks',
  'deleteEvent',
]

const requiredDashboardKeys = [
  'todayEvents',
  'nextEvent',
  'monthEvents',
  'scheduledDays',
  'todayDueTasks',
  'noTodayEvents',
  'noTodayDueTasks',
  'noNextEvent',
]

const requiredTasksKeys = [
  'dueDateLabel',
  'dueDateValue',
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

  it.each(['ko', 'en'])('has required dashboard calendar keys for %s', (language) => {
    requiredDashboardKeys.forEach((key) => {
      expect(translations[language].dashboard).toHaveProperty(key)
    })
  })

  it.each(['ko', 'en'])('has required task due date keys for %s', (language) => {
    requiredTasksKeys.forEach((key) => {
      expect(translations[language].tasks).toHaveProperty(key)
    })
  })
})
