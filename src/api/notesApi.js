import { API_BASE_URL, joinApiPath } from './client.js'

export const NOTES_API_PATH = '/api/notes'

export const getNotesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, NOTES_API_PATH)

export const getNoteUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${NOTES_API_PATH}/${encodeURIComponent(id)}`)

const readJsonResponse = async (response) => {
  if (response.status === 204) {
    return null
  }

  return response.json()
}

const requestNotesApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Notes API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

export const fetchNotes = ({ baseUrl = API_BASE_URL, fetcher = fetch } = {}) =>
  requestNotesApi(getNotesUrl(baseUrl), {}, fetcher)

export const fetchNote = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestNotesApi(getNoteUrl(id, baseUrl), {}, fetcher)

export const createRemoteNote = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestNotesApi(
    getNotesUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const updateRemoteNote = (
  id,
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestNotesApi(
    getNoteUrl(id, baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const deleteRemoteNote = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestNotesApi(getNoteUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
