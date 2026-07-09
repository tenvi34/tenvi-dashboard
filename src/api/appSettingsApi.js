import { API_BASE_URL, joinApiPath } from './client.js'

export const APP_SETTINGS_API_PATH = '/api/app-settings'

export const REMOTE_APP_SETTING_KEYS = [
  'language',
  'theme',
  'startModule',
  'hudEffect',
]

export const getAppSettingsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, APP_SETTINGS_API_PATH)

export const getAppSettingUrl = (key, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${APP_SETTINGS_API_PATH}/${encodeURIComponent(key)}`)

const readJsonResponse = async (response) => {
  if (response.status === 204) {
    return null
  }

  return response.json()
}

const requestAppSettingsApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ??
        `App Settings API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

export const fetchRemoteAppSettings = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestAppSettingsApi(getAppSettingsUrl(baseUrl), {}, fetcher)

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

export const fetchRemoteAppSetting = (
  key,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestAppSettingsApi(getAppSettingUrl(key, baseUrl), {}, fetcher)

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
