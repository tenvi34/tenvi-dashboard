import { useEffect, useMemo, useState } from 'react'
import {
  createRemoteCalendarEvent,
  deleteRemoteCalendarEvent,
  fetchCalendarEvents,
} from '../api/calendarApi.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import './Calendar.css'
import {
  countEventsByDate,
  createCalendarEvent,
  getCalendarEventDateLabel,
  getCalendarDayRangeMeta,
  getAdjacentMonth,
  getClampedDateKey,
  getDateKey,
  getEventsForDate,
  getMonthCalendarCells,
  isRangedCalendarEvent,
  isFullMoonDate,
  isValidCalendarDateRange,
  parseDateKey,
  readCalendarEvents,
  removeCalendarEvent,
} from './calendarLogic.js'
import { readCalendarStorageMode } from './calendarStorageMode.js'
import { countDueTasksByDate, getTasksDueOnDate } from './tasksLogic.js'

const CALENDAR_STORAGE_KEY = STORAGE_KEYS.calendarEvents
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks

// Calendar 일정 복원
const readStoredCalendarEvents = () =>
  readCalendarEvents(localStorage.getItem(CALENDAR_STORAGE_KEY))

// Tasks 마감 복원
const readStoredTasks = () => {
  const savedTasks = localStorage.getItem(TASKS_STORAGE_KEY)

  if (!savedTasks) {
    return []
  }

  try {
    const parsedTasks = JSON.parse(savedTasks)

    return Array.isArray(parsedTasks) ? parsedTasks : []
  } catch {
    return []
  }
}

const YEAR_RANGE = Array.from({ length: 11 }, (_, index) => 2021 + index)
const MONTHS = Array.from({ length: 12 }, (_, index) => index)

// Calendar 컴포넌트
function Calendar({ t }) {
  const initialDate = getDateKey()
  const initialVisibleDate = parseDateKey(initialDate)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [visibleYear, setVisibleYear] = useState(initialVisibleDate.year)
  const [visibleMonth, setVisibleMonth] = useState(initialVisibleDate.month)
  const [storageMode] = useState(() => readCalendarStorageMode())
  const [events, setEvents] = useState(() =>
    storageMode === 'remote' ? [] : readStoredCalendarEvents(),
  )
  const [tasks] = useState(readStoredTasks)
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [startDate, setStartDate] = useState(initialDate)
  const [endDate, setEndDate] = useState(initialDate)
  const [formMessage, setFormMessage] = useState('')
  const [isLoadingEvents, setIsLoadingEvents] = useState(storageMode === 'remote')
  const remoteLoadingMessage =
    t.calendar.remoteLoading ?? 'Loading REMOTE Calendar events.'
  const remoteLoadErrorMessage =
    t.calendar.remoteLoadError ?? 'Could not load REMOTE Calendar events.'
  const remoteSaveErrorMessage =
    t.calendar.remoteSaveError ?? 'Could not save REMOTE Calendar event.'
  const selectedEvents = getEventsForDate(events, selectedDate)
  const selectedDueTasks = getTasksDueOnDate(tasks, selectedDate)
  const eventCounts = useMemo(() => {
    const calendarEventCounts = countEventsByDate(events)
    const dueTaskCounts = countDueTasksByDate(tasks)

    // Calendar 배지 집계
    return Object.keys(dueTaskCounts).reduce(
      (combinedCounts, dateKey) => ({
        ...combinedCounts,
        [dateKey]: (combinedCounts[dateKey] ?? 0) + dueTaskCounts[dateKey],
      }),
      { ...calendarEventCounts },
    )
  }, [events, tasks])
  const calendarCells = useMemo(
    () => getMonthCalendarCells(visibleYear, visibleMonth),
    [visibleMonth, visibleYear],
  )
  const rangeMetaByDate = useMemo(
    () =>
      calendarCells.reduce((rangeMetaMap, cell) => {
        if (cell) {
          // 기간 일정 indicator 계산
          rangeMetaMap[cell.dateKey] = getCalendarDayRangeMeta(
            events,
            cell.dateKey,
          )
        }

        return rangeMetaMap
      }, {}),
    [calendarCells, events],
  )
  const todayDate = getDateKey()

  useEffect(() => {
    let isMounted = true

    if (storageMode !== 'remote') {
      return () => {
        isMounted = false
      }
    }

    fetchCalendarEvents()
      .then((remoteEvents) => {
        if (!isMounted) {
          return
        }

        const normalizedEvents = readCalendarEvents(JSON.stringify(remoteEvents))

        localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(normalizedEvents))
        setEvents(normalizedEvents)
        setFormMessage('')
      })
      .catch(() => {
        if (isMounted) {
          setFormMessage(remoteLoadErrorMessage)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingEvents(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [remoteLoadErrorMessage, storageMode])

  const resetEventForm = () => {
    setTitle('')
    setMemo('')
    setStartDate(selectedDate)
    setEndDate(selectedDate)
    setFormMessage('')
  }

  // 일정 저장 반영
  const persistEvents = (nextEvents) => {
    // Calendar 독립 key
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(nextEvents))
    setEvents(nextEvents)
  }

  // 선택 날짜 월 동기화
  const syncVisibleMonth = (nextDateKey) => {
    const nextDate = parseDateKey(nextDateKey)

    setVisibleYear(nextDate.year)
    setVisibleMonth(nextDate.month)
  }

  // 날짜 선택 이동
  const selectDate = (dateKey) => {
    setSelectedDate(dateKey)
    setStartDate(dateKey)
    setEndDate(dateKey)
    setFormMessage('')
    syncVisibleMonth(dateKey)
  }

  // 월 이동 날짜 보정
  const moveVisibleMonth = (offset) => {
    const selected = parseDateKey(selectedDate)
    const nextMonth = getAdjacentMonth(visibleYear, visibleMonth, offset)
    const nextDateKey = getClampedDateKey(
      nextMonth.year,
      nextMonth.month,
      selected.day,
    )

    setVisibleYear(nextMonth.year)
    setVisibleMonth(nextMonth.month)
    setSelectedDate(nextDateKey)
    setStartDate(nextDateKey)
    setEndDate(nextDateKey)
    setFormMessage('')
  }

  // 연도 선택 반영
  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value)
    const selected = parseDateKey(selectedDate)
    const nextDateKey = getClampedDateKey(nextYear, visibleMonth, selected.day)

    setVisibleYear(nextYear)
    setSelectedDate(nextDateKey)
    setStartDate(nextDateKey)
    setEndDate(nextDateKey)
    setFormMessage('')
  }

  // 월 선택 반영
  const handleMonthChange = (event) => {
    const nextMonth = Number(event.target.value)
    const selected = parseDateKey(selectedDate)
    const nextDateKey = getClampedDateKey(visibleYear, nextMonth, selected.day)

    setVisibleMonth(nextMonth)
    setSelectedDate(nextDateKey)
    setStartDate(nextDateKey)
    setEndDate(nextDateKey)
    setFormMessage('')
  }

  // Calendar 이벤트 추가
  const handleAddEvent = async (event) => {
    event.preventDefault()

    if (!isValidCalendarDateRange(startDate, endDate)) {
      setFormMessage(t.calendar.dateRangeError)
      return
    }

    const nextEvent = createCalendarEvent({
      date: startDate,
      endDate,
      memo,
      startDate,
      title,
    })

    if (!nextEvent) {
      setFormMessage(t.calendar.dateRangeError)
      return
    }

    try {
      if (storageMode === 'remote') {
        const createdEvent = await createRemoteCalendarEvent(nextEvent)
        const nextEvents = readCalendarEvents(
          JSON.stringify([...events, createdEvent]),
        )

        persistEvents(nextEvents)
      } else {
        persistEvents([...events, nextEvent])
      }

      resetEventForm()
    } catch {
      setFormMessage(remoteSaveErrorMessage)
    }
  }

  // Calendar 이벤트 삭제
  const handleDeleteEvent = async (eventId) => {
    try {
      if (storageMode === 'remote') {
        await deleteRemoteCalendarEvent(eventId)
      }

      persistEvents(removeCalendarEvent(events, eventId))
    } catch {
      setFormMessage(remoteSaveErrorMessage)
    }
  }

  const handleStartDateChange = (event) => {
    const nextStartDate = event.target.value

    setSelectedDate(nextStartDate)
    setStartDate(nextStartDate)
    // 종료일 역전 방지
    setEndDate((currentEndDate) =>
      currentEndDate < nextStartDate ? nextStartDate : currentEndDate,
    )
    setFormMessage('')
    syncVisibleMonth(nextStartDate)
  }

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value)
    setFormMessage('')
  }

  const handleCancelEventForm = () => {
    resetEventForm()
  }

  return (
    <section
      className="module-panel calendar-module"
      aria-labelledby="calendar-title"
    >
      {/* Calendar 헤더 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.calendar.label}</p>
          <h2 id="calendar-title">{t.calendar.title}</h2>
        </div>
        <p className="module-meta">{selectedDate}</p>
      </div>

      {/* Calendar 본문 */}
      <div className="calendar-layout">
        <section
          className="calendar-events-panel"
          aria-label={t.calendar.eventsForDate}
        >
          {/* 선택 날짜 헤더 */}
          <div className="calendar-events-header">
            <div>
              <p className="module-label">{t.calendar.eventsForDate}</p>
              <h3>{selectedDate}</h3>
            </div>
            <strong>{selectedEvents.length + selectedDueTasks.length}</strong>
          </div>

          {/* 선택 날짜 일정 목록 */}
          {isLoadingEvents ? (
            <div className="empty-state compact-empty" role="status">
              <span>{t.common.systemMessage}</span>
              <p>{remoteLoadingMessage}</p>
            </div>
          ) : selectedEvents.length > 0 ? (
            <ul className="calendar-event-list">
              {selectedEvents.map((calendarEvent) => (
                <li
                  className={`calendar-event-item ${
                    isRangedCalendarEvent(calendarEvent)
                      ? 'calendar-event-item-range'
                      : ''
                  }`}
                  key={calendarEvent.id}
                >
                  <div>
                    <div className="calendar-event-title-row">
                      <h3>{calendarEvent.title}</h3>
                      {isRangedCalendarEvent(calendarEvent) ? (
                        // 기간 라벨 표시
                        <span className="calendar-event-badge">
                          {t.calendar.rangeBadge}
                        </span>
                      ) : null}
                    </div>
                    <p className="calendar-event-date">
                      {getCalendarEventDateLabel(calendarEvent)}
                    </p>
                    {calendarEvent.memo ? <p>{calendarEvent.memo}</p> : null}
                  </div>
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => handleDeleteEvent(calendarEvent.id)}
                  >
                    {t.calendar.deleteEvent}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state compact-empty" role="status">
              <span>{t.common.systemMessage}</span>
              <p>{t.calendar.noEvents}</p>
            </div>
          )}

          {/* 선택 날짜 Task 목록 */}
          <div className="calendar-due-task-section">
            <p className="recent-notes-title">{t.calendar.dueTasksForDate}</p>
            {selectedDueTasks.length > 0 ? (
              <ul className="calendar-event-list">
                {selectedDueTasks.map((task) => (
                  <li
                    className={`calendar-event-item calendar-task-item ${
                      task.completed ? 'is-completed' : ''
                    }`}
                    key={task.id}
                  >
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.completed ? t.tasks.completed : t.tasks.active}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state compact-empty" role="status">
                <span>{t.common.systemMessage}</span>
                <p>{t.calendar.noDueTasks}</p>
              </div>
            )}
          </div>

          {/* 일정 추가 폼 */}
          <form
            id="calendar-event-form"
            className="calendar-form"
            onSubmit={handleAddEvent}
          >
            <label className="sr-only" htmlFor="calendar-title-input">
              {t.calendar.titleLabel}
            </label>
            <input
              id="calendar-title-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t.calendar.titlePlaceholder}
            />

            <label className="sr-only" htmlFor="calendar-memo-input">
              {t.calendar.memoLabel}
            </label>
            <textarea
              id="calendar-memo-input"
              rows="4"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder={t.calendar.memoPlaceholder}
            />

            <div className="calendar-date-range">
              <label>
                <span>{t.calendar.startDateLabel}</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                />
              </label>
              <label>
                <span>{t.calendar.endDateLabel}</span>
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={handleEndDateChange}
                />
              </label>
            </div>

            <p className="calendar-form-hint">{t.calendar.dateRangeHint}</p>

            {formMessage ? (
              <p className="calendar-form-message" role="alert">
                {formMessage}
              </p>
            ) : null}

            <div className="calendar-form-actions">
              <button type="submit">{t.calendar.addEvent}</button>
              <button
                className="calendar-form-cancel"
                type="button"
                onClick={handleCancelEventForm}
              >
                {t.calendar.cancelEventForm}
              </button>
            </div>
          </form>
        </section>

        <section
          className="calendar-month-panel"
          aria-label={t.calendar.monthlyCalendar}
        >
          {/* 월 이동 컨트롤 */}
          <div className="calendar-month-toolbar">
            <button
              className="calendar-nav-button"
              type="button"
              onClick={() => moveVisibleMonth(-1)}
            >
              {t.calendar.previousMonth}
            </button>

            <div className="calendar-month-selectors">
              <label>
                <span>{t.calendar.year}</span>
                <select value={visibleYear} onChange={handleYearChange}>
                  {YEAR_RANGE.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t.calendar.month}</span>
                <select value={visibleMonth} onChange={handleMonthChange}>
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {t.calendar.monthValue(month + 1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              className="calendar-nav-button"
              type="button"
              onClick={() => moveVisibleMonth(1)}
            >
              {t.calendar.nextMonth}
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="calendar-weekdays" aria-hidden="true">
            {t.calendar.weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          {/* 월간 달력 셀 */}
          <div className="calendar-legend" aria-label={t.calendar.legendLabel}>
            <span>
              <i className="calendar-legend-dot"></i>
              {t.calendar.singleEventLegend}
            </span>
            <span>
              <i className="calendar-legend-bar"></i>
              {t.calendar.rangeEventLegend}
            </span>
            <span>
              <i className="calendar-legend-count">2</i>
              {t.calendar.eventCountLegend}
            </span>
          </div>

          <div className="calendar-month-grid">
            {calendarCells.map((cell, index) => {
              if (!cell) {
                return (
                  <span
                    className="calendar-day is-empty"
                    key={`empty-${visibleYear}-${visibleMonth}-${index}`}
                  ></span>
                )
              }

              const rangeMeta = rangeMetaByDate[cell.dateKey] ?? {
                classNames: [],
                hasRangeEvents: false,
              }

              return (
                <button
                  className={`calendar-day ${
                    cell.dateKey === selectedDate ? 'is-selected' : ''
                  } ${cell.dateKey === todayDate ? 'is-today' : ''} ${
                    eventCounts[cell.dateKey] ? 'has-events' : ''
                  } ${isFullMoonDate(cell.dateKey) ? 'is-full-moon' : ''
                  } ${rangeMeta.classNames.join(' ')}`}
                  key={cell.dateKey}
                  type="button"
                  onClick={() => selectDate(cell.dateKey)}
                  aria-label={`${cell.dateKey}${
                    eventCounts[cell.dateKey]
                      ? `, ${t.calendar.eventCount(eventCounts[cell.dateKey])}`
                      : ''
                  }${
                    rangeMeta.hasRangeEvents
                      ? `, ${t.calendar.rangeEventLegend}`
                      : ''
                  }`}
                >
                  <span>{cell.day}</span>
                  {rangeMeta.hasRangeEvents ? (
                    // 일정 indicator 구분
                    <span className="calendar-range-indicator"></span>
                  ) : null}
                  {eventCounts[cell.dateKey] ? (
                    <strong>{eventCounts[cell.dateKey]}</strong>
                  ) : null}
                  {isFullMoonDate(cell.dateKey) ? (
                    <span
                      className="calendar-moon"
                      aria-label={t.calendar.fullMoon}
                      title={t.calendar.fullMoon}
                    >
                      🌕
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}

export default Calendar
