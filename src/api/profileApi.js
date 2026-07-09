import { API_BASE_URL, joinApiPath } from './client.js'

export const PROFILE_API_PATH = '/api/profile'
export const PROFILE_IMAGES_API_PATH = '/api/profile/images'

// Profile API URL 결합
export const getProfileUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, PROFILE_API_PATH)

// 프로필 이미지 목록 URL 결합
export const getProfileImagesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, PROFILE_IMAGES_API_PATH)

// 프로필 이미지 단건 URL 결합
export const getProfileImageUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${PROFILE_IMAGES_API_PATH}/${encodeURIComponent(id)}`)

// Profile API JSON 응답 읽기
const readJsonResponse = async (response) => {
  // 삭제 응답 본문 없음
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Profile API 요청 공통 처리
const requestProfileApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    // 백엔드 오류 메시지 우선 사용
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Profile API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

// 프로필 조회
export const fetchRemoteProfile = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestProfileApi(getProfileUrl(baseUrl), {}, fetcher)

// 프로필 저장
export const saveRemoteProfile = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestProfileApi(
    getProfileUrl(baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// 프로필 이미지 목록 조회
export const fetchProfileImages = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestProfileApi(getProfileImagesUrl(baseUrl), {}, fetcher)

// 프로필 이미지 단건 조회
export const fetchProfileImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestProfileApi(getProfileImageUrl(id, baseUrl), {}, fetcher)

// 프로필 이미지 생성
export const createRemoteProfileImage = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestProfileApi(
    getProfileImagesUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// 프로필 이미지 삭제
export const deleteRemoteProfileImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestProfileApi(getProfileImageUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
