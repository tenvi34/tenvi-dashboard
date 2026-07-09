import { STORAGE_KEYS } from '../../../constants/storageKeys.js'
import {
  createBoardPost,
  deleteBoardPost,
  increaseBoardPostViews,
  moveBoardPostToTrash,
  parseBoardPosts,
  restoreBoardPost,
  updateBoardPost,
} from '../../boardLogic.js'

const DEFAULT_STORAGE_KEY = STORAGE_KEYS.boardPosts

// 기본 브라우저 저장소 참조
const getDefaultStorage = () => globalThis.localStorage

// localStorage Board 원본 배열 복원
const readPosts = (storage, storageKey) => {
  try {
    const rawPosts = storage?.getItem(storageKey)

    return rawPosts ? parseBoardPosts(rawPosts) : []
  } catch {
    return []
  }
}

// 기존 tenvi.board.posts 저장 형식 보존
const writePosts = (storage, storageKey, posts) => {
  storage?.setItem(storageKey, JSON.stringify(posts))
}

// 게시글 id 검색
const findPost = (posts, postId) => posts.find((post) => post.id === postId) ?? null

// 요청 필드 보정
const withRequestFields = (post, payload = {}) => ({
  ...post,
  ...(payload.pinned !== undefined ? { pinned: Boolean(payload.pinned) } : {}),
  ...(payload.views !== undefined ? { views: Math.max(0, Number(payload.views) || 0) } : {}),
})

// Board LOCAL repository 생성
export const createLocalBoardPostRepository = ({
  storage = getDefaultStorage(),
  storageKey = DEFAULT_STORAGE_KEY,
} = {}) => {
  // 저장소 접근 경로 주입 가능
  const loadPosts = () => readPosts(storage, storageKey)
  const savePosts = (posts) => writePosts(storage, storageKey, posts)

  return {
    // useBoardPosts의 기존 전체 배열 상태 호환용
    fetchAllPosts() {
      return loadPosts()
    },

    // 활성 게시글 목록 조회
    async fetchPosts() {
      return loadPosts().filter((post) => !post.deletedAt)
    },

    // 휴지통 게시글 목록 조회
    async fetchTrashPosts() {
      return loadPosts().filter((post) => post.deletedAt)
    },

    // setPosts(updater) 리팩터링 전환용 전체 저장
    replacePosts(posts) {
      const nextPosts = Array.isArray(posts) ? posts : []
      savePosts(nextPosts)

      return nextPosts
    },

    // LOCAL 게시글 생성
    async createPost(payload) {
      const createdPost = createBoardPost(payload)

      if (!createdPost) {
        throw new Error('Board post title and body are required.')
      }

      const post = withRequestFields(createdPost, payload)
      savePosts([post, ...loadPosts()])

      return post
    },

    // LOCAL 게시글 수정
    async updatePost(id, payload) {
      const currentPosts = loadPosts()
      const beforePost = findPost(currentPosts, id)

      if (!beforePost) {
        throw new Error('Board post not found.')
      }

      const updatedPosts = updateBoardPost(currentPosts, id, payload)

      if (updatedPosts === currentPosts) {
        throw new Error('Board post title and body are required.')
      }

      const nextPosts = updatedPosts.map((post) =>
        post.id === id ? withRequestFields(post, payload) : post,
      )
      const updatedPost = findPost(nextPosts, id)
      savePosts(nextPosts)

      return updatedPost
    },

    // LOCAL 게시글 휴지통 이동
    async softDeletePost(id) {
      const currentPosts = loadPosts()

      if (!findPost(currentPosts, id)) {
        throw new Error('Board post not found.')
      }

      savePosts(moveBoardPostToTrash(currentPosts, id))

      return null
    },

    // LOCAL 휴지통 게시글 복원
    async restorePost(id) {
      const currentPosts = loadPosts()

      if (!findPost(currentPosts, id)) {
        throw new Error('Board post not found.')
      }

      const nextPosts = restoreBoardPost(currentPosts, id)
      const restoredPost = findPost(nextPosts, id)
      savePosts(nextPosts)

      return restoredPost
    },

    // LOCAL 게시글 영구 삭제
    async permanentlyDeletePost(id) {
      const currentPosts = loadPosts()

      if (!findPost(currentPosts, id)) {
        throw new Error('Board post not found.')
      }

      savePosts(deleteBoardPost(currentPosts, id))

      return null
    },

    // LOCAL 조회수 증가
    async increaseViews(id) {
      const currentPosts = loadPosts()
      const beforePost = findPost(currentPosts, id)

      if (!beforePost || beforePost.deletedAt) {
        throw new Error('Board post not found.')
      }

      const nextPosts = increaseBoardPostViews(currentPosts, id)
      const viewedPost = findPost(nextPosts, id)
      savePosts(nextPosts)

      return viewedPost
    },
  }
}

export const localBoardPostRepository = createLocalBoardPostRepository()
