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
// Map/Travel 동시 호출도 하나의 큐에서 처리하여 요청 간격 유지
let searchQueue = Promise.resolve()

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

// 검색 캐시 key
const getCacheKey = (query, language, countryCode) =>
  `${query.trim().toLowerCase()}::${language}::${countryCode}`

// Nominatim 국가 코드
export const getCountryCodeForSearchScope = (scope) =>
  PLACE_SEARCH_SCOPES[scope] ?? PLACE_SEARCH_SCOPES.all

// Nominatim 주소 요약
export const createAddressSummary = (address = {}) =>
  [
    address.suburb,
    address.city || address.town || address.village,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(', ')

// Nominatim 결과 정규화
export const normalizePlaceSearchResult = (result) => {
  const latitude = Number(result?.lat)
  const longitude = Number(result?.lon)
  const displayName = String(result?.display_name ?? '').trim()

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !displayName) {
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

// 검색 메모리 캐시
export const clearPlaceSearchCache = () => {
  cache.clear()
  lastRequestTime = 0
}

// Nominatim provider 계약
const executePlaceSearch = async (
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
    // Nominatim 요청 제한
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
  // 실패한 요청도 제한에 포함되도록 시작 시각 기록
  lastRequestTime = Date.now()
  const response = await fetcher(`${NOMINATIM_SEARCH_URL}?${searchParams}`, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'Accept-Language': language,
    },
  })

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

export const searchPlaces = (query, options) => {
  const request = searchQueue.then(() => executePlaceSearch(query, options))
  // 실패한 요청이 다음 검색을 막지 않도록 큐 복구
  searchQueue = request.catch(() => {})
  return request
}
