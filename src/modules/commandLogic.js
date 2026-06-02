import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  countEventsByDate,
  getCalendarEventDateLabel,
  getMonthEvents,
  getNextEvent,
  getTodayEvents,
} from './calendarLogic.js'
import { getTodayDueTasks } from './tasksLogic.js'

export const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
export const NOTES_STORAGE_KEY = STORAGE_KEYS.notes
export const CALENDAR_STORAGE_KEY = STORAGE_KEYS.calendarEvents
export const TIMER_SESSIONS_STORAGE_KEY = STORAGE_KEYS.timerCompletedSessions
export const START_MODULE_STORAGE_KEY = STORAGE_KEYS.startModule
export const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language

export const START_MODULES = ['dashboard', 'tasks', 'notes', 'command']
export const LANGUAGES = ['ko', 'en']

// Command 분석에 사용할 저장 목록을 localStorage에서 안전하게 읽습니다.
export const readStoredList = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    // 명령 콘솔은 분석 도구이므로 저장소가 손상되어도 빈 목록으로 안전하게 진행합니다.
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

// Command 분석에 사용할 저장 숫자 값을 안전하게 읽습니다.
export const readStoredNumber = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)
  const parsedValue = Number.parseInt(savedValue, 10)

  return Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue)
}

// 저장된 선택값이 허용 목록에 없으면 기본값으로 대체합니다.
export const readStoredChoice = (storageKey, allowedValues, fallback) => {
  const savedValue = localStorage.getItem(storageKey)

  return allowedValues.includes(savedValue) ? savedValue : fallback
}

// Command Console의 데이터 상태 명령에 필요한 설정 값을 모읍니다.
export const readCommandDataStatus = () => ({
  language: readStoredChoice(LANGUAGE_STORAGE_KEY, LANGUAGES, 'ko'),
  startModule: readStoredChoice(START_MODULE_STORAGE_KEY, START_MODULES, 'tasks'),
  timerSessions: readStoredNumber(TIMER_SESSIONS_STORAGE_KEY),
})

// 최근 Note 정렬에 사용할 작성 시각을 숫자로 변환합니다.
const getNoteTime = (note) => {
  const time = new Date(note.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

// 최신 작성 순서로 제한된 개수의 Note 목록을 반환합니다.
export const getRecentNotes = (notes, limit = 3) =>
  [...notes]
    .sort(
      (firstNote, secondNote) => getNoteTime(secondNote) - getNoteTime(firstNote),
    )
    .slice(0, limit)

// Task 전체/완료/미완료 수와 완료율을 계산합니다.
export const getTaskStats = (tasks) => {
  const completed = tasks.filter((task) => task.completed).length
  const active = tasks.length - completed
  const completionRate =
    tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100)

  return {
    active,
    completed,
    completionRate,
    total: tasks.length,
  }
}

// 명령 비교를 위해 앞뒤 공백과 대소문자를 정규화합니다.
export const normalizeCommand = (command) => command.trim().toLowerCase()

// 정규화된 명령이 alias 목록 중 하나와 정확히 일치하는지 확인합니다.
const matchesCommand = (normalizedCommand, aliases) =>
  aliases.some((alias) => normalizedCommand === alias)

// 검색형 명령에서 alias 뒤에 붙은 검색어를 추출합니다.
const parseKeywordCommand = (command, normalizedCommand, aliases) => {
  const matchedAlias = aliases.find((alias) => normalizedCommand.startsWith(alias))

  if (!matchedAlias) {
    return null
  }

  return command.slice(matchedAlias.length).trim()
}

// 사용자 입력 명령을 Command Console이 처리할 intent 객체로 변환합니다.
export const parseCommand = (command) => {
  const normalizedCommand = normalizeCommand(command)

  // 한글/영어 alias를 하나의 command type으로 정규화해 결과 생성 로직을 단순하게 유지합니다.
  if (matchesCommand(normalizedCommand, ['도움말', 'help'])) {
    return { type: 'help' }
  }

  if (matchesCommand(normalizedCommand, ['상태 분석', 'analyze status'])) {
    return { type: 'analyzeStatus' }
  }

  if (matchesCommand(normalizedCommand, ['미완료 작업', 'show active tasks'])) {
    return { type: 'showActiveTasks' }
  }

  if (matchesCommand(normalizedCommand, ['완료율', 'completion rate'])) {
    return { type: 'completionRate' }
  }

  if (matchesCommand(normalizedCommand, ['최근 노트', 'recent notes'])) {
    return { type: 'recentNotes' }
  }

  if (matchesCommand(normalizedCommand, ['오늘 추천', 'recommend task'])) {
    return { type: 'recommendTask' }
  }

  if (matchesCommand(normalizedCommand, ['데이터 상태', 'data status'])) {
    return { type: 'dataStatus' }
  }

  if (matchesCommand(normalizedCommand, ['타이머 열기', 'open timer'])) {
    return { targetModule: 'timer', type: 'openModule' }
  }

  if (matchesCommand(normalizedCommand, ['설정 열기', 'open settings'])) {
    return { targetModule: 'settings', type: 'openModule' }
  }

  if (matchesCommand(normalizedCommand, ['집중 모드', 'focus mode'])) {
    return { targetModule: 'timer', type: 'focusMode' }
  }

  if (matchesCommand(normalizedCommand, ['오늘 일정', 'today schedules'])) {
    return { type: 'todaySchedules' }
  }

  if (matchesCommand(normalizedCommand, ['이번 달 일정', 'this month schedules'])) {
    return { type: 'thisMonthSchedules' }
  }

  if (matchesCommand(normalizedCommand, ['다음 일정', 'next schedule'])) {
    return { type: 'nextSchedule' }
  }

  if (matchesCommand(normalizedCommand, ['일정 상태', 'schedule status'])) {
    return { type: 'scheduleStatus' }
  }

  if (matchesCommand(normalizedCommand, ['오늘 할 일', 'today tasks'])) {
    return { type: 'todayTasks' }
  }

  const noteKeyword = parseKeywordCommand(command, normalizedCommand, [
    '노트 검색',
    'search notes',
  ])

  if (noteKeyword !== null) {
    return {
      keyword: noteKeyword,
      type: 'searchNotes',
    }
  }

  const taskKeyword = parseKeywordCommand(command, normalizedCommand, [
    '태스크 검색',
    'search tasks',
  ])

  if (taskKeyword !== null) {
    return {
      keyword: taskKeyword,
      type: 'searchTasks',
    }
  }

  const scheduleKeyword = parseKeywordCommand(command, normalizedCommand, [
    '일정 검색',
    'search schedules',
  ])

  if (scheduleKeyword !== null) {
    return {
      keyword: scheduleKeyword,
      type: 'searchSchedules',
    }
  }

  return { type: 'unknown' }
}

// 현재 Task/Note 상태에 맞는 추천 행동 문구를 선택합니다.
const getRecommendation = (stats, noteCount, t) => {
  if (stats.active > 0) {
    return t.command.recommendations.reviewActive
  }

  if (noteCount === 0) {
    return t.command.recommendations.captureNote
  }

  return t.command.recommendations.allClear
}

// 아직 완료되지 않은 첫 번째 Task를 추천 대상으로 반환합니다.
export const getRecommendedTask = (tasks) =>
  tasks.find((task) => !task.completed)

// Command 결과 패널에 표시할 metric 객체를 생성합니다.
const createMetric = (label, value) => ({ label, value })

// Calendar 이벤트를 Command 결과 목록에 표시할 문자열로 변환합니다.
const formatScheduleItem = (event) =>
  event.memo
    ? `${getCalendarEventDateLabel(event)} - ${event.title}: ${event.memo}`
    : `${getCalendarEventDateLabel(event)} - ${event.title}`

// 도움말 결과에 표시할 사용 가능한 명령 목록 item을 생성합니다.
const createCommandListItem = (t) => ({
  isCommandList: true,
  label: t.command.availableCommands,
  values: t.command.examples,
})

// 파싱된 명령과 저장 데이터를 바탕으로 화면에 표시할 Command 결과를 생성합니다.
export const createResult = ({
  calendarEvents = [],
  command,
  currentDate = new Date(),
  dataStatus,
  notes,
  parsedCommand,
  tasks,
  t,
}) => {
  const stats = getTaskStats(tasks)
  const recentNotes = getRecentNotes(notes)
  const recommendation = getRecommendation(stats, notes.length, t)
  const todaySchedules = getTodayEvents(calendarEvents, currentDate)
  const todayDueTasks = getTodayDueTasks(tasks, currentDate)
  const thisMonthSchedules = getMonthEvents(calendarEvents, currentDate)

  // 각 명령은 UI가 공통으로 렌더링할 수 있는 metrics/items 구조를 반환합니다.
  if (parsedCommand.type === 'help') {
    return {
      items: [createCommandListItem(t)],
      metrics: [],
      title: t.command.helpTitle,
      type: 'help',
    }
  }

  if (parsedCommand.type === 'analyzeStatus') {
    return {
      items: [
        {
          label: t.command.activeTasks,
          values: tasks
            .filter((task) => !task.completed)
            .slice(0, 5)
            .map((task) => task.title),
        },
        {
          label: t.command.recentNotes,
          values: recentNotes.map((note) => note.title || t.notes.untitled),
        },
        {
          label: t.command.recommendedAction,
          values: [recommendation],
        },
      ],
      metrics: [
        createMetric(t.command.totalTasks, stats.total),
        createMetric(t.command.activeTasks, stats.active),
        createMetric(t.command.completedTasks, stats.completed),
        createMetric(t.command.completionRate, `${stats.completionRate}%`),
        createMetric(t.command.totalNotes, notes.length),
      ],
      title: t.command.analysisTitle,
      type: 'analysis',
    }
  }

  if (parsedCommand.type === 'showActiveTasks') {
    const activeTasks = tasks.filter((task) => !task.completed)

    return {
      items: [
        {
          label: t.command.activeTasks,
          values:
            activeTasks.length > 0
              ? activeTasks.map((task) => task.title)
              : [t.command.noActiveTasks],
        },
      ],
      metrics: [createMetric(t.command.activeTasks, activeTasks.length)],
      title: t.command.activeTaskResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'completionRate') {
    return {
      items: [
        {
          label: t.command.statusAssessment,
          values: [
            stats.completionRate >= 80
              ? t.command.assessments.high
              : t.command.assessments.normal,
          ],
        },
      ],
      metrics: [
        createMetric(t.command.completionRate, `${stats.completionRate}%`),
        createMetric(t.command.completedTasks, `${stats.completed}/${stats.total}`),
      ],
      title: t.command.completionRateResult,
      type: 'analysis',
    }
  }

  if (parsedCommand.type === 'recentNotes') {
    return {
      items: [
        {
          label: t.command.recentNotes,
          values:
            recentNotes.length > 0
              ? recentNotes.map((note) => note.title || t.notes.untitled)
              : [t.command.noRecentNotes],
        },
      ],
      metrics: [createMetric(t.command.totalNotes, notes.length)],
      title: t.command.recentNotesResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'recommendTask') {
    const recommendedTask = getRecommendedTask(tasks)

    return {
      items: [
        {
          label: t.command.recommendedTask,
          values: recommendedTask
            ? [recommendedTask.title]
            : [t.command.noTaskRecommendation],
        },
      ],
      metrics: [createMetric(t.command.activeTasks, stats.active)],
      title: t.command.recommendTaskResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'searchTasks') {
    if (!parsedCommand.keyword) {
      return {
        items: [createCommandListItem(t)],
        metrics: [],
        title: t.command.missingKeyword,
        type: 'help',
      }
    }

    const keyword = parsedCommand.keyword.toLowerCase()
    const matchingTasks = tasks.filter((task) => {
      const title = task.title?.toLowerCase() ?? ''
      return title.includes(keyword)
    })

    return {
      items: [
        {
          label: `${t.command.searchResults}: ${parsedCommand.keyword}`,
          values:
            matchingTasks.length > 0
              ? matchingTasks.map((task) => task.title)
              : [t.command.noMatchingTasks],
        },
      ],
      metrics: [createMetric(t.command.matches, matchingTasks.length)],
      title: t.command.searchTasksResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'todaySchedules') {
    return {
      items: [
        {
          label: t.command.todaySchedules,
          values:
            todaySchedules.length > 0
              ? todaySchedules.map(formatScheduleItem)
              : [t.command.noTodaySchedules],
        },
      ],
      metrics: [createMetric(t.command.todaySchedules, todaySchedules.length)],
      title: t.command.todaySchedulesResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'todayTasks') {
    return {
      items: [
        {
          label: t.command.todayDueTasks,
          values:
            todayDueTasks.length > 0
              ? todayDueTasks.map((task) => task.title)
              : [t.command.noTodayDueTasks],
        },
        {
          label: t.command.todaySchedules,
          values:
            todaySchedules.length > 0
              ? todaySchedules.map(formatScheduleItem)
              : [t.command.noTodaySchedules],
        },
      ],
      metrics: [
        createMetric(t.command.todayDueTasks, todayDueTasks.length),
        createMetric(t.command.todaySchedules, todaySchedules.length),
      ],
      title: t.command.todayTasksResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'thisMonthSchedules') {
    const eventCounts = countEventsByDate(thisMonthSchedules)
    const dateSummaries = Object.keys(eventCounts)
      .sort()
      .map((dateKey) => `${dateKey}: ${t.command.scheduleCount(eventCounts[dateKey])}`)

    return {
      items: [
        {
          label: t.command.scheduleDateSummary,
          values: dateSummaries.length > 0 ? dateSummaries : [t.command.noMonthSchedules],
        },
      ],
      metrics: [createMetric(t.command.thisMonthSchedules, thisMonthSchedules.length)],
      title: t.command.thisMonthSchedulesResult,
      type: 'analysis',
    }
  }

  if (parsedCommand.type === 'searchSchedules') {
    if (!parsedCommand.keyword) {
      return {
        items: [createCommandListItem(t)],
        metrics: [],
        title: t.command.missingKeyword,
        type: 'help',
      }
    }

    const keyword = parsedCommand.keyword.toLowerCase()
    const matchingSchedules = calendarEvents.filter((event) => {
      const title = event.title?.toLowerCase() ?? ''
      const memo = event.memo?.toLowerCase() ?? ''

      return title.includes(keyword) || memo.includes(keyword)
    })

    return {
      items: [
        {
          label: `${t.command.scheduleSearchResults}: ${parsedCommand.keyword}`,
          values:
            matchingSchedules.length > 0
              ? matchingSchedules.map(formatScheduleItem)
              : [t.command.noMatchingSchedules],
        },
      ],
      metrics: [createMetric(t.command.matches, matchingSchedules.length)],
      title: t.command.searchSchedulesResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'nextSchedule') {
    const nextSchedule = getNextEvent(calendarEvents, currentDate)

    return {
      items: [
        {
          label: t.command.nextSchedule,
          values: nextSchedule ? [formatScheduleItem(nextSchedule)] : [t.command.noNextSchedule],
        },
      ],
      metrics: [],
      title: t.command.nextScheduleResult,
      type: 'list',
    }
  }

  if (parsedCommand.type === 'scheduleStatus') {
    return {
      items: [
        {
          label: t.command.scheduleStatusSummary,
          values: [t.command.scheduleStatusMessage],
        },
      ],
      metrics: [
        createMetric(t.command.totalSchedules, calendarEvents.length),
        createMetric(t.command.todaySchedules, todaySchedules.length),
        createMetric(t.command.thisMonthSchedules, thisMonthSchedules.length),
      ],
      title: t.command.scheduleStatusResult,
      type: 'analysis',
    }
  }

  if (parsedCommand.type === 'dataStatus') {
    const {
      language = 'ko',
      startModule = 'tasks',
      timerSessions = 0,
    } = dataStatus ?? {}

    return {
      items: [
        {
          label: t.command.dataStatusSummary,
          values: [
            `${t.command.currentLanguage}: ${t.languages[language]}`,
            `${t.command.defaultStartModule}: ${t.modules[startModule]}`,
          ],
        },
      ],
      metrics: [
        createMetric(t.command.totalTasks, stats.total),
        createMetric(t.command.totalNotes, notes.length),
        createMetric(t.command.timerSessions, timerSessions),
      ],
      title: t.command.dataStatusResult,
      type: 'analysis',
    }
  }

  if (parsedCommand.type === 'openModule') {
    const moduleLabel = t.modules[parsedCommand.targetModule]

    return {
      navigateTo: parsedCommand.targetModule,
      items: [
        {
          label: t.command.navigation,
          values: [t.command.openModuleMessage(moduleLabel)],
        },
      ],
      metrics: [],
      title: t.command.openModuleResult,
      type: 'action',
    }
  }

  if (parsedCommand.type === 'focusMode') {
    const recommendedTask = getRecommendedTask(tasks)

    return {
      navigateTo: 'timer',
      items: [
        {
          label: t.command.recommendedTask,
          values: recommendedTask
            ? [recommendedTask.title]
            : [t.command.noTaskRecommendation],
        },
        {
          label: t.command.navigation,
          values: [t.command.focusModeMessage],
        },
      ],
      metrics: [createMetric(t.command.activeTasks, stats.active)],
      title: t.command.focusModeResult,
      type: 'action',
    }
  }

  if (parsedCommand.type === 'searchNotes') {
    if (!parsedCommand.keyword) {
      return {
        items: [createCommandListItem(t)],
        metrics: [],
        title: t.command.missingKeyword,
        type: 'help',
      }
    }

    const keyword = parsedCommand.keyword.toLowerCase()
    const matchingNotes = notes.filter((note) => {
      const title = note.title?.toLowerCase() ?? ''
      const content = note.content?.toLowerCase() ?? ''
      return title.includes(keyword) || content.includes(keyword)
    })

    return {
      items: [
        {
          label: `${t.command.searchResults}: ${parsedCommand.keyword}`,
          values:
            matchingNotes.length > 0
              ? matchingNotes.map((note) => note.title || t.notes.untitled)
              : [t.command.noMatchingNotes],
        },
      ],
      metrics: [createMetric(t.command.matches, matchingNotes.length)],
      title: t.command.searchNotesResult,
      type: 'list',
    }
  }

  return {
    items: [createCommandListItem(t)],
    metrics: [],
    title: `${t.command.unknownCommand}: ${command}`,
    type: 'help',
  }
}
