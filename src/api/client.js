export const DEFAULT_API_BASE_URL = 'http://localhost:5032'

// Vite 환경변수 누락 시 로컬 백엔드 주소 유지
// API base URL 결정
export const getApiBaseUrl = (env = import.meta.env) => {
  const configuredUrl = env?.VITE_API_BASE_URL?.trim()

  return configuredUrl || DEFAULT_API_BASE_URL
}

// 중복 slash로 endpoint가 깨지지 않도록 base/path 결합
// API path 결합
export const joinApiPath = (baseUrl, path) =>
  `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`

export const API_BASE_URL = getApiBaseUrl()
