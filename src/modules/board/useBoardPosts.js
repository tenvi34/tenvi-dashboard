import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_BOARD_CATEGORY_ID,
  moveBoardPostsToCategoryFallback,
} from '../boardLogic.js'
import { readBoardStorageMode } from './boardStorageMode.js'
import { localBoardPostRepository } from './repositories/localBoardPostRepository.js'
import { remoteBoardPostRepository } from './repositories/remoteBoardPostRepository.js'

const REMOTE_ERROR_MESSAGE =
  'Board 서버에 연결할 수 없어 이번 화면에서는 Local 모드로 동작합니다.'
/* 이전 local 전용 구현 참고용 보존
const boardPostRepository = localBoardPostRepository

// Board 게시글 localStorage 복원
const loadBoardPosts = () => boardPostRepository.fetchAllPosts()

// 기존 Board 게시글 key 보존
const saveBoardPosts = (posts) => boardPostRepository.replacePosts(posts)

function useLegacyBoardPosts() {
  // 활성/휴지통 목록은 같은 posts 배열에서 deletedAt 기준으로 파생
  const [posts, setPosts] = useState(() => loadBoardPosts())
  const activePosts = posts.filter((post) => !post.deletedAt)
  const trashedPosts = posts.filter((post) => post.deletedAt)

  const updatePosts = (updater) => {
    setPosts((currentPosts) => {
      const nextPosts =
        typeof updater === 'function' ? updater(currentPosts) : updater

      // 상태 변경과 localStorage 저장을 한 경로로 묶어 누락 방지
      saveBoardPosts(nextPosts)

      return nextPosts
    })
  }

  const refreshPosts = () => {
    setPosts(loadBoardPosts())
  }

  const createPost = async (payload) => {
    const createdPost = await boardPostRepository.createPost(payload)

    refreshPosts()

    return createdPost
  }

  const updatePost = async (postId, payload) => {
    const updatedPost = await boardPostRepository.updatePost(postId, payload)

    refreshPosts()

    return updatedPost
  }

  const togglePostPinned = async (postId) => {
    const targetPost = boardPostRepository
      .fetchAllPosts()
      .find((post) => post.id === postId)

    if (!targetPost) {
      throw new Error('Board post not found.')
    }

    // 현재 편집 필드를 함께 전달해 pinned 외 게시글 데이터 보존
    const updatedPost = await boardPostRepository.updatePost(postId, {
      author: targetPost.author,
      title: targetPost.title,
      content: targetPost.content,
      categoryId: targetPost.categoryId,
      blocks: targetPost.blocks,
      pinned: targetPost.pinned !== true,
    })

    refreshPosts()

    return updatedPost
  }

  const movePostsToCategoryFallback = async (
    categoryId,
    fallbackCategoryId = DEFAULT_BOARD_CATEGORY_ID,
  ) => {
    const nextPosts = moveBoardPostsToCategoryFallback(
      boardPostRepository.fetchAllPosts(),
      categoryId,
      fallbackCategoryId,
    )

    boardPostRepository.replacePosts(nextPosts)
    refreshPosts()

    return nextPosts
  }

  const increasePostViews = async (postId) => {
    const viewedPost = await boardPostRepository.increaseViews(postId)

    // repository 처리 후 localStorage 스냅샷을 다시 읽어 화면 상태 동기화
    refreshPosts()

    refreshPosts()

    return viewedPost
  }

  const softDeletePost = async (postId) => {
    const result = await boardPostRepository.softDeletePost(postId)

    refreshPosts()

    return result
  }

  const restorePost = async (postId) => {
    const restoredPost = await boardPostRepository.restorePost(postId)

    refreshPosts()

    return restoredPost
  }

  const permanentlyDeletePost = async (postId) => {
    const result = await boardPostRepository.permanentlyDeletePost(postId)

    refreshPosts()

    return result
  }

  return {
    activePosts,
    createPost,
    increasePostViews,
    movePostsToCategoryFallback,
    permanentlyDeletePost,
    posts,
    restorePost,
    setPosts: updatePosts,
    softDeletePost,
    togglePostPinned,
    trashedPosts,
    updatePost,
  }
}

*/
// Board 게시글 저장소 컨트롤러
function useBoardPosts() {
  // Board 재진입 시 Settings에서 저장한 모드 반영
  const [storageMode] = useState(() => readBoardStorageMode())
  const repository = useMemo(
    () => storageMode === 'remote' ? remoteBoardPostRepository : localBoardPostRepository,
    [storageMode],
  )
  const [posts, setPostsState] = useState(() =>
    storageMode === 'local' ? localBoardPostRepository.fetchAllPosts() : [],
  )
  const [loading, setLoading] = useState(storageMode === 'remote')
  const [error, setError] = useState(null)
  const [isLocalFallback, setIsLocalFallback] = useState(false)
  // REMOTE 장애 시 LOCAL 저장소 사용
  const actionRepository = isLocalFallback
    ? localBoardPostRepository
    : repository

  // 원격 active/trash 응답을 기존 단일 posts 배열로 결합
  // active/trash 목록 동기화
  const refreshPosts = useCallback(async () => {
    if (storageMode === 'local') {
      setPostsState(localBoardPostRepository.fetchAllPosts())
      setError(null)
      return
    }

    setLoading(true)
    try {
      const [active, trash] = await Promise.all([
        repository.fetchPosts(),
        repository.fetchTrashPosts(),
      ])
      setPostsState([
        ...(Array.isArray(active) ? active : []),
        ...(Array.isArray(trash) ? trash : []),
      ])
      setError(null)
      setIsLocalFallback(false)
    } catch {
      // 서버 중단 시 빈 화면 대신 삭제하지 않은 로컬 스냅샷 유지
      setPostsState(localBoardPostRepository.fetchAllPosts())
      setError(REMOTE_ERROR_MESSAGE)
      setIsLocalFallback(true)
    } finally {
      setLoading(false)
    }
  }, [repository, storageMode])

  useEffect(() => {
    if (storageMode === 'remote') {
      // effect 본문과 원격 상태 갱신 분리
      void Promise.resolve().then(refreshPosts)
    }
  }, [refreshPosts, storageMode])

  // 저장 작업 후 목록 재조회
  const runAction = async (action) => {
    if (!isLocalFallback) setError(null)
    try {
      const result = await action()
      if (isLocalFallback) {
        setPostsState(localBoardPostRepository.fetchAllPosts())
      } else {
        await refreshPosts()
      }
      return result
    } catch (actionError) {
      if (storageMode === 'remote') setError(REMOTE_ERROR_MESSAGE)
      throw actionError
    }
  }

  // 원격에는 전체 치환 API가 없어 setPosts는 화면 상태 호환만 제공
  // legacy setPosts 호환 처리
  const setPosts = (updater) => {
    setPostsState((currentPosts) => {
      const value = typeof updater === 'function' ? updater(currentPosts) : updater
      const nextPosts = Array.isArray(value) ? value : []
      if (storageMode === 'local' || isLocalFallback) {
        localBoardPostRepository.replacePosts(nextPosts)
      }
      return nextPosts
    })
  }

  // 게시글 생성
  const createPost = (payload) => runAction(() => actionRepository.createPost(payload))

  // 게시글 수정
  const updatePost = (id, payload) => runAction(() => actionRepository.updatePost(id, payload))

  // 게시글 휴지통 이동
  const softDeletePost = (id) => runAction(() => actionRepository.softDeletePost(id))

  // 휴지통 게시글 복원
  const restorePost = (id) => runAction(() => actionRepository.restorePost(id))

  // 휴지통 게시글 영구 삭제
  const permanentlyDeletePost = (id) =>
    runAction(() => actionRepository.permanentlyDeletePost(id))

  // 게시글 조회수 증가
  const increasePostViews = (id) => runAction(() => actionRepository.increaseViews(id))

  // 게시글 상단 고정 토글
  const togglePostPinned = (id) => {
    const post = posts.find((item) => item.id === id)
    if (!post) return Promise.reject(new Error('Board post not found.'))
    return updatePost(id, {
      author: post.author,
      title: post.title,
      content: post.content,
      categoryId: post.categoryId,
      blocks: post.blocks,
      pinned: post.pinned !== true,
    })
  }

  // 삭제된 카테고리 게시글 기본 카테고리 이동
  const movePostsToCategoryFallback = async (
    categoryId,
    fallbackCategoryId = DEFAULT_BOARD_CATEGORY_ID,
  ) => {
    const nextPosts = moveBoardPostsToCategoryFallback(posts, categoryId, fallbackCategoryId)
    if (storageMode === 'local' || isLocalFallback) {
      localBoardPostRepository.replacePosts(nextPosts)
      setPostsState(nextPosts)
      return nextPosts
    }

    const movedPosts = nextPosts.filter((post, index) => post !== posts[index])
    await runAction(() => Promise.all(movedPosts.map((post) => repository.updatePost(post.id, {
      author: post.author,
      title: post.title,
      content: post.content,
      categoryId: post.categoryId,
      blocks: post.blocks,
      pinned: post.pinned === true,
    }))))
    return nextPosts
  }

  return {
    activePosts: posts.filter((post) => !post.deletedAt),
    createPost,
    error,
    increasePostViews,
    loading,
    isLocalFallback,
    movePostsToCategoryFallback,
    permanentlyDeletePost,
    posts,
    restorePost,
    setPosts,
    softDeletePost,
    storageMode,
    togglePostPinned,
    trashedPosts: posts.filter((post) => post.deletedAt),
    updatePost,
  }
}

export default useBoardPosts
