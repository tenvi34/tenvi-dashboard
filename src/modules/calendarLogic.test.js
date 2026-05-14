import { describe, expect, it, vi } from 'vitest'
import {
  countEventsByDate,
  createCalendarEvent,
  getAdjacentMonth,
  getClampedDateKey,
  getDateKey,
  getDaysInMonth,
  getEventsForDate,
  getMonthCalendarCells,
  isFullMoonDate,
  parseDateKey,
  getTodayEvents,
  readCalendarEvents,
  removeCalendarEvent,
} from './calendarLogic.js'

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

  it('filters events by selected date and today', () => {
    expect(getEventsForDate(events, '2026-05-14')).toEqual([events[0]])
    expect(getTodayEvents(events, new Date(2026, 4, 15))).toEqual([events[1]])
  })

  it('creates trimmed events and rejects empty titles', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000)
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    expect(
      createCalendarEvent({
        date: '2026-05-14',
        title: '  Deep work  ',
        memo: '  Draft  ',
      }),
    ).toMatchObject({
      date: '2026-05-14',
      title: 'Deep work',
      memo: 'Draft',
    })
    expect(
      createCalendarEvent({ date: '2026-05-14', title: '   ', memo: '' }),
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

  it('calculates adjacent months across year boundaries', () => {
    expect(getAdjacentMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 })
    expect(getAdjacentMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 })
  })

  it('clamps selected day when moving to shorter months', () => {
    expect(getDaysInMonth(2026, 1)).toBe(28)
    expect(getClampedDateKey(2026, 1, 31)).toBe('2026-02-28')
  })

  it('counts events by date', () => {
    expect(countEventsByDate([...events, { ...events[0], id: 'c' }])).toEqual({
      '2026-05-14': 2,
      '2026-05-15': 1,
    })
  })

  it('marks approximate full moon dates from the lunar cycle reference', () => {
    expect(isFullMoonDate('2000-01-21')).toBe(true)
    expect(isFullMoonDate('2000-01-28')).toBe(false)
  })
})
