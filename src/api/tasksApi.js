import { API_BASE_URL, joinApiPath } from './client.js'

export const TASKS_API_PATH = '/api/tasks'

export const getTasksUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, TASKS_API_PATH)

export const getTaskUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${TASKS_API_PATH}/${encodeURIComponent(id)}`)

const readJsonResponse = async (response) => {
  if (response.status === 204) {
    return null
  }

  return response.json()
}

const requestTasksApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Tasks API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

export const fetchTasks = ({ baseUrl = API_BASE_URL, fetcher = fetch } = {}) =>
  requestTasksApi(getTasksUrl(baseUrl), {}, fetcher)

export const fetchTask = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestTasksApi(getTaskUrl(id, baseUrl), {}, fetcher)

export const createRemoteTask = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestTasksApi(
    getTasksUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const updateRemoteTask = (
  id,
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestTasksApi(
    getTaskUrl(id, baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const deleteRemoteTask = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestTasksApi(getTaskUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
