import { API_BASE_URL, joinApiPath } from './client.js'

export const CALENDAR_EVENTS_API_PATH = '/api/calendar/events'

// Calendar API URL 결합
export const getCalendarEventsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, CALENDAR_EVENTS_API_PATH)

// Calendar 이벤트 단건 URL 결합
export const getCalendarEventUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${CALENDAR_EVENTS_API_PATH}/${encodeURIComponent(id)}`)

// Calendar API JSON 응답 읽기
const readJsonResponse = async (response) => {
  // 삭제 응답 본문 없음
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Calendar API 요청 공통 처리
const requestCalendarApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    // 백엔드 오류 메시지 우선 사용
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ??
        `Calendar API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

// Calendar 이벤트 목록 조회
export const fetchCalendarEvents = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestCalendarApi(getCalendarEventsUrl(baseUrl), {}, fetcher)

// Calendar 이벤트 단건 조회
export const fetchCalendarEvent = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestCalendarApi(getCalendarEventUrl(id, baseUrl), {}, fetcher)

// Calendar 이벤트 원격 생성
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

// Calendar 이벤트 원격 수정
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

// Calendar 이벤트 원격 삭제
export const deleteRemoteCalendarEvent = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestCalendarApi(getCalendarEventUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
