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
  'map',
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

const requiredMapKeys = [
  'label',
  'title',
  'pocBadge',
  'archiveBadge',
  'uploadLabel',
  'uploadTitle',
  'uploadAction',
  'loadingRecords',
  'reading',
  'readError',
  'loadError',
  'saveError',
  'updateError',
  'deleteError',
  'noLocation',
  'manualPrompt',
  'clickToSetLocation',
  'selectPhotoPrompt',
  'draftLabel',
  'titleField',
  'titlePlaceholder',
  'memoField',
  'memoPlaceholder',
  'saveRecord',
  'saving',
  'saveNeedsLocation',
  'saveComplete',
  'updateComplete',
  'recordListLabel',
  'noRecords',
  'detailLabel',
  'editLabel',
  'noSelectedRecord',
  'editRecord',
  'saveChanges',
  'cancelEdit',
  'editCancelled',
  'deleteRecord',
  'deleteConfirm',
  'deleteComplete',
  'mapLabel',
  'fileName',
  'latitude',
  'longitude',
  'takenAt',
  'createdAt',
  'placeSearchLabel',
  'placeSearchPlaceholder',
  'searchPlace',
  'searching',
  'searchError',
  'searchNoResults',
  'searchRetryHint',
  'searchAttribution',
  'searchLanguage',
  'searchScopeLabel',
  'searchScopeAll',
  'searchScopeJapan',
  'searchScopeKorea',
  'locationSource',
  'sourceExif',
  'sourceManual',
  'sourceSearch',
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

  it.each(['ko', 'en'])('has required map keys for %s', (language) => {
    requiredMapKeys.forEach((key) => {
      expect(translations[language].map).toHaveProperty(key)
    })
  })
})
