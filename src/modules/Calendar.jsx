import { useMemo, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
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
import { countDueTasksByDate, getTasksDueOnDate } from './tasksLogic.js'

const CALENDAR_STORAGE_KEY = STORAGE_KEYS.calendarEvents
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks

// Calendar 전용 localStorage 값에서 유효한 일정 목록을 복원합니다.
const readStoredCalendarEvents = () =>
  readCalendarEvents(localStorage.getItem(CALENDAR_STORAGE_KEY))

// Calendar 배지와 날짜별 마감 표시를 위해 저장된 Tasks 목록을 읽습니다.
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

// 월간 달력과 날짜별 일정/마감 Task 관리를 제공하는 컴포넌트입니다.
function Calendar({ t }) {
  const initialDate = getDateKey()
  const initialVisibleDate = parseDateKey(initialDate)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [visibleYear, setVisibleYear] = useState(initialVisibleDate.year)
  const [visibleMonth, setVisibleMonth] = useState(initialVisibleDate.month)
  const [events, setEvents] = useState(readStoredCalendarEvents)
  const [tasks] = useState(readStoredTasks)
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [startDate, setStartDate] = useState(initialDate)
  const [endDate, setEndDate] = useState(initialDate)
  const [formMessage, setFormMessage] = useState('')
  const selectedEvents = getEventsForDate(events, selectedDate)
  const selectedDueTasks = getTasksDueOnDate(tasks, selectedDate)
  const eventCounts = useMemo(() => {
    const calendarEventCounts = countEventsByDate(events)
    const dueTaskCounts = countDueTasksByDate(tasks)

    // Calendar 배지는 기존 일정 수와 Tasks dueDate 수를 합산해서 날짜별 활동 여부를 보여줍니다.
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

  // 변경된 일정 목록을 localStorage와 화면 상태에 함께 반영합니다.
  const persistEvents = (nextEvents) => {
    // Calendar는 독립 key에만 저장해 기존 Tasks/Notes/Timer 데이터 구조와 충돌하지 않게 합니다.
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(nextEvents))
    setEvents(nextEvents)
  }

  // 선택 날짜에 맞춰 화면에 보이는 연도와 월을 동기화합니다.
  const syncVisibleMonth = (nextDateKey) => {
    const nextDate = parseDateKey(nextDateKey)

    setVisibleYear(nextDate.year)
    setVisibleMonth(nextDate.month)
  }

  // 사용자가 선택한 날짜를 저장하고 해당 월로 달력을 이동합니다.
  const selectDate = (dateKey) => {
    setSelectedDate(dateKey)
    setStartDate(dateKey)
    setEndDate(dateKey)
    setFormMessage('')
    syncVisibleMonth(dateKey)
  }

  // 이전/다음 월로 이동하면서 선택 날짜를 유효한 날짜로 보정합니다.
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

  // 연도 선택값이 바뀌면 선택 날짜와 보이는 연도를 함께 갱신합니다.
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

  // 월 선택값이 바뀌면 선택 날짜와 보이는 월을 함께 갱신합니다.
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

  // 현재 선택 날짜에 새 Calendar 이벤트를 추가합니다.
  const handleAddEvent = (event) => {
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

    persistEvents([...events, nextEvent])
    setTitle('')
    setMemo('')
    setStartDate(selectedDate)
    setEndDate(selectedDate)
    setFormMessage('')
  }

  // 지정한 Calendar 이벤트를 삭제하고 저장소에 반영합니다.
  const handleDeleteEvent = (eventId) => {
    persistEvents(removeCalendarEvent(events, eventId))
  }

  const handleStartDateChange = (event) => {
    const nextStartDate = event.target.value

    setSelectedDate(nextStartDate)
    setStartDate(nextStartDate)
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

  return (
    <section
      className="module-panel calendar-module"
      aria-labelledby="calendar-title"
    >
      {/* Calendar 상단 제목과 현재 선택 날짜 표시 영역 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.calendar.label}</p>
          <h2 id="calendar-title">{t.calendar.title}</h2>
        </div>
        <p className="module-meta">{selectedDate}</p>
      </div>

      {/* Calendar 본문: 좌측 일정 관리, 우측 월간 달력 */}
      <div className="calendar-layout">
        <section
          className="calendar-events-panel"
          aria-label={t.calendar.eventsForDate}
        >
          {/* 선택된 날짜의 일정 목록 헤더 */}
          <div className="calendar-events-header">
            <div>
              <p className="module-label">{t.calendar.eventsForDate}</p>
              <h3>{selectedDate}</h3>
            </div>
            <strong>{selectedEvents.length + selectedDueTasks.length}</strong>
          </div>

          {/* 선택된 날짜의 일정 목록 또는 빈 상태 메시지 */}
          {selectedEvents.length > 0 ? (
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
                        // 선택 날짜 목록의 기간 라벨 표시
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

          {/* 선택된 날짜가 마감일인 Task 목록 */}
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

          {/* 선택된 날짜에 새 일정을 추가하는 입력 폼 */}
          <form className="calendar-form" onSubmit={handleAddEvent}>
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

            <button type="submit">{t.calendar.addEvent}</button>
          </form>
        </section>

        <section
          className="calendar-month-panel"
          aria-label={t.calendar.monthlyCalendar}
        >
          {/* 월 이동과 년/월 선택 컨트롤 */}
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

          {/* 월간 달력 셀: 선택일, 오늘, 일정 있음, 보름달 표시를 함께 렌더링합니다. */}
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
                    // 하루 일정과 기간 일정 indicator 구분
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
