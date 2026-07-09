import { API_BASE_URL, joinApiPath } from './client.js'

export const BOARD_POSTS_API_PATH = '/api/board/posts'
export const BOARD_CATEGORIES_API_PATH = '/api/board/categories'
export const BOARD_IMAGES_API_PATH = '/api/board/images'

// Board API URL 결합
export const getBoardPostsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, BOARD_POSTS_API_PATH)

// Board 게시글 단건 URL 결합
export const getBoardPostUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}`)

// Board 휴지통 목록 URL 결합
export const getTrashBoardPostsUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_POSTS_API_PATH}/trash`)

// Board 게시글 복원 URL 결합
export const getBoardPostRestoreUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(
    baseUrl,
    `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}/restore`,
  )

// Board 조회수 증가 URL 결합
export const getBoardPostViewsUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(
    baseUrl,
    `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}/views`,
  )

// Board 영구 삭제 URL 결합
export const getBoardPostPermanentUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(
    baseUrl,
    `${BOARD_POSTS_API_PATH}/${encodeURIComponent(id)}/permanent`,
  )

// Board 카테고리 목록 URL 결합
export const getBoardCategoriesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, BOARD_CATEGORIES_API_PATH)

// Board 카테고리 단건 URL 결합
export const getBoardCategoryUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_CATEGORIES_API_PATH}/${encodeURIComponent(id)}`)

// Board 이미지 목록 URL 결합
export const getBoardImagesUrl = (baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, BOARD_IMAGES_API_PATH)

// Board 이미지 단건 URL 결합
export const getBoardImageUrl = (id, baseUrl = API_BASE_URL) =>
  joinApiPath(baseUrl, `${BOARD_IMAGES_API_PATH}/${encodeURIComponent(id)}`)

// Board API JSON 응답 읽기
const readJsonResponse = async (response) => {
  // 삭제 응답 본문 없음
  if (response.status === 204) {
    return null
  }

  return response.json()
}

// Board API 요청 공통 처리
const requestBoardApi = async (url, options = {}, fetcher = fetch) => {
  const response = await fetcher(url, options)

  if (!response.ok) {
    // 백엔드 오류 메시지 우선 사용
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

// Board 게시글 soft delete
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

// Board 게시글 영구 삭제
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

// Board 카테고리 목록 조회
export const fetchBoardCategories = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestBoardApi(getBoardCategoriesUrl(baseUrl), {}, fetcher)

// Board 카테고리 단건 조회
export const fetchBoardCategory = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardCategoryUrl(id, baseUrl), {}, fetcher)

// Board 카테고리 생성
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

// Board 카테고리 수정
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

// Board 카테고리 삭제
export const deleteBoardCategory = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardCategoryUrl(id, baseUrl), { method: 'DELETE' }, fetcher)

// Board 이미지 목록 조회
export const fetchBoardImages = ({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
} = {}) => requestBoardApi(getBoardImagesUrl(baseUrl), {}, fetcher)

// Board 이미지 단건 조회
export const fetchBoardImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardImageUrl(id, baseUrl), {}, fetcher)

// Board 이미지 생성
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

// Board 이미지 삭제
export const deleteBoardImage = (
  id,
  { baseUrl = API_BASE_URL, fetcher = fetch } = {},
) => requestBoardApi(getBoardImageUrl(id, baseUrl), { method: 'DELETE' }, fetcher)
