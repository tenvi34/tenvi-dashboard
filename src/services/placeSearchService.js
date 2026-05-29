const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
const SEARCH_LIMIT = 5
const MIN_REQUEST_INTERVAL = 1000
export const PLACE_SEARCH_SCOPES = {
  all: '',
  japan: 'jp',
  korea: 'kr',
}
const cache = new Map()
let lastRequestTime = 0

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

// 검색어, 언어, 국가 범위를 포함한 캐시 키 생성
const getCacheKey = (query, language, countryCode) =>
  `${query.trim().toLowerCase()}::${language}::${countryCode}`

// 검색 UI의 범위 선택값을 Nominatim countrycodes 값으로 변환
export const getCountryCodeForSearchScope = (scope) =>
  PLACE_SEARCH_SCOPES[scope] ?? PLACE_SEARCH_SCOPES.all

// Nominatim 주소 객체를 결과 목록에 표시할 짧은 주소로 정리
export const createAddressSummary = (address = {}) =>
  [
    address.suburb,
    address.city || address.town || address.village,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(', ')

// Nominatim 응답을 TENVI 내부 검색 결과 구조로 정규화
export const normalizePlaceSearchResult = (result) => {
  const latitude = Number(result?.lat)
  const longitude = Number(result?.lon)
  const displayName = String(result?.display_name ?? '').trim()

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !displayName) {
    return null
  }

  return {
    addressSummary: createAddressSummary(result.address),
    category: String(result.category ?? result.class ?? '').trim(),
    displayName,
    extratags: result.extratags ?? {},
    id: String(result.place_id ?? `${latitude},${longitude}`),
    latitude,
    longitude,
    name: String(result.name || displayName.split(',')[0]).trim(),
    namedetails: result.namedetails ?? {},
    provider: 'nominatim',
    type: String(result.type ?? '').trim(),
  }
}

// 검색어와 언어별 메모리 캐시로 동일 요청 반복 방지
export const clearPlaceSearchCache = () => {
  cache.clear()
  lastRequestTime = 0
}

// 공개 Nominatim API 호출을 한 곳에 모은 provider 교체용 함수 계약
export const searchPlaces = async (
  query,
  { fetcher = fetch, language = 'en', scope = 'all' } = {},
) => {
  const normalizedQuery = query.trim()
  const countryCode = getCountryCodeForSearchScope(scope)

  if (!normalizedQuery) {
    return []
  }

  const cacheKey = getCacheKey(normalizedQuery, language, countryCode)

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const elapsedTime = Date.now() - lastRequestTime

  if (elapsedTime < MIN_REQUEST_INTERVAL) {
    // 공개 무료 API 정책을 지키기 위한 앱 전체 초당 1회 요청 제한
    await wait(MIN_REQUEST_INTERVAL - elapsedTime)
  }

  const searchParams = new URLSearchParams({
    addressdetails: '1',
    extratags: '1',
    format: 'jsonv2',
    limit: String(SEARCH_LIMIT),
    namedetails: '1',
    q: normalizedQuery,
  })

  if (countryCode) {
    searchParams.set('countrycodes', countryCode)
  }
  const response = await fetcher(`${NOMINATIM_SEARCH_URL}?${searchParams}`, {
    headers: {
      'Accept-Language': language,
    },
  })

  lastRequestTime = Date.now()

  if (!response.ok) {
    throw new Error('Place search failed.')
  }

  const results = await response.json()
  const normalizedResults = results
    .map(normalizePlaceSearchResult)
    .filter(Boolean)
    .slice(0, SEARCH_LIMIT)

  cache.set(cacheKey, normalizedResults)

  return normalizedResults
}
