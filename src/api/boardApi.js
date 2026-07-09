import { API_BASE_URL, joinApiPath } from './client.js'

export const BOARD_POSTS_API_PATH = '/api/board/posts'
export const BOARD_CATEGORIES_API_PATH = '/api/board/categories'
export const BOARD_IMAGES_API_PATH = '/api/board/images'

// Board API URL 결합
export const getBoardPostsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, BOARD_POSTS_API_PATH)

export const getBoardPostUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}`)

export const getTrashBoardPostsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_POSTS_API_PATH}/trash`)

export const getBoardPostRestoreUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(
    baseUrl,
    `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}/restore`,
  )

export const getBoardPostViewsUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(
    baseUrl,
    `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}/views`,
  )

export const getBoardPostPermanentUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(
    baseUrl,
    `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}/permanent`,
  )

export const getBoardCategoriesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, BOARD_CATEGORIES_API_PATH)

export const getBoardCategoryUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_CATEGORIES_API_PATH}/${encodeURIComponent(id)}`)

export const getBoardImagesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, BOARD_IMAGES_API_PATH)

export const getBoardImageUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_IMAGES_API_PATH}/${encodeURIComponent(id)}`)

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

// Board 휴지통 게시글 목록 조회
export const fetchTrashBoardPosts = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestBoardApi(getTrashBoardPostsUrl(baseUrl), {}, fetcher)

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
export const softDeleteBoardPost = (
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

// 기존 테스트 UI 호환용 별칭
export const deleteBoardPost = softDeleteBoardPost

// Board 게시글 복구
export const restoreBoardPost = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardPostRestoreUrl(id, baseUrl),
    {
      method: 'PATCH',
    },
    fetcher,
  )

// Board 게시글 영구 삭제
// Board 게시글 조회수 증가
export const increaseBoardPostViews = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardPostViewsUrl(id, baseUrl),
    {
      method: 'PATCH',
    },
    fetcher,
  )

export const permanentlyDeleteBoardPost = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardPostPermanentUrl(id, baseUrl),
    {
      method: 'DELETE',
    },
    fetcher,
  )

export const fetchBoardCategories = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestBoardApi(getBoardCategoriesUrl(baseUrl), {}, fetcher)

export const fetchBoardCategory = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardCategoryUrl(id, baseUrl), {}, fetcher)

export const createBoardCategory = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardCategoriesUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const updateBoardCategory = (
  id,
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardCategoryUrl(id, baseUrl),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const deleteBoardCategory = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardCategoryUrl(id, baseUrl), { method: 'DELETE' }, fetcher)

export const fetchBoardImages = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestBoardApi(getBoardImagesUrl(baseUrl), {}, fetcher)

export const fetchBoardImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardImageUrl(id, baseUrl), {}, fetcher)

export const createBoardImage = (
  payload,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) =>
  requestBoardApi(
    getBoardImagesUrl(baseUrl),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    fetcher,
  )

export const deleteBoardImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardImageUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
