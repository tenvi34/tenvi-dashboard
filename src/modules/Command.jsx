import { useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

// Command는 Tasks/Notes 모듈이 저장한 데이터를 직접 읽으므로 키가 반드시 일치해야 합니다.
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
const NOTES_STORAGE_KEY = STORAGE_KEYS.notes
const HISTORY_LIMIT = 5

const readStoredList = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    // 명령 콘솔은 분석 도구이므로 저장소가 예상과 달라도 빈 목록으로 안전하게 진행합니다.
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
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

const parseCommand = (command) => {
  const normalizedCommand = normalizeCommand(command)

  // 한글/영어 입력을 같은 내부 타입으로 정규화해 결과 생성 로직을 단순하게 유지합니다.
  if (normalizedCommand === '상태 분석' || normalizedCommand === 'analyze status') {
    return { type: 'analyzeStatus' }
  }

  if (
    normalizedCommand === '미완료 작업' ||
    normalizedCommand === 'show active tasks'
  ) {
    return { type: 'showActiveTasks' }
  }

  if (normalizedCommand === '완료율' || normalizedCommand === 'completion rate') {
    return { type: 'completionRate' }
  }

  if (normalizedCommand === '최근 노트' || normalizedCommand === 'recent notes') {
    return { type: 'recentNotes' }
  }

  if (normalizedCommand.startsWith('노트 검색')) {
    return {
      keyword: command.replace(/^노트 검색/i, '').trim(),
      type: 'searchNotes',
    }
  }

  if (normalizedCommand.startsWith('search notes')) {
    return {
      keyword: command.replace(/^search notes/i, '').trim(),
      type: 'searchNotes',
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

function Command({ t }) {
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
    setHistory((currentHistory) => {
      const normalizedCommand = normalizeCommand(trimmedCommand)
      // 최근 명령은 현재 세션용이며, 같은 명령은 최신 위치로만 남깁니다.
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
