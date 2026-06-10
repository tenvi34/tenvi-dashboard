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
// 완료 세션 저장
const TIMER_SESSIONS_STORAGE_KEY = STORAGE_KEYS.timerCompletedSessions

// 완료 세션 복원
const readCompletedSessions = () => {
  const savedValue = localStorage.getItem(TIMER_SESSIONS_STORAGE_KEY)
  const parsedValue = Number.parseInt(savedValue, 10)

  // 세션 통계 fallback
  return Number.isNaN(parsedValue) ? 0 : parsedValue
}

// Timer 컴포넌트
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

  // 카운트다운 초 계산
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

    // interval 중복 방지
    const timerId = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => {
        if (currentSeconds > 1) {
          return currentSeconds - 1
        }

        const nextMode = mode === 'focus' ? 'break' : 'focus'

        // Focus 완료 카운트
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

    // 스톱워치 10ms 갱신
    const stopwatchId = window.setInterval(() => {
      setStopwatchMilliseconds((currentMilliseconds) => currentMilliseconds + 10)
    }, 10)

    return () => window.clearInterval(stopwatchId)
  }, [isStopwatchRunning])

  // Focus 시간 변경
  const handleFocusMinutesChange = (event) => {
    const nextFocusMinutes = normalizeMinutes(
      event.target.value,
      DEFAULT_FOCUS_MINUTES,
    )

    setFocusMinutes(nextFocusMinutes)

    // 정지 상태 즉시 반영
    if (mode === 'focus' && !isRunning) {
      setSecondsLeft(minutesToSeconds(nextFocusMinutes))
    }
  }

  // Break 시간 변경
  const handleBreakMinutesChange = (event) => {
    const nextBreakMinutes = normalizeMinutes(
      event.target.value,
      DEFAULT_BREAK_MINUTES,
    )

    setBreakMinutes(nextBreakMinutes)

    // Break 실행 중 유지
    if (mode === 'break' && !isRunning) {
      setSecondsLeft(minutesToSeconds(nextBreakMinutes))
    }
  }

  // 타이머 시작
  const handleStart = () => {
    setIsRunning(true)
  }

  // 타이머 일시정지
  const handlePause = () => {
    setIsRunning(false)
  }

  // 타이머 초기화
  const handleReset = () => {
    setIsRunning(false)
    setSecondsLeft(getModeSeconds(mode))
  }

  // 스톱워치 초기화
  const handleStopwatchReset = () => {
    setIsStopwatchRunning(false)
    setStopwatchMilliseconds(0)
    setLaps([])
  }

  // lap 기록
  const handleAddLap = () => {
    if (stopwatchMilliseconds === 0) {
      return
    }

    setLaps((currentLaps) => [stopwatchMilliseconds, ...currentLaps])
  }

  return (
    <section className="module-panel timer-module" aria-labelledby="timer-title">
      {/* Timer 헤더 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.timer.label}</p>
          <h2 id="timer-title">{t.timer.title}</h2>
        </div>
        <p className="module-meta">
          {activeTab === 'timer' ? t.timer.timerTab : t.timer.stopwatchTab}
        </p>
      </div>

      {/* Timer 탭 */}
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
          {/* Focus/Break 설정 */}
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

          {/* 남은 시간 표시 */}
          <div className="timer-display-panel">
            <p className="timer-time" aria-label={t.timer.timeRemaining}>
              {formatTime(secondsLeft)}
            </p>
            <p className="timer-caption">{t.timer.timeRemaining}</p>
          </div>

          {/* Timer 조작 버튼 */}
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

          {/* Timer 요약 */}
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
          {/* Stopwatch 시간 표시 */}
          <div className="timer-display-panel stopwatch-panel">
            <p className="timer-time" aria-label={t.timer.elapsedTime}>
              {formatStopwatchTime(stopwatchMilliseconds)}
            </p>
            <p className="timer-caption">{t.timer.elapsedTime}</p>
          </div>

          {/* Stopwatch 조작 버튼 */}
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

          {/* Stopwatch lap 기록 */}
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
