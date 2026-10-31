import { describe, expect, it } from 'vitest'
import { paginateTravelPlaces, visibleTravelDays } from './travelViewLogic.js'
import { travelTranslations } from '../../i18n/travelTranslations.js'

const data = {
  places: Array.from({ length: 20 }, (_, index) => ({
    id: `p${index}`,
    name: `Place ${index}`,
    category: 'cafe',
    region: 'Tokyo',
    address: index === 12 ? 'Unique Address' : '',
    memo: '',
    onHold: index === 0,
  })),
  schedules: [{ placeId: 'p1' }, { placeId: 'p2' }],
}

describe('Travel compact views', () => {
  it('paginates without mutating stored place order or losing records', () => {
    const pages = [1, 2, 3].map((page) => paginateTravelPlaces(data, { page }))
    expect(pages.map((page) => page.items.length)).toEqual([8, 8, 4])
    expect(pages.flatMap((page) => page.items.map((item) => item.id))).toEqual(
      data.places.map((place) => place.id),
    )
    expect(data.places[0].id).toBe('p0')
  })

  it('clamps a stale page when filtering reduces the result count', () => {
    const result = paginateTravelPlaces(data, { filter: 'scheduled', page: 3 })
    expect(result).toMatchObject({ page: 1, pages: 1, total: 2 })
    expect(result.items.map((item) => item.id)).toEqual(['p1', 'p2'])
  })

  it('finds addresses case-insensitively and ignores surrounding query whitespace', () => {
    expect(
      paginateTravelPlaces(data, { query: ' UNIQUE address ' }).items.map((item) => item.id),
    ).toEqual(['p12'])
  })

  it('keeps the no-results page valid and empty', () => {
    expect(paginateTravelPlaces(data, { query: 'missing', page: 100 })).toMatchObject({
      items: [],
      page: 1,
      pages: 1,
      total: 0,
    })
  })

  it('preserves on-hold and unscheduled filtering', () => {
    expect(paginateTravelPlaces(data, { filter: 'onHold' }).total).toBe(1)
    expect(paginateTravelPlaces(data, { filter: 'unscheduled' }).total).toBe(18)
  })

  it.each([
    [5, 1, [1, 2, 3, 4, 5]],
    [20, 1, [1, 2, 3, 4, 5, 6, 7]],
    [20, 10, [7, 8, 9, 10, 11, 12, 13]],
    [3660, 3660, [3654, 3655, 3656, 3657, 3658, 3659, 3660]],
  ])('bounds the day navigation for %i days at day %i', (days, day, expected) => {
    expect(visibleTravelDays(days, day)).toEqual(expected)
  })

  it.each(['ko', 'en'])('has all editor and compact-view copy for %s', (language) => {
    const t = travelTranslations[language]
    ;[
      'saveChanges',
      'editorHint',
      'editTrip',
      'editPlace',
      'editSchedule',
      'addressTools',
      'locationTools',
      'placeLibrary',
      'placeDetails',
      'scheduleDetails',
      'previewHint',
      'addToItinerary',
      'daySelection',
      'scheduleListHint',
    ].forEach((key) => expect(t[key]).toEqual(expect.any(String)))
    expect(t.editNamed('Example')).toContain('Example')
    expect(t.pageOf(2, 3)).toContain('2')
  })
})
