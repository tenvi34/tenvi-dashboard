import { API_BASE_URL, joinApiPath } from './client.js'

export const MAP_RECORDS_API_PATH = '/api/map/records'
export const MAP_COLLECTIONS_API_PATH = '/api/map/collections'

// Map record API URL 결합
const getMapRecordsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, MAP_RECORDS_API_PATH)

// Map record 단건 URL 결합
const getMapRecordUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${MAP_RECORDS_API_PATH}/${encodeURIComponent(id)}`)

// Map 컬렉션 목록 URL 결합
const getMapCollectionsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, MAP_COLLECTIONS_API_PATH)

// Map 컬렉션 단건 URL 결합
const getMapCollectionUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${MAP_COLLECTIONS_API_PATH}/${encodeURIComponent(id)}`)

// Map API JSON 응답 읽기
const readJsonResponse = async (response) => {
  // 삭제 응답 본문 없음
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Map API 요청 공통 처리
const requestMapApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    // 백엔드 오류 메시지 우선 사용
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Map API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

// Map record 목록 조회
export const fetchMapRecords = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestMapApi(getMapRecordsUrl(baseUrl), {}, fetcher)

// Map record 단건 조회
export const fetchMapRecord = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestMapApi(getMapRecordUrl(id, baseUrl), {}, fetcher)

// Map record 원격 생성
export const createRemoteMapRecord = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestMapApi(
    getMapRecordsUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// Map record 원격 수정
export const updateRemoteMapRecord = (
  id,
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestMapApi(
    getMapRecordUrl(id, baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// Map record 원격 삭제
export const deleteRemoteMapRecord = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestMapApi(getMapRecordUrl(id, baseUrl), { method: 'DELETE' }, fetcher)

// Map 컬렉션 목록 조회
export const fetchMapCollections = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestMapApi(getMapCollectionsUrl(baseUrl), {}, fetcher)

// Map 컬렉션 단건 조회
export const fetchMapCollection = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestMapApi(getMapCollectionUrl(id, baseUrl), {}, fetcher)

// Map 컬렉션 원격 생성
export const createRemoteMapCollection = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestMapApi(
    getMapCollectionsUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// Map 컬렉션 원격 수정
export const updateRemoteMapCollection = (
  id,
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestMapApi(
    getMapCollectionUrl(id, baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// Map 컬렉션 원격 삭제
export const deleteRemoteMapCollection = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestMapApi(getMapCollectionUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
