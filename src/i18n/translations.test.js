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
  'startDateLabel',
  'endDateLabel',
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
  'dateRangeError',
  'dateRangeHint',
  'rangeBadge',
  'legendLabel',
  'singleEventLegend',
  'rangeEventLegend',
  'eventCountLegend',
  'deleteEvent',
]

const requiredDashboardKeys = [
  'todayBriefing',
  'mapSummary',
  'totalMapRecords',
  'totalMapCollections',
  'recentMapRecords',
  'representativeCollection',
  'mapLocationSources',
  'mapSourceExif',
  'mapSourceManual',
  'mapSourceSearch',
  'mapSourceUnknown',
  'mapSummaryLoading',
  'mapSummaryLoadError',
  'noMapRecords',
  'noRepresentativeCollection',
  'untitledMapRecord',
  'mapBriefing',
  'mapBriefingEmpty',
  'mapLocationSourceValue',
  'collectionPhotoCount',
  'todayEvents',
  'nextEvent',
  'monthEvents',
  'scheduledDays',
  'todayDueTasks',
  'noTodayEvents',
  'noTodayDueTasks',
  'noNextEvent',
  'tabsLabel',
  'tabs',
  'overviewMetrics',
  'quickStatus',
  'priorityItems',
  'recentHighlights',
  'activeTaskList',
  'systemSummary',
  'currentSettings',
  'timerSessions',
  'currentLanguage',
  'defaultStartModule',
  'hudEffect',
  'theme',
  'storedData',
  'storageOverview',
  'totalSchedules',
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
  'mobileMapViewsLabel',
  'mobileMapViewMap',
  'mobileMapViewList',
  'mobileMapViewDetail',
  'openMapDetail',
  'backToMap',
  'backToList',
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
  'collectionsLabel',
  'collectionFilter',
  'recordSearchLabel',
  'recordSearchPlaceholder',
  'clearSearch',
  'locationSourceFilter',
  'locationSourceFilterOptions',
  'filteredRecordCount',
  'noMatchingRecords',
  'allCollections',
  'unassignedCollection',
  'collectionField',
  'collectionName',
  'collectionNamePlaceholder',
  'collectionDescription',
  'collectionDescriptionPlaceholder',
  'collectionStartDate',
  'collectionEndDate',
  'createCollection',
  'saveCollection',
  'editCollection',
  'deleteCollection',
  'collectionRecordCount',
  'collectionNameRequired',
  'collectionCreated',
  'collectionUpdated',
  'collectionDeleted',
  'collectionSaveError',
  'collectionDeleteError',
  'deleteCollectionConfirm',
  'noFilteredRecords',
  'locationSource',
  'sourceExif',
  'sourceManual',
  'sourceSearch',
  'sourceUnknown',
  'filterSummaryLabel',
  'visiblePhotoCount',
  'selectRecordHint',
  'addPhotoRecord',
  'cancelAddPhoto',
  'newCollection',
  'closeCollectionForm',
  'fitAllMarkers',
  'bulkUploadLabel',
  'bulkUploadTitle',
  'bulkAnalyzingProgress',
  'bulkCancelAnalysis',
  'bulkAnalysisCancelled',
  'bulkTotalFiles',
  'bulkLocated',
  'bulkMissingLocation',
  'bulkFailed',
  'bulkMissingLocationPolicy',
  'bulkSaveLocated',
  'bulkSaving',
  'bulkClearResults',
  'bulkSaveComplete',
  'bulkSaveError',
  'bulkNoSaveCandidates',
  'bulkSaveCandidates',
  'bulkMissingLocationList',
  'bulkFailedList',
  'bulkNoLocatedItems',
  'bulkNoMissingItems',
  'bulkNoFailedItems',
  'bulkMoreItems',
  'bulkLocationAssignment',
  'bulkSelectedCount',
  'bulkSelectAllMissing',
  'bulkClearSelection',
  'bulkMapClickReady',
  'bulkSelectMissingFirst',
  'bulkLastAssignedLocation',
  'bulkPreviewCreateError',
  'bulkPendingLocation',
  'bulkAssignedPhotoCount',
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
