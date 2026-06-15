// Board 게시글 생성 규칙
export const createBoardPost = ({
  author = 'TENVI',
  category = 'general',
  content = '',
  createdAt = new Date().toISOString(),
  id,
  title = '',
}) => {
  const normalizedAuthor = author.trim() || 'TENVI'
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()

  if (!normalizedTitle || !normalizedContent) {
    return null
  }

  return {
    id: id ?? crypto.randomUUID(),
    title: normalizedTitle,
    content: normalizedContent,
    author: normalizedAuthor,
    category,
    createdAt,
    updatedAt: createdAt,
    views: 0,
  }
}

// Board localStorage JSON 복원
export const parseBoardPosts = (rawPosts, fallbackPosts = []) => {
  if (!rawPosts) {
    return fallbackPosts
  }

  try {
    const parsedPosts = JSON.parse(rawPosts)

    return Array.isArray(parsedPosts) ? parsedPosts : []
  } catch {
    return []
  }
}

// Board 게시글 삭제
export const deleteBoardPost = (posts, postId) =>
  posts.filter((post) => post.id !== postId)

// Board 게시글 조회수 증가
export const increaseBoardPostViews = (posts, postId) =>
  posts.map((post) => {
    if (post.id !== postId) {
      return post
    }

    return {
      ...post,
      views: Number.isFinite(post.views) ? post.views + 1 : 1,
    }
  })
