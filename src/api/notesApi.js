import { API_BASE_URL, joinApiPath } from './client.js'

export const NOTES_API_PATH = '/api/notes'

// Notes API URL 결합
export const getNotesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, NOTES_API_PATH)

// Note 단건 URL 결합
export const getNoteUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${NOTES_API_PATH}/${encodeURIComponent(id)}`)

// Notes API JSON 응답 읽기
const readJsonResponse = async (response) => {
  // 삭제 응답 본문 없음
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Notes API 요청 공통 처리
const requestNotesApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    // 백엔드 오류 메시지 우선 사용
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Notes API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

// Notes 목록 조회
export const fetchNotes = ({ baseUrl = API_BASE_URL, fetcher = fetch } = {}) =>
  requestNotesApi(getNotesUrl(baseUrl), {}, fetcher)

// Note 단건 조회
export const fetchNote = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestNotesApi(getNoteUrl(id, baseUrl), {}, fetcher)

// Note 원격 생성
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

// Note 원격 수정
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

// Note 원격 삭제
export const deleteRemoteNote = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestNotesApi(getNoteUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
