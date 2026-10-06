import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getDaySchedules, getTravelDayDate, hasPlaceLocation, importTravelJson } from '../../src/modules/travel/travelLogic.js'

// 사용자 전달 파일을 실제 가져오기 경로로 검사. 앱의 기본 여행 데이터로 사용하지 않음
const json = readFileSync(new URL('./tokyo-2027.json', import.meta.url), 'utf8')

describe('Tokyo itinerary import file', () => {
  it('imports all supplied dates and start times in their original order', () => {
    const data = importTravelJson(json)
    const times = [
      ['15:00', '15:30', '16:15', '16:45', '17:30', '19:00', '20:00'],
      ['10:00', '12:30', '13:30', '16:30', '19:00'],
      ['08:15', '09:30', '10:30', '12:00', '14:00', '15:00', '17:00', '19:15'],
      ['10:00', '11:00', '12:30', '13:30', '15:00', '17:00', '17:45', '18:30'],
      ['11:15', '14:00'],
    ]
    expect(data.schedules).toHaveLength(30)
    times.forEach((expected, index) => {
      expect(getDaySchedules(data, index + 1).map((item) => item.startTime)).toEqual(expected)
      expect(getTravelDayDate(data.trip, index + 1)).toBe(`2027-02-0${index + 3}`)
    })
  })
  it('keeps uncertain details empty and preserves optional stops and the explicit stay duration', () => {
    const data = importTravelJson(json)
    expect(data.places).toHaveLength(19)
    expect(data.places.filter(hasPlaceLocation)).toHaveLength(19)
    // 가져오기 과정에서 좌표가 유지되어 여행 지도에 표시되는지 확인
    for (const place of data.places) {
      expect(place.latitude).toBeGreaterThan(35)
      expect(place.latitude).toBeLessThan(36)
      expect(place.longitude).toBeGreaterThan(139)
      expect(place.longitude).toBeLessThan(141)
      expect(place.provider).toBe('reference')
      expect(place.providerPlaceId).toMatch(/^https:\/\//)
    }
    expect(data.places.find((place) => place.name === '나리타 공항').memo).toContain('탑승 터미널')
    expect(data.settings.lodgingPlaceId).toBeNull()
    expect(data.places.filter((place) => place.priority === 'optional').map((place) => place.name)).toEqual(['에노시마 전망대', '가샤폰 백화점'])
    expect(data.schedules.find((item) => item.title === '타바타역 남쪽 출구').durationMinutes).toBe(30)
    expect(data.schedules.filter((item) => item.durationMinutes !== null)).toHaveLength(1)
  })
  it('imports as a new independent trip with all place references intact', () => {
    const first = importTravelJson(json)
    const second = importTravelJson(json)
    expect(first.trip.id).not.toBe(second.trip.id)
    const placeIds = new Set(first.places.map((place) => place.id))
    expect(first.schedules.every((item) => item.placeId === null || placeIds.has(item.placeId))).toBe(true)
    expect(second.places.every((place) => !placeIds.has(place.id))).toBe(true)
  })
})
