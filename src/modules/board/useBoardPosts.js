import { useState } from 'react'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { parseBoardPosts } from '../boardLogic.js'

const POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts

// Board 게시글 localStorage 복원
const loadBoardPosts = () => {
  try {
    const rawPosts = localStorage.getItem(POSTS_STORAGE_KEY)

    return rawPosts ? parseBoardPosts(rawPosts) : []
  } catch {
    return []
  }
}

// 기존 Board 게시글 key 보존
const saveBoardPosts = (posts) => {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts))
}

function useBoardPosts() {
  const [posts, setPosts] = useState(() => loadBoardPosts())
  const activePosts = posts.filter((post) => !post.deletedAt)
  const trashedPosts = posts.filter((post) => post.deletedAt)

  const updatePosts = (updater) => {
    setPosts((currentPosts) => {
      const nextPosts =
        typeof updater === 'function' ? updater(currentPosts) : updater

      saveBoardPosts(nextPosts)

      return nextPosts
    })
  }

  return {
    activePosts,
    posts,
    setPosts: updatePosts,
    trashedPosts,
  }
}

export default useBoardPosts
