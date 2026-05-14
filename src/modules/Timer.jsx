import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  formatStopwatchTime,
  formatTime,
  minutesToSeconds,
  normalizeMinutes,
} from './timerLogic.js'

const DEFAULT_FOCUS_MINUTES = 25
const DEFAULT_BREAK_MINUTES = 5
// 현재 진행 중인 시간은 저장하지 않고 완료 세션 수만 영속화합니다.
const TIMER_SESSIONS_STORAGE_KEY = STORAGE_KEYS.timerCompletedSessions

const readCompletedSessions = () => {
  const savedValue = localStorage.getItem(TIMER_SESSIONS_STORAGE_KEY)
  const parsedValue = Number.parseInt(savedValue, 10)

  // 저장값이 비어 있거나 숫자가 아니면 세션 통계를 0부터 다시 시작합니다.
  return Number.isNaN(parsedValue) ? 0 : parsedValue
}

function Timer({ t }) {
  const [activeTab, setActiveTab] = useState('timer')
  const [mode, setMode] = useState('focus')
  const [focusMinutes, setFocusMinutes] = useState(DEFAULT_FOCUS_MINUTES)
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES)
  const [secondsLeft, setSecondsLeft] = useState(
    minutesToSeconds(DEFAULT_FOCUS_MINUTES),
  )
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState(
    readCompletedSessions,
  )
  const [stopwatchMilliseconds, setStopwatchMilliseconds] = useState(0)
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false)
  const [laps, setLaps] = useState([])

  const getModeSeconds = useCallback(
    (timerMode) =>
      timerMode === 'focus'
        ? minutesToSeconds(focusMinutes)
        : minutesToSeconds(breakMinutes),
    [breakMinutes, focusMinutes],
  )

  useEffect(() => {
    localStorage.setItem(
      TIMER_SESSIONS_STORAGE_KEY,
      String(completedSessions),
    )
  }, [completedSessions])

  useEffect(() => {
    if (!isRunning) {
      return undefined
    }

    // 실행 중일 때만 interval을 만들고 cleanup으로 중복 타이머를 방지합니다.
    const timerId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds > 1) {
          return currentSeconds - 1
        }

        const nextMode = mode === 'focus' ? 'break' : 'focus'

        // 완료 세션은 Focus가 끝나는 순간만 증가시키고 Break 종료는 카운트하지 않습니다.
        if (mode === 'focus') {
          setCompletedSessions((currentCount) => currentCount + 1)
        }

        setMode(nextMode)
        return getModeSeconds(nextMode)
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [getModeSeconds, isRunning, mode])

  useEffect(() => {
    if (!isStopwatchRunning) {
      return undefined
    }

    // 스톱워치는 화면 표시 정확도를 위해 10ms 단위로 갱신하되 정지는 cleanup에 맡깁니다.
    const stopwatchId = window.setInterval(() => {
      setStopwatchMilliseconds((currentMilliseconds) => currentMilliseconds + 10)
    }, 10)

    return () => window.clearInterval(stopwatchId)
  }, [isStopwatchRunning])

  const handleFocusMinutesChange = (event) => {
    const nextFocusMinutes = normalizeMinutes(
      event.target.value,
      DEFAULT_FOCUS_MINUTES,
    )

    setFocusMinutes(nextFocusMinutes)

    // 실행 중에는 현재 카운트다운 흐름을 유지하고, 멈춘 상태에서만 설정값을 즉시 반영합니다.
    if (mode === 'focus' && !isRunning) {
      setSecondsLeft(minutesToSeconds(nextFocusMinutes))
    }
  }

  const handleBreakMinutesChange = (event) => {
    const nextBreakMinutes = normalizeMinutes(
      event.target.value,
      DEFAULT_BREAK_MINUTES,
    )

    setBreakMinutes(nextBreakMinutes)

    // Break 모드의 실행 중 설정 변경이 남은 시간을 갑자기 흔들지 않게 합니다.
    if (mode === 'break' && !isRunning) {
      setSecondsLeft(minutesToSeconds(nextBreakMinutes))
    }
  }

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSecondsLeft(getModeSeconds(mode))
  }

  const handleStopwatchReset = () => {
    setIsStopwatchRunning(false)
    setStopwatchMilliseconds(0)
    setLaps([])
  }

  const handleAddLap = () => {
    if (stopwatchMilliseconds === 0) {
      return
    }

    setLaps((currentLaps) => [stopwatchMilliseconds, ...currentLaps])
  }

  const currentModeLabel =
    mode === 'focus' ? t.timer.modes.focus : t.timer.modes.break

  return (
    <section className="module-panel timer-module" aria-labelledby="timer-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.timer.label}</p>
          <h2 id="timer-title" className="sr-only">
            {t.timer.label}
          </h2>
        </div>
        <p className="module-meta">
          {activeTab === 'timer' ? t.timer.currentMode : t.timer.stopwatch}
          {activeTab === 'timer' ? ': ' : ''}
          {activeTab === 'timer' ? <span>{currentModeLabel}</span> : null}
        </p>
      </div>

      <div className="timer-tabs" role="tablist" aria-label={t.timer.tabsLabel}>
        <button
          className={`timer-tab ${activeTab === 'timer' ? 'is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'timer'}
          onClick={() => setActiveTab('timer')}
        >
          {t.timer.timerTab}
        </button>
        <button
          className={`timer-tab ${activeTab === 'stopwatch' ? 'is-active' : ''}`}
          type="button"
          role="tab"
          aria-selected={activeTab === 'stopwatch'}
          onClick={() => setActiveTab('stopwatch')}
        >
          {t.timer.stopwatchTab}
        </button>
      </div>

      {activeTab === 'timer' ? (
        <>
          <div className="timer-duration-settings">
            <label>
              <span>{t.timer.focusDuration}</span>
              <input
                min="1"
                max="240"
                type="number"
                value={focusMinutes}
                onChange={handleFocusMinutesChange}
              />
            </label>
            <label>
              <span>{t.timer.breakDuration}</span>
              <input
                min="1"
                max="240"
                type="number"
                value={breakMinutes}
                onChange={handleBreakMinutesChange}
              />
            </label>
          </div>

          <div className="timer-display-panel">
            <p className="timer-mode">{currentModeLabel}</p>
            <p className="timer-time" aria-label={t.timer.timeRemaining}>
              {formatTime(secondsLeft)}
            </p>
            <p className="timer-caption">{t.timer.timeRemaining}</p>
          </div>

          <div className="timer-controls" aria-label={t.timer.controlsLabel}>
            <button className="timer-button" type="button" onClick={handleStart}>
              {t.timer.start}
            </button>
            <button className="timer-button" type="button" onClick={handlePause}>
              {t.timer.pause}
            </button>
            <button
              className="timer-button secondary"
              type="button"
              onClick={handleReset}
            >
              {t.timer.reset}
            </button>
          </div>

          <div className="timer-stats">
            <div className="timer-stat">
              <span>{t.timer.focusDuration}</span>
              <strong>{t.timer.minuteValue(focusMinutes)}</strong>
            </div>
            <div className="timer-stat">
              <span>{t.timer.breakDuration}</span>
              <strong>{t.timer.minuteValue(breakMinutes)}</strong>
            </div>
            <div className="timer-stat">
              <span>{t.timer.completedSessions}</span>
              <strong>{completedSessions}</strong>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="timer-display-panel stopwatch-panel">
            <p className="timer-mode">{t.timer.stopwatch}</p>
            <p className="timer-time" aria-label={t.timer.elapsedTime}>
              {formatStopwatchTime(stopwatchMilliseconds)}
            </p>
            <p className="timer-caption">{t.timer.elapsedTime}</p>
          </div>

          <div className="timer-controls" aria-label={t.timer.stopwatchControls}>
            <button
              className="timer-button"
              type="button"
              onClick={() => setIsStopwatchRunning(true)}
            >
              {t.timer.start}
            </button>
            <button
              className="timer-button"
              type="button"
              onClick={() => setIsStopwatchRunning(false)}
            >
              {t.timer.pause}
            </button>
            <button
              className="timer-button secondary"
              type="button"
              onClick={handleStopwatchReset}
            >
              {t.timer.reset}
            </button>
            <button
              className="timer-button secondary"
              type="button"
              onClick={handleAddLap}
            >
              {t.timer.lap}
            </button>
          </div>

          <section className="lap-panel" aria-label={t.timer.lapRecords}>
            <p className="recent-notes-title">{t.timer.lapRecords}</p>
            {laps.length > 0 ? (
              <ol>
                {laps.map((lapMilliseconds, index) => (
                  <li key={`${lapMilliseconds}-${index}`}>
                    <span>{t.timer.lapLabel(index + 1)}</span>
                    <strong>{formatStopwatchTime(lapMilliseconds)}</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="command-history-empty">{t.timer.noLaps}</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}

export default Timer
