import { API_BASE_URL, joinApiPath } from './client.js'

export const HEALTH_API_PATH = '/api/health'

// Health API 실제 호출 URL
export const getBackendHealthUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, HEALTH_API_PATH)

// 백엔드 연결 상태 확인 전용 호출
export const fetchBackendHealth = async ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => {
  const response = await fetcher(getBackendHealthUrl(baseUrl))

  if (!response.ok) {
    throw new Error(`Health API request failed with ${response.status}`)
  }

  return response.json()
}
