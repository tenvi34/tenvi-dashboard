import { API_BASE_URL, joinApiPath } from './client.js'

export const PROFILE_API_PATH = '/api/profile'
export const PROFILE_IMAGES_API_PATH = '/api/profile/images'

export const getProfileUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, PROFILE_API_PATH)

export const getProfileImagesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, PROFILE_IMAGES_API_PATH)

export const getProfileImageUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${PROFILE_IMAGES_API_PATH}/${encodeURIComponent(id)}`)

const readJsonResponse = async (response) => {
  if (response.status === 204) {
    return null
  }

  return response.json()
}

const requestProfileApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Profile API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

export const fetchRemoteProfile = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestProfileApi(getProfileUrl(baseUrl), {}, fetcher)

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

export const fetchProfileImages = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestProfileApi(getProfileImagesUrl(baseUrl), {}, fetcher)

export const fetchProfileImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestProfileApi(getProfileImageUrl(id, baseUrl), {}, fetcher)

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

export const deleteRemoteProfileImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestProfileApi(getProfileImageUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
