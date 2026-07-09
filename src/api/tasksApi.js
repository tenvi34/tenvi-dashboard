import { API_BASE_URL, joinApiPath } from './client.js'

export const TASKS_API_PATH = '/api/tasks'

// Tasks API URL 결합
export const getTasksUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, TASKS_API_PATH)

// Task 단건 URL 결합
export const getTaskUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${TASKS_API_PATH}/${encodeURIComponent(id)}`)

// Tasks API JSON 응답 읽기
const readJsonResponse = async (response) => {
  // 삭제 응답 본문 없음
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Tasks API 요청 공통 처리
const requestTasksApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    // 백엔드 오류 메시지 우선 사용
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Tasks API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

// Tasks 목록 조회
export const fetchTasks = ({ baseUrl = API_BASE_URL, fetcher = fetch } = {}) =>
  requestTasksApi(getTasksUrl(baseUrl), {}, fetcher)

// Task 단건 조회
export const fetchTask = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestTasksApi(getTaskUrl(id, baseUrl), {}, fetcher)

// Task 원격 생성
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

// Task 원격 수정
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

// Task 원격 삭제
export const deleteRemoteTask = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestTasksApi(getTaskUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
