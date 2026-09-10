import { describe, expect, it } from 'vitest'
import { cloneTravelData, createTripData, exportTravelJson, filterTravelPlaces, getDaySchedules, getTravelDayCount,
  getTravelDayDate, getTravelRouteStops, importTravelJson, moveTravelSchedule, removeTravelPlace, tripDateError, validateTravelData } from './travelLogic.js'
import { travelTranslations } from '../../i18n/travelTranslations.js'
import { getModuleFromPathname, getModulePath } from '../../router/routes.js'

// 사용자 입력만으로 구성한 독립 여행 fixture
const fixture = () => {
  const data = createTripData({ name: 'My trip', startDate: '2028-02-28', endDate: '2028-03-01' })
  const tripId = data.trip.id
  const place = (id, category = 'other') => ({ id, tripId, name: id, region: '', address: '', memo: '', category,
    priority: 'must', onHold: false, latitude: 35, longitude: 139, provider: 'manual', providerPlaceId: '' })
  data.places = [place('hotel', 'lodging'), place('park', 'sightseeing'), { ...place('cafe', 'cafe'), latitude: null, longitude: null }]
  data.schedules = ['a', 'b', 'c'].map((id, order) => ({ id, tripId, day: 1, order, title: '', startTime: '', durationMinutes: null,
    memo: `note-${id}`, placeId: order === 0 ? 'park' : null, candidateGroupId: null }))
  data.settings.lodgingPlaceId = 'hotel'
  data.candidateGroups = [{ id: 'lunch', tripId, name: 'Lunch options', placeIds: ['park', 'cafe'] }]
  data.schedules[1].candidateGroupId = 'lunch'
  return data
}

describe('Travel data and relationships', () => {
  it('creates a trip with only a name and no sample data', () => {
    const data = createTripData({ name: '  New trip  ' })
    expect(data.trip.name).toBe('New trip')
    expect(data.places).toEqual([])
    expect(data.schedules).toEqual([])
    expect(getTravelDayCount(data)).toBe(1)
    expect(data.settings.lodgingPlaceId).toBeNull()
  })
  it('supports leap days and rejects reversed or nonexistent dates', () => {
    const data = fixture()
    expect(getTravelDayCount(data)).toBe(3)
    expect(getTravelDayDate(data.trip, 2)).toBe('2028-02-29')
    expect(getTravelDayDate(data.trip, 3)).toBe('2028-03-01')
    expect(tripDateError({ startDate: '2027-02-29', endDate: '' })).toBe('invalidDates')
    expect(tripDateError({ startDate: '2028-03-01', endDate: '2028-02-28' })).toBe('invalidDates')
    expect(tripDateError({ startDate: '', endDate: '2028-03-01' })).toBe('')
  })
  it('preserves itinerary when dates are shortened or cleared', () => {
    const data = fixture()
    data.schedules[0].day = 5
    data.trip.endDate = data.trip.startDate
    expect(getTravelDayCount(validateTravelData(data))).toBe(5)
    expect(getTravelDayDate(data.trip, 5)).toBe('')
    data.trip.startDate = data.trip.endDate = ''
    expect(getTravelDayCount(data)).toBe(5)
    expect(data.schedules).toHaveLength(3)
  })
  it('duplicates every entity ID and remaps place, lodging and candidate references', () => {
    const source = fixture()
    const copy = cloneTravelData(source)
    expect(copy.trip.id).not.toBe(source.trip.id)
    expect(copy.places.map((place) => place.id)).not.toEqual(source.places.map((place) => place.id))
    expect(copy.settings.lodgingPlaceId).toBe(copy.places[0].id)
    expect(copy.schedules[0].placeId).toBe(copy.places[1].id)
    expect(copy.schedules[1].candidateGroupId).toBe(copy.candidateGroups[0].id)
    expect(copy.candidateGroups[0].placeIds).toEqual([copy.places[1].id, copy.places[2].id])
    expect(copy.schedules[2].placeId).toBeNull()
    copy.places[0].name = 'Changed'
    expect(source.places[0].name).toBe('hotel')
  })
  it('deleting a place preserves slots and notes, and clears candidate/lodging references', () => {
    const source = fixture()
    const removed = validateTravelData(removeTravelPlace(source, 'park'))
    expect(removed.schedules[0].placeId).toBeNull()
    expect(removed.schedules[0].memo).toBe('note-a')
    expect(removed.candidateGroups[0].placeIds).toEqual(['cafe'])
    expect(removed.schedules).toHaveLength(3)
    expect(removeTravelPlace(removed, 'hotel').settings.lodgingPlaceId).toBeNull()
    expect(source.places).toHaveLength(3)
  })
  it('moves itinerary order and DAY without removing the saved place', () => {
    const source = fixture()
    const reordered = moveTravelSchedule(source, 'a', 1, 1)
    expect(getDaySchedules(reordered, 1).map((item) => item.id)).toEqual(['b', 'a', 'c'])
    const moved = validateTravelData(moveTravelSchedule(reordered, 'a', 2))
    expect(getDaySchedules(moved, 1).map((item) => item.id)).toEqual(['b', 'c'])
    expect(getDaySchedules(moved, 2)[0].placeId).toBe('park')
    expect(moved.places).toEqual(source.places)
  })
  it('filters scheduled, unscheduled, category and DAY independently', () => {
    const data = fixture()
    expect(filterTravelPlaces(data, 'scheduled').map((place) => place.id)).toEqual(['park'])
    expect(filterTravelPlaces(data, 'unscheduled')).toHaveLength(2)
    expect(filterTravelPlaces(data, 'lodging')[0].id).toBe('hotel')
    expect(filterTravelPlaces(data, 'all', 2)).toEqual([])
    data.places[1].onHold = true
    expect(filterTravelPlaces(data, 'onHold')[0].id).toBe('park')
    expect(data.schedules[0].placeId).toBe('park')
  })
  it('builds future routing stops from place references and optional lodging', () => {
    const data = fixture()
    expect(getTravelRouteStops(data, 1).map((place) => place.id)).toEqual(['hotel', 'park', 'hotel'])
    data.settings.lodgingPlaceId = null
    expect(getTravelRouteStops(data, 1).map((place) => place.id)).toEqual(['park'])
  })
})

describe('Travel backup validation', () => {
  it('round-trips content with new IDs without modifying source', () => {
    const source = fixture()
    const json = exportTravelJson(source)
    const restored = importTravelJson(json)
    expect(restored.trip.name).toBe(source.trip.name)
    expect(restored.trip.id).not.toBe(source.trip.id)
    expect(restored.places).toHaveLength(3)
    expect(restored.schedules[0].memo).toBe('note-a')
    expect(exportTravelJson(source)).toBe(json)
  })
  it.each([
    (data) => { data.schedules[0].placeId = 'missing' },
    (data) => { data.places[0].tripId = 'another-trip' },
    (data) => { data.places[0].latitude = '35' },
    (data) => { data.places[0].longitude = 181 },
    (data) => { data.places[1].id = data.places[0].id },
    (data) => { data.schedules[0].day = 0 },
    (data) => { data.schedules[0].startTime = '24:15' },
    (data) => { data.schedules[0].durationMinutes = -1 },
    (data) => { data.settings.lodgingPlaceId = 'park' },
    (data) => { data.candidateGroups[0].placeIds = ['missing'] },
    (data) => { data.trip.name = '   ' },
    (data) => { data.trip.startDate = '2028-02-31' },
    (data) => { data.schemaVersion = 2 },
  ])('rejects damaged data before it can reach persistence (%#)', (damage) => {
    const data = fixture()
    damage(data)
    expect(() => importTravelJson(JSON.stringify({ format: 'tenvi.travel', version: 1, data }))).toThrow('invalidData')
  })
  it.each(['{', '{}', 'null', '[]', '{"format":"other","version":1}'])('rejects invalid JSON or foreign format %s', (json) => {
    expect(() => importTravelJson(json)).toThrow('invalidData')
  })
  it('discards unrecognized input fields', () => {
    const data = fixture()
    data.trip.untrusted = 'ignored'
    expect(validateTravelData(data).trip).not.toHaveProperty('untrusted')
  })
})

describe('Travel integration', () => {
  it('recognizes direct and nested Travel URLs without changing other routes', () => {
    expect(getModulePath('travel')).toBe('/travel')
    expect(getModuleFromPathname('/travel')).toBe('travel')
    expect(getModuleFromPathname('/travel/trip-id')).toBe('travel')
    expect(getModuleFromPathname('/traveler')).toBe('dashboard')
    expect(getModuleFromPathname('/board/posts/1')).toBe('board')
  })
  it('keeps all Korean and English Travel labels aligned', () => {
    const keys = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) =>
      child && typeof child === 'object' ? keys(child, `${prefix}${key}.`) : `${prefix}${key}`)
    expect(keys(travelTranslations.ko)).toEqual(keys(travelTranslations.en))
  })
})
