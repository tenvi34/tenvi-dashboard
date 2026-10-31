import { filterTravelPlaces } from './travelLogic.js'

// 검색 범위에 주소까지 포함. 결과 수 감소 시 빈 페이지 대신 마지막 유효 페이지 표시
export const paginateTravelPlaces = (
  data,
  { filter = 'all', query = '', page = 1, pageSize = 8 } = {},
) => {
  const search = query.trim().toLocaleLowerCase()
  const places = filterTravelPlaces(data, filter).filter((place) =>
    [place.name, place.region, place.address, place.memo].some((value) =>
      (value || '').toLocaleLowerCase().includes(search),
    ),
  )
  const size = Math.max(1, Math.floor(pageSize) || 8)
  const pages = Math.max(1, Math.ceil(places.length / size))
  const current = Math.max(1, Math.min(pages, Math.floor(page) || 1))

  return {
    items: places.slice((current - 1) * size, current * size),
    total: places.length,
    page: current,
    pages,
  }
}

// 긴 여행도 선택 DAY 주변의 버튼만 렌더하고 전체 DAY는 select로 접근
export const visibleTravelDays = (days, day) => {
  const start = Math.max(1, Math.min(day - 3, days - 6))

  return Array.from({ length: Math.min(7, days) }, (_, index) => start + index)
}
