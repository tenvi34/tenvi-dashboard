import { useState } from 'react'
import {
  createResult,
  normalizeCommand,
  parseCommand,
  readCommandDataStatus,
  readStoredList,
  CALENDAR_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  NOTES_STORAGE_KEY,
} from './commandLogic.js'

const HISTORY_LIMIT = 5

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
    const calendarEvents = readStoredList(CALENDAR_STORAGE_KEY)
    const parsedCommand = parseCommand(trimmedCommand)
    const nextResult = createResult({
      calendarEvents,
      command: trimmedCommand,
      dataStatus: readCommandDataStatus(),
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
      {/* Command Console 상단 제목 영역 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.command.label}</p>
          <h2 id="command-title">{t.command.title}</h2>
        </div>
        <p className="module-meta">{t.command.mode}</p>
      </div>

      {/* 명령어 입력 영역 */}
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

      {/* 명령 실행 결과 패널: metrics와 목록형 결과가 함께 표시됩니다. */}
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
                /* 결과 세부 섹션 또는 도움말 명령 목록 */
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

      {/* 현재 브라우저 세션에서만 유지되는 최근 명령 목록 */}
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
