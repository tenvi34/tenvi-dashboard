import { API_BASE_URL, joinApiPath } from './client.js'

export const TEST_ECHO_API_PATH = '/api/test/echo'

// Echo API 실제 호출 URL
export const getTestEchoUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, TEST_ECHO_API_PATH)

// 프론트-백엔드 POST 연결 테스트 호출
export const fetchTestEcho = async ({
  message,
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => {
  const response = await fetcher(getTestEchoUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Echo API request failed with ${response.status}`,
    )
  }

  return response.json()
}
