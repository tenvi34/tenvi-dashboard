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

export default useBoardPosts
