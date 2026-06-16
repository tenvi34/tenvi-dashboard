import { describe, expect, it, vi } from 'vitest'
import {
  countEventsByDate,
  createCalendarEvent,
  eventOccursOnDate,
  getAdjacentMonth,
  getCalendarEventDateKeys,
  getCalendarEventDateLabel,
  getCalendarEventEndDate,
  getCalendarEventRangePosition,
  getCalendarEventStartDate,
  getCalendarDayRangeMeta,
  getClampedDateKey,
  getDateKey,
  getDaysInMonth,
  getEventsForDate,
  getMonthCalendarCells,
  getMonthEvents,
  getNextEvent,
  getScheduledDateCount,
  isValidCalendarDateRange,
  isFullMoonDate,
  normalizeCalendarEvent,
  parseDateKey,
  RANGE_POSITION,
  getTodayEvents,
  readCalendarEvents,
  removeCalendarEvent,
} from './calendarLogic.js'

// 단일 날짜 일정 fixture
const events = [
  {
    id: 'a',
    date: '2026-05-14',
    title: 'Planning',
    memo: 'Calendar module',
    createdAt: '2026-05-14T00:00:00.000Z',
  },
  {
    id: 'b',
    date: '2026-05-15',
    title: 'Review',
    memo: '',
    createdAt: '2026-05-15T00:00:00.000Z',
  },
]

// 기간 일정 fixture
const rangedEvent = {
  id: 'trip',
  date: '2026-05-14',
  startDate: '2026-05-14',
  endDate: '2026-05-18',
  title: 'Trip',
  memo: '4 nights',
  createdAt: '2026-05-14T00:00:00.000Z',
}

// startDate 없는 기존 기간 일정 호환 fixture
const legacyRangedEvent = {
  id: 'legacy-trip',
  date: '2026-05-14',
  endDate: '2026-05-16',
  title: 'Legacy trip',
  memo: '',
  createdAt: '2026-05-14T00:00:00.000Z',
}

describe('calendarLogic', () => {
  it('formats local date keys as YYYY-MM-DD', () => {
    expect(getDateKey(new Date(2026, 4, 14))).toBe('2026-05-14')
    expect(parseDateKey('2026-05-14')).toEqual({
      day: 14,
      month: 4,
      year: 2026,
    })
  })

  it('reads only valid calendar events from storage', () => {
    expect(readCalendarEvents('not-json')).toEqual([])
    expect(readCalendarEvents(JSON.stringify({}))).toEqual([])
    expect(readCalendarEvents(JSON.stringify([...events, { id: 'broken' }]))).toEqual(
      events,
    )
  })

  it('ignores non-array calendar payloads from storage', () => {
    expect(readCalendarEvents(JSON.stringify({ events }))).toEqual([])
    expect(readCalendarEvents(JSON.stringify(null))).toEqual([])
  })

  it('filters events by selected date and today', () => {
    expect(getEventsForDate(events, '2026-05-14')).toEqual([events[0]])
    expect(getTodayEvents(events, new Date(2026, 4, 15))).toEqual([events[1]])
  })

  it('normalizes date-only and ranged calendar events', () => {
    expect(normalizeCalendarEvent(events[0])).toMatchObject({
      date: '2026-05-14',
      startDate: '2026-05-14',
      endDate: '2026-05-14',
    })
    expect(normalizeCalendarEvent(legacyRangedEvent)).toMatchObject({
      date: '2026-05-14',
      startDate: '2026-05-14',
      endDate: '2026-05-16',
    })
    expect(normalizeCalendarEvent(rangedEvent)).toMatchObject({
      date: '2026-05-14',
      startDate: '2026-05-14',
      endDate: '2026-05-18',
    })
  })

  it('checks selected dates inside calendar ranges', () => {
    expect(getCalendarEventStartDate(legacyRangedEvent)).toBe('2026-05-14')
    expect(getCalendarEventEndDate(legacyRangedEvent)).toBe('2026-05-16')
    expect(eventOccursOnDate(rangedEvent, '2026-05-16')).toBe(true)
    expect(eventOccursOnDate(rangedEvent, '2026-05-19')).toBe(false)
    expect(getCalendarEventDateKeys(legacyRangedEvent)).toEqual([
      '2026-05-14',
      '2026-05-15',
      '2026-05-16',
    ])
  })

  it('calculates range display positions for month cells', () => {
    expect(getCalendarEventRangePosition(rangedEvent, '2026-05-14')).toBe(
      RANGE_POSITION.start,
    )
    expect(getCalendarEventRangePosition(rangedEvent, '2026-05-16')).toBe(
      RANGE_POSITION.middle,
    )
    expect(getCalendarEventRangePosition(rangedEvent, '2026-05-18')).toBe(
      RANGE_POSITION.end,
    )
    expect(getCalendarEventRangePosition(rangedEvent, '2026-05-19')).toBe(null)
    expect(getCalendarEventRangePosition(events[0], '2026-05-14')).toBe(
      RANGE_POSITION.single,
    )
  })

  it('builds range metadata without marking single-day events as periods', () => {
    expect(getCalendarDayRangeMeta(events, '2026-05-14')).toMatchObject({
      classNames: [],
      hasRangeEvents: false,
      hasSingleDayEvents: true,
      periodPosition: null,
      rangeEventCount: 0,
    })
    expect(
      getCalendarDayRangeMeta([events[1], rangedEvent], '2026-05-15'),
    ).toMatchObject({
      classNames: ['has-range-events', 'period-middle'],
      hasRangeEvents: true,
      hasSingleDayEvents: true,
      periodPosition: RANGE_POSITION.middle,
      rangeEventCount: 1,
    })
    expect(getCalendarDayRangeMeta([legacyRangedEvent], '2026-05-16')).toMatchObject({
      classNames: ['has-range-events', 'period-end'],
      hasRangeEvents: true,
      hasSingleDayEvents: false,
      periodPosition: RANGE_POSITION.end,
      rangeEventCount: 1,
    })
  })

  it('keeps Dashboard and Command schedule label formats stable', () => {
    expect(getCalendarEventDateLabel(events[0])).toBe('2026.05.14')
    expect(getCalendarEventDateLabel(rangedEvent)).toBe(
      '2026.05.14 ~ 2026.05.18',
    )
  })

  it('uses the provided date when filtering today events', () => {
    expect(getTodayEvents(events, new Date(2026, 4, 14))).toEqual([events[0]])
  })

  it('creates trimmed events and rejects empty titles', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    expect(
      createCalendarEvent({
        date: '2026-05-14',
        startDate: '2026-05-14',
        endDate: '2026-05-16',
        title: '  Deep work  ',
        memo: '  Draft  ',
      }),
    ).toMatchObject({
      date: '2026-05-14',
      startDate: '2026-05-14',
      endDate: '2026-05-16',
      title: 'Deep work',
      memo: 'Draft',
    })
    expect(
      createCalendarEvent({ date: '2026-05-14', title: '   ', memo: '' }),
    ).toBe(null)
    expect(
      createCalendarEvent({ date: '', title: 'Deep work', memo: '' }),
    ).toBe(null)
    expect(isValidCalendarDateRange('2026-05-16', '2026-05-14')).toBe(false)
    expect(
      createCalendarEvent({
        date: '2026-05-16',
        startDate: '2026-05-16',
        endDate: '2026-05-14',
        title: 'Invalid range',
        memo: '',
      }),
    ).toBe(null)

    vi.restoreAllMocks()
  })

  it('removes events by id without mutating the source list', () => {
    expect(removeCalendarEvent(events, 'a')).toEqual([events[1]])
    expect(events).toHaveLength(2)
  })

  it('builds 7-column month cells with blank leading and trailing slots', () => {
    const cells = getMonthCalendarCells(2026, 4)

    expect(cells).toHaveLength(42)
    expect(cells.slice(0, 5)).toEqual([null, null, null, null, null])
    expect(cells[5]).toMatchObject({ dateKey: '2026-05-01', day: 1 })
    expect(cells[35]).toMatchObject({ dateKey: '2026-05-31', day: 31 })
    expect(cells.slice(36)).toEqual([null, null, null, null, null, null])
  })

  it('includes February 29 in leap-year month cells', () => {
    const dateKeys = getMonthCalendarCells(2024, 1)
      .filter(Boolean)
      .map((cell) => cell.dateKey)

    expect(dateKeys).toHaveLength(29)
    expect(dateKeys).toContain('2024-02-29')
  })

  it('calculates adjacent months across year boundaries', () => {
    expect(getAdjacentMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
    expect(getAdjacentMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })

  it('clamps selected day when moving to shorter months', () => {
    expect(getDaysInMonth(2026, 1)).toBe(28)
    expect(getClampedDateKey(2026, 1, 31)).toBe('2026-02-28')
  })

  it('counts events by date', () => {
    expect(countEventsByDate([...events, { ...events[0], id: 'c' }, rangedEvent])).toEqual({
      '2026-05-14': 3,
      '2026-05-15': 2,
      '2026-05-16': 1,
      '2026-05-17': 1,
      '2026-05-18': 1,
    })
  })

  it('filters mixed single-day and ranged events for a selected date', () => {
    expect(getEventsForDate([...events, rangedEvent], '2026-05-15')).toEqual([
      events[1],
      rangedEvent,
    ])
  })

  it('filters current month events and counts scheduled dates', () => {
    const monthEvents = getMonthEvents(
      [
        ...events,
        {
          id: 'c',
          date: '2026-06-01',
          title: 'Next month',
          memo: '',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'd',
          date: '2025-05-14',
          title: 'Previous year',
          memo: '',
          createdAt: '2025-05-14T00:00:00.000Z',
        },
      ],
      new Date(2026, 4, 14),
    )

    expect(monthEvents).toEqual(events)
    expect(getScheduledDateCount(monthEvents)).toBe(2)
  })

  it('finds the nearest event after today using date and createdAt order', () => {
    expect(
      getNextEvent(
        [
          ...events,
          {
            id: 'today',
            date: '2026-05-14',
            title: 'Today should be ignored',
            memo: '',
            createdAt: '2026-05-13T00:00:00.000Z',
          },
          {
            id: 'c',
            date: '2026-05-15',
            title: 'Earlier created event',
            memo: '',
            createdAt: '2026-05-14T23:00:00.000Z',
          },
        ],
        new Date(2026, 4, 14),
      ),
    ).toMatchObject({
      id: 'c',
      date: '2026-05-15',
    })
  })

  it('returns undefined when no future event exists', () => {
    expect(getNextEvent(events, new Date(2026, 4, 15))).toBeUndefined()
  })

  it('marks approximate full moon dates from the lunar cycle reference', () => {
    expect(isFullMoonDate('2000-01-21')).toBe(true)
    expect(isFullMoonDate('2000-01-28')).toBe(false)
  })
})
