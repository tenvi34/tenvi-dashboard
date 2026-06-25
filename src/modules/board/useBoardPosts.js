import { useState } from 'react'
import { localBoardPostRepository } from './repositories/localBoardPostRepository.js'

const boardPostRepository = localBoardPostRepository

// Board 게시글 localStorage 복원
const loadBoardPosts = () => boardPostRepository.fetchAllPosts()

// 기존 Board 게시글 key 보존
const saveBoardPosts = (posts) => boardPostRepository.replacePosts(posts)

function useBoardPosts() {
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
    increasePostViews,
    permanentlyDeletePost,
    posts,
    restorePost,
    setPosts: updatePosts,
    softDeletePost,
    trashedPosts,
  }
}

export default useBoardPosts
