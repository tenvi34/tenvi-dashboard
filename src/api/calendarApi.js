import { API_BASE_URL, joinApiPath } from './client.js'

export const CALENDAR_EVENTS_API_PATH = '/api/calendar/events'

export const getCalendarEventsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, CALENDAR_EVENTS_API_PATH)

export const getCalendarEventUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${CALENDAR_EVENTS_API_PATH}/${encodeURIComponent(id)}`)

const readJsonResponse = async (response) => {
  if (response.status === 204) {
    return null
  }

  return response.json()
}

const requestCalendarApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ??
        `Calendar API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

export const fetchCalendarEvents = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestCalendarApi(getCalendarEventsUrl(baseUrl), {}, fetcher)

export const fetchCalendarEvent = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestCalendarApi(getCalendarEventUrl(id, baseUrl), {}, fetcher)

export const createRemoteCalendarEvent = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestCalendarApi(
    getCalendarEventsUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const updateRemoteCalendarEvent = (
  id,
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestCalendarApi(
    getCalendarEventUrl(id, baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const deleteRemoteCalendarEvent = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestCalendarApi(getCalendarEventUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
