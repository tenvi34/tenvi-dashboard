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

// 검색 메모리 캐시
export const clearPlaceSearchCache = () => {
  cache.clear()
  lastRequestTime = 0
}

// Nominatim provider 계약
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
