import { useMemo, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  countEventsByDate,
  createCalendarEvent,
  getAdjacentMonth,
  getClampedDateKey,
  getDateKey,
  getEventsForDate,
  getMonthCalendarCells,
  parseDateKey,
  readCalendarEvents,
  removeCalendarEvent,
} from './calendarLogic.js'

const CALENDAR_STORAGE_KEY = STORAGE_KEYS.calendarEvents

const readStoredCalendarEvents = () =>
  readCalendarEvents(localStorage.getItem(CALENDAR_STORAGE_KEY))

const YEAR_RANGE = Array.from({ length: 11 }, (_, index) => 2021 + index)
const MONTHS = Array.from({ length: 12 }, (_, index) => index)

function Calendar({ t }) {
  const initialDate = getDateKey()
  const initialVisibleDate = parseDateKey(initialDate)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [visibleYear, setVisibleYear] = useState(initialVisibleDate.year)
  const [visibleMonth, setVisibleMonth] = useState(initialVisibleDate.month)
  const [events, setEvents] = useState(readStoredCalendarEvents)
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const selectedEvents = getEventsForDate(events, selectedDate)
  const eventCounts = useMemo(() => countEventsByDate(events), [events])
  const calendarCells = useMemo(
    () => getMonthCalendarCells(visibleYear, visibleMonth),
    [visibleMonth, visibleYear],
  )
  const todayDate = getDateKey()

  const persistEvents = (nextEvents) => {
    // Calendar는 독립 key에만 저장해 기존 Tasks/Notes/Timer 데이터 구조와 충돌하지 않게 합니다.
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(nextEvents))
    setEvents(nextEvents)
  }

  const syncVisibleMonth = (nextDateKey) => {
    const nextDate = parseDateKey(nextDateKey)

    setVisibleYear(nextDate.year)
    setVisibleMonth(nextDate.month)
  }

  const selectDate = (dateKey) => {
    setSelectedDate(dateKey)
    syncVisibleMonth(dateKey)
  }

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
  }

  const handleYearChange = (event) => {
    const nextYear = Number(event.target.value)
    const selected = parseDateKey(selectedDate)
    const nextDateKey = getClampedDateKey(nextYear, visibleMonth, selected.day)

    setVisibleYear(nextYear)
    setSelectedDate(nextDateKey)
  }

  const handleMonthChange = (event) => {
    const nextMonth = Number(event.target.value)
    const selected = parseDateKey(selectedDate)
    const nextDateKey = getClampedDateKey(visibleYear, nextMonth, selected.day)

    setVisibleMonth(nextMonth)
    setSelectedDate(nextDateKey)
  }

  const handleAddEvent = (event) => {
    event.preventDefault()

    const nextEvent = createCalendarEvent({
      date: selectedDate,
      memo,
      title,
    })

    if (!nextEvent) {
      return
    }

    persistEvents([...events, nextEvent])
    setTitle('')
    setMemo('')
  }

  const handleDeleteEvent = (eventId) => {
    persistEvents(removeCalendarEvent(events, eventId))
  }

  return (
    <section
      className="module-panel calendar-module"
      aria-labelledby="calendar-title"
    >
      <div className="module-header">
        <div>
          <p className="module-label">{t.calendar.label}</p>
          <h2 id="calendar-title">{t.calendar.title}</h2>
        </div>
        <p className="module-meta">{selectedDate}</p>
      </div>

      <div className="calendar-layout">
        <section
          className="calendar-events-panel"
          aria-label={t.calendar.eventsForDate}
        >
          <div className="calendar-events-header">
            <div>
              <p className="module-label">{t.calendar.eventsForDate}</p>
              <h3>{selectedDate}</h3>
            </div>
            <strong>{selectedEvents.length}</strong>
          </div>

          {selectedEvents.length > 0 ? (
            <ul className="calendar-event-list">
              {selectedEvents.map((calendarEvent) => (
                <li className="calendar-event-item" key={calendarEvent.id}>
                  <div>
                    <h3>{calendarEvent.title}</h3>
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

            <button type="submit">{t.calendar.addEvent}</button>
          </form>
        </section>

        <section
          className="calendar-month-panel"
          aria-label={t.calendar.monthlyCalendar}
        >
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

          <div className="calendar-weekdays" aria-hidden="true">
            {t.calendar.weekdays.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-month-grid">
            {calendarCells.map((cell, index) =>
              cell ? (
                <button
                  className={`calendar-day ${
                    cell.dateKey === selectedDate ? 'is-selected' : ''
                  } ${cell.dateKey === todayDate ? 'is-today' : ''} ${
                    eventCounts[cell.dateKey] ? 'has-events' : ''
                  }`}
                  key={cell.dateKey}
                  type="button"
                  onClick={() => selectDate(cell.dateKey)}
                  aria-label={`${cell.dateKey}${
                    eventCounts[cell.dateKey]
                      ? `, ${t.calendar.eventCount(eventCounts[cell.dateKey])}`
                      : ''
                  }`}
                >
                  <span>{cell.day}</span>
                  {eventCounts[cell.dateKey] ? (
                    <strong>{eventCounts[cell.dateKey]}</strong>
                  ) : null}
                </button>
              ) : (
                <span
                  className="calendar-day is-empty"
                  key={`empty-${visibleYear}-${visibleMonth}-${index}`}
                ></span>
              ),
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

export default Calendar
