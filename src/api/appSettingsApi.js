import { API_BASE_URL, joinApiPath } from './client.js'

export const APP_SETTINGS_API_PATH = '/api/app-settings'

// REMOTE 동기화 허용 설정 key
export const REMOTE_APP_SETTING_KEYS = [
  'language',
  'theme',
  'startModule',
  'hudEffect',
]

// App Settings API URL 결합
export const getAppSettingsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, APP_SETTINGS_API_PATH)

// App Settings 단건 URL 결합
export const getAppSettingUrl = (key, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${APP_SETTINGS_API_PATH}/${encodeURIComponent(key)}`)

// App Settings API JSON 응답 읽기
const readJsonResponse = async (response) => {
  // 삭제/빈 응답 호환
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// App Settings API 요청 공통 처리
const requestAppSettingsApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    // 백엔드 오류 메시지 우선 사용
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ??
        `App Settings API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

// 공통 설정 전체 조회
export const fetchRemoteAppSettings = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestAppSettingsApi(getAppSettingsUrl(baseUrl), {}, fetcher)

// 공통 설정 전체 저장
export const saveRemoteAppSettings = (
  settings,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestAppSettingsApi(
    getAppSettingsUrl(baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    },
    fetcher,
  )

// 공통 설정 단건 조회
export const fetchRemoteAppSetting = (
  key,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestAppSettingsApi(getAppSettingUrl(key, baseUrl), {}, fetcher)

// 공통 설정 단건 저장
export const saveRemoteAppSetting = (
  key,
  valueJson,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestAppSettingsApi(
    getAppSettingUrl(key, baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueJson }),
    },
    fetcher,
  )
