// 여행 내부 참조는 ID로 유지하고 저장/복원 경계에서 동일하게 검증
export const TRAVEL_SCHEMA_VERSION = 1
export const MAX_TRAVEL_DAYS = 3660
export const PLACE_CATEGORIES = ['sightseeing', 'restaurant', 'cafe', 'shopping', 'lodging', 'other']
export const PLACE_PRIORITIES = ['must', 'prefer', 'optional']
export const createTravelId = () => crypto.randomUUID()
const text = (value, max = 10000) => typeof value === 'string' && value.length <= max
const id = (value) => text(value, 100) && value.trim().length > 0
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max
const assert = (condition) => { if (!condition) throw new Error('invalidData') }
export const isTravelDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export const tripDateCount = (trip) => trip.startDate && trip.endDate
  ? Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000) + 1 : 0

export const tripDateError = (trip) => {
  if ((trip.startDate && !isTravelDate(trip.startDate)) || (trip.endDate && !isTravelDate(trip.endDate))) return 'invalidDates'
  if (trip.startDate && trip.endDate && (trip.endDate < trip.startDate || tripDateCount(trip) > MAX_TRAVEL_DAYS)) return 'invalidDates'
  return ''
}

// 기간 축소/날짜 해제 시에도 기존 DAY와 일정 보존
export const getTravelDayCount = (data) => Math.max(
  tripDateCount(data.trip), data.settings.dayCount, ...data.schedules.map((item) => item.day), 1,
)
export const getTravelDayDate = (trip, day) => {
  if (!trip.startDate || (trip.endDate && day > tripDateCount(trip))) return ''
  const date = new Date(`${trip.startDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + day - 1)
  return date.toISOString().slice(0, 10)
}
export const getDaySchedules = (data, day) => data.schedules.filter((item) => item.day === day)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
export const hasPlaceLocation = (place) => Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90
  && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180

export const createTripData = (input) => {
  const tripId = createTravelId()
  return validateTravelData({
    schemaVersion: TRAVEL_SCHEMA_VERSION,
    trip: { id: tripId, name: input.name.trim(), region: input.region || '', startDate: input.startDate || '', endDate: input.endDate || '', status: 'planning', memo: '' },
    places: [], schedules: [], candidateGroups: [],
    settings: { tripId, lodgingPlaceId: null, dayCount: 1 },
  })
}

// JSON의 알 수 없는 필드는 복사하지 않으며 잘못된 참조는 전체 복원 거절
export function validateTravelData(data) {
  assert(data && data.schemaVersion === TRAVEL_SCHEMA_VERSION)
  const trip = data.trip
  assert(trip && id(trip.id) && text(trip.name, 200) && trip.name.trim())
  assert(text(trip.region, 300) && text(trip.memo) && ['planning', 'completed'].includes(trip.status))
  assert(text(trip.startDate, 10) && text(trip.endDate, 10) && !tripDateError(trip))
  assert(Array.isArray(data.places) && data.places.length <= 10000)
  assert(Array.isArray(data.schedules) && data.schedules.length <= 20000)
  assert(Array.isArray(data.candidateGroups) && data.candidateGroups.length <= 10000)
  const checkIds = (items) => {
    assert(items.every((item) => item && id(item.id) && item.tripId === trip.id))
    assert(new Set(items.map((item) => item.id)).size === items.length)
  }
  checkIds(data.places)
  checkIds(data.schedules)
  checkIds(data.candidateGroups)
  const placeIds = new Set(data.places.map((place) => place.id))
  const groupIds = new Set(data.candidateGroups.map((group) => group.id))
  const places = data.places.map((place) => {
    assert(text(place.name, 200) && place.name.trim() && PLACE_CATEGORIES.includes(place.category))
    assert(PLACE_PRIORITIES.includes(place.priority) && typeof place.onHold === 'boolean')
    assert(text(place.region, 300) && text(place.address, 1000) && text(place.memo))
    assert((place.latitude === null && place.longitude === null) || hasPlaceLocation(place))
    assert(text(place.provider, 100) && text(place.providerPlaceId, 200))
    return { id: place.id, tripId: trip.id, name: place.name.trim(), category: place.category, priority: place.priority,
      onHold: place.onHold, region: place.region, address: place.address, memo: place.memo,
      latitude: place.latitude, longitude: place.longitude, provider: place.provider, providerPlaceId: place.providerPlaceId }
  })
  // TODO: 후보 그룹 선택/확정 UI. 저장과 복제/복원 계약은 선행 지원
  const candidateGroups = data.candidateGroups.map((group) => {
    assert(text(group.name, 200) && group.name.trim() && Array.isArray(group.placeIds))
    assert(group.placeIds.length <= 10000 && group.placeIds.every((placeId) => placeIds.has(placeId)))
    return { id: group.id, tripId: trip.id, name: group.name, placeIds: [...new Set(group.placeIds)] }
  })
  const schedules = data.schedules.map((item) => {
    assert(integer(item.day, 1, MAX_TRAVEL_DAYS) && integer(item.order, 0, 1000000))
    assert(text(item.title, 200) && text(item.memo))
    assert(item.startTime === '' || (typeof item.startTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.startTime)))
    assert(item.durationMinutes === null || integer(item.durationMinutes, 0, 10080))
    assert(item.placeId === null || placeIds.has(item.placeId))
    assert(item.candidateGroupId === null || groupIds.has(item.candidateGroupId))
    return { id: item.id, tripId: trip.id, day: item.day, order: item.order, title: item.title, memo: item.memo,
      startTime: item.startTime, durationMinutes: item.durationMinutes, placeId: item.placeId, candidateGroupId: item.candidateGroupId }
  })
  const settings = data.settings
  assert(settings && settings.tripId === trip.id && integer(settings.dayCount, 1, MAX_TRAVEL_DAYS))
  assert(settings.lodgingPlaceId === null || places.some((place) => place.id === settings.lodgingPlaceId && place.category === 'lodging'))
  return { schemaVersion: TRAVEL_SCHEMA_VERSION,
    trip: { id: trip.id, name: trip.name.trim(), region: trip.region, startDate: trip.startDate, endDate: trip.endDate, memo: trip.memo, status: trip.status },
    places, schedules, candidateGroups,
    settings: { tripId: trip.id, lodgingPlaceId: settings.lodgingPlaceId, dayCount: settings.dayCount },
  }
}

// 복제와 가져오기는 모든 ID를 재발급하여 다른 여행/원본과 완전히 격리
export const cloneTravelData = (source, name = source.trip.name) => {
  const data = validateTravelData(source)
  const tripId = createTravelId()
  const placeIds = new Map(data.places.map((place) => [place.id, createTravelId()]))
  const groupIds = new Map(data.candidateGroups.map((group) => [group.id, createTravelId()]))
  return validateTravelData({ ...data, trip: { ...data.trip, id: tripId, name },
    places: data.places.map((place) => ({ ...place, id: placeIds.get(place.id), tripId })),
    candidateGroups: data.candidateGroups.map((group) => ({ ...group, id: groupIds.get(group.id), tripId, placeIds: group.placeIds.map((key) => placeIds.get(key)) })),
    schedules: data.schedules.map((item) => ({ ...item, id: createTravelId(), tripId, placeId: placeIds.get(item.placeId) ?? null, candidateGroupId: groupIds.get(item.candidateGroupId) ?? null })),
    settings: { ...data.settings, tripId, lodgingPlaceId: placeIds.get(data.settings.lodgingPlaceId) ?? null },
  })
}

export const removeTravelPlace = (data, placeId) => ({ ...data,
  places: data.places.filter((place) => place.id !== placeId),
  // 장소 삭제 후에도 슬롯과 사용자 메모 유지
  schedules: data.schedules.map((item) => item.placeId === placeId ? { ...item, placeId: null } : item),
  candidateGroups: data.candidateGroups.map((group) => ({ ...group, placeIds: group.placeIds.filter((key) => key !== placeId) })),
  settings: { ...data.settings, lodgingPlaceId: data.settings.lodgingPlaceId === placeId ? null : data.settings.lodgingPlaceId },
})

export const moveTravelSchedule = (data, scheduleId, day, offset = 0) => {
  const target = data.schedules.find((item) => item.id === scheduleId)
  if (!target) return data
  const items = getDaySchedules(data, day).filter((item) => item.id !== scheduleId)
  const oldIndex = getDaySchedules(data, day).findIndex((item) => item.id === scheduleId)
  const index = target.day === day ? Math.max(0, Math.min(items.length, oldIndex + offset)) : items.length
  items.splice(index, 0, { ...target, day })
  const replacements = new Map(items.map((item, order) => [item.id, { ...item, order }]))
  return { ...data, schedules: data.schedules.map((item) => replacements.get(item.id) ?? item) }
}

export const filterTravelPlaces = (data, filter = 'all', day = null) => {
  const scheduled = new Set(data.schedules.filter((item) => day === null || item.day === day).map((item) => item.placeId))
  return data.places.filter((place) => (day === null || scheduled.has(place.id)) && (
    filter === 'all' || (filter === 'scheduled' && scheduled.has(place.id)) ||
    (filter === 'unscheduled' && !scheduled.has(place.id)) || (filter === 'onHold' && place.onHold) || place.category === filter
  ))
}

// 실제 경로 API 도입 지점: 숙소와 일정 장소 참조로만 경유지 생성
export const getTravelRouteStops = (data, day) => {
  const byId = new Map(data.places.map((place) => [place.id, place]))
  const lodging = byId.get(data.settings.lodgingPlaceId)
  return [lodging, ...getDaySchedules(data, day).map((item) => byId.get(item.placeId)), lodging]
    .filter((place) => place && hasPlaceLocation(place))
}

export const exportTravelJson = (data) => JSON.stringify({ format: 'tenvi.travel', version: 1, data: validateTravelData(data) }, null, 2)
export const importTravelJson = (json) => {
  assert(typeof json === 'string' && json.length <= 20 * 1024 * 1024)
  let backup
  try { backup = JSON.parse(json) } catch { throw new Error('invalidData') }
  assert(backup?.format === 'tenvi.travel' && backup.version === 1)
  return cloneTravelData(validateTravelData(backup.data))
}
