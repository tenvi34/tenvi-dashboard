import { useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

// Command는 다른 모듈의 저장 데이터를 읽기만 하므로 기존 localStorage key와 구조를 그대로 따라야 합니다.
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
const NOTES_STORAGE_KEY = STORAGE_KEYS.notes
const TIMER_SESSIONS_STORAGE_KEY = STORAGE_KEYS.timerCompletedSessions
const START_MODULE_STORAGE_KEY = STORAGE_KEYS.startModule
const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.language
const HISTORY_LIMIT = 5
const START_MODULES = ['dashboard', 'tasks', 'notes', 'command']
const LANGUAGES = ['ko', 'en']

const readStoredList = (storageKey) => {
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

const readStoredNumber = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)
  const parsedValue = Number.parseInt(savedValue, 10)

  return Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue)
}

const readStoredChoice = (storageKey, allowedValues, fallback) => {
  const savedValue = localStorage.getItem(storageKey)

  return allowedValues.includes(savedValue) ? savedValue : fallback
}

const getNoteTime = (note) => {
  const time = new Date(note.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

const getRecentNotes = (notes, limit = 3) =>
  [...notes]
    .sort(
      (firstNote, secondNote) => getNoteTime(secondNote) - getNoteTime(firstNote),
    )
    .slice(0, limit)

const getTaskStats = (tasks) => {
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

const normalizeCommand = (command) => command.trim().toLowerCase()

const matchesCommand = (normalizedCommand, aliases) =>
  aliases.some((alias) => normalizedCommand === alias)

const parseKeywordCommand = (command, normalizedCommand, aliases) => {
  const matchedAlias = aliases.find((alias) => normalizedCommand.startsWith(alias))

  if (!matchedAlias) {
    return null
  }

  return command.slice(matchedAlias.length).trim()
}

const parseCommand = (command) => {
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

  return { type: 'unknown' }
}

const getRecommendation = (stats, noteCount, t) => {
  if (stats.active > 0) {
    return t.command.recommendations.reviewActive
  }

  if (noteCount === 0) {
    return t.command.recommendations.captureNote
  }

  return t.command.recommendations.allClear
}

const getRecommendedTask = (tasks) => tasks.find((task) => !task.completed)

const createMetric = (label, value) => ({ label, value })

const createCommandListItem = (t) => ({
  isCommandList: true,
  label: t.command.availableCommands,
  values: t.command.examples,
})

const createResult = ({ command, notes, parsedCommand, tasks, t }) => {
  const stats = getTaskStats(tasks)
  const recentNotes = getRecentNotes(notes)
  const recommendation = getRecommendation(stats, notes.length, t)

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

  if (parsedCommand.type === 'dataStatus') {
    const timerSessions = readStoredNumber(TIMER_SESSIONS_STORAGE_KEY)
    const savedLanguage = readStoredChoice(LANGUAGE_STORAGE_KEY, LANGUAGES, 'ko')
    const savedStartModule = readStoredChoice(
      START_MODULE_STORAGE_KEY,
      START_MODULES,
      'tasks',
    )

    return {
      items: [
        {
          label: t.command.dataStatusSummary,
          values: [
            `${t.command.currentLanguage}: ${t.languages[savedLanguage]}`,
            `${t.command.defaultStartModule}: ${t.modules[savedStartModule]}`,
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

function Command({ onModuleChange, t }) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState([])
  const [result, setResult] = useState(null)

  const executeCommand = (commandText) => {
    const trimmedCommand = commandText.trim()

    if (!trimmedCommand) {
      return
    }

    // 실행 순간의 localStorage를 읽어 다른 모듈에서 방금 바뀐 데이터까지 반영합니다.
    const tasks = readStoredList(TASKS_STORAGE_KEY)
    const notes = readStoredList(NOTES_STORAGE_KEY)
    const parsedCommand = parseCommand(trimmedCommand)
    const nextResult = createResult({
      command: trimmedCommand,
      notes,
      parsedCommand,
      tasks,
      t,
    })

    setResult(nextResult)

    if (nextResult.navigateTo) {
      // Command는 라우터를 쓰지 않고 App의 activeModule 상태 변경만 요청합니다.
      onModuleChange(nextResult.navigateTo)
    }

    setHistory((currentHistory) => {
      const normalizedCommand = normalizeCommand(trimmedCommand)
      // 최근 명령은 현재 세션용이며, 같은 명령은 최신 위치로만 유지합니다.
      const uniqueHistory = currentHistory.filter(
        (historyItem) => normalizeCommand(historyItem) !== normalizedCommand,
      )

      return [trimmedCommand, ...uniqueHistory].slice(0, HISTORY_LIMIT)
    })
    setCommand('')
  }

  const handleExecute = (event) => {
    event.preventDefault()
    executeCommand(command)
  }

  return (
    <section
      className="module-panel command-module"
      aria-labelledby="command-title"
    >
      <div className="module-header">
        <div>
          <p className="module-label">{t.command.label}</p>
          <h2 id="command-title">{t.command.title}</h2>
        </div>
        <p className="module-meta">{t.command.mode}</p>
      </div>

      <form className="command-form" onSubmit={handleExecute}>
        <label className="sr-only" htmlFor="command-input">
          {t.command.inputLabel}
        </label>
        <input
          id="command-input"
          type="text"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          placeholder={t.command.inputPlaceholder}
        />
        <button type="submit">{t.command.execute}</button>
      </form>

      <section className="analysis-panel" aria-live="polite">
        <div className="analysis-header">
          <p className="module-label">{t.command.systemAnalysis}</p>
          <h3>{result?.title ?? t.command.awaitingCommand}</h3>
        </div>

        {result ? (
          <>
            {result.metrics.length > 0 ? (
              <div className="analysis-grid">
                {result.metrics.map((metric) => (
                  <div className="analysis-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="analysis-sections">
              {result.items.map((item) => (
                <section className="analysis-section" key={item.label}>
                  <h4>{item.label}</h4>
                  <ul className={item.isCommandList ? 'command-list' : ''}>
                    {item.values.map((value) => (
                      <li key={value}>
                        {item.isCommandList ? (
                          <button
                            type="button"
                            className="command-link-button"
                            onClick={() => executeCommand(value)}
                          >
                            {value}
                          </button>
                        ) : (
                          value
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state compact-empty" role="status">
            <span>{t.common.systemMessage}</span>
            <p>{t.command.initialMessage}</p>
          </div>
        )}
      </section>

      <section className="command-history" aria-label={t.command.history}>
        <p className="recent-notes-title">{t.command.history}</p>
        {history.length > 0 ? (
          <ol>
            {history.map((historyItem, index) => (
              <li key={`${historyItem}-${index}`}>
                <button
                  type="button"
                  className="command-link-button"
                  onClick={() => executeCommand(historyItem)}
                >
                  {historyItem}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="command-history-empty">{t.command.noHistory}</p>
        )}
      </section>
    </section>
  )
}

export default Command
