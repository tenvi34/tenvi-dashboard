import { API_BASE_URL, joinApiPath } from './client.js'

export const MAP_RECORDS_API_PATH = '/api/map/records'
export const MAP_COLLECTIONS_API_PATH = '/api/map/collections'

const getMapRecordsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, MAP_RECORDS_API_PATH)

const getMapRecordUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${MAP_RECORDS_API_PATH}/${encodeURIComponent(id)}`)

const getMapCollectionsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, MAP_COLLECTIONS_API_PATH)

const getMapCollectionUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${MAP_COLLECTIONS_API_PATH}/${encodeURIComponent(id)}`)

const readJsonResponse = async (response) => {
  if (response.status === 204) {
    return null
  }

  return response.json()
}

const requestMapApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Map API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

export const fetchMapRecords = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestMapApi(getMapRecordsUrl(baseUrl), {}, fetcher)

export const fetchMapRecord = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestMapApi(getMapRecordUrl(id, baseUrl), {}, fetcher)

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

export const deleteRemoteMapRecord = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestMapApi(getMapRecordUrl(id, baseUrl), { method: 'DELETE' }, fetcher)

export const fetchMapCollections = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestMapApi(getMapCollectionsUrl(baseUrl), {}, fetcher)

export const fetchMapCollection = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestMapApi(getMapCollectionUrl(id, baseUrl), {}, fetcher)

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

export const deleteRemoteMapCollection = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestMapApi(getMapCollectionUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
