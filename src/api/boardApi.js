import { API_BASE_URL, joinApiPath } from './client.js'

export const BOARD_POSTS_API_PATH = '/api/board/posts'

// Board API URL 결합
export const getBoardPostsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, BOARD_POSTS_API_PATH)

export const getBoardPostUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}`)

const readJsonResponse = async (response) => {
  if (response.status === 204) {
    return null
  }

  return response.json()
}

const requestBoardApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)

    throw new Error(
      errorData?.message ?? `Board API request failed with ${response.status}`,
    )
  }

  return readJsonResponse(response)
}

// Board 게시글 목록 조회
export const fetchBoardPosts = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestBoardApi(getBoardPostsUrl(baseUrl), {}, fetcher)

// Board 게시글 단건 조회
export const fetchBoardPost = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardPostUrl(id, baseUrl), {}, fetcher)

// Board 게시글 생성
export const createBoardPost = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardPostsUrl(baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// Board 게시글 수정
export const updateBoardPost = (
  id,
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardPostUrl(id, baseUrl),
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

// Board 게시글 삭제
export const deleteBoardPost = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardPostUrl(id, baseUrl),
    {
      method: 'DELETE',
    },
    fetcher,
  )
