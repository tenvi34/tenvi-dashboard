// Board 게시글 생성 규칙
export const createBoardPost = ({
  category = 'general',
  content = '',
  createdAt = new Date().toISOString(),
  id,
  title = '',
}) => {
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()

  if (!normalizedTitle || !normalizedContent) {
    return null
  }

  return {
    id: id ?? crypto.randomUUID(),
    title: normalizedTitle,
    content: normalizedContent,
    category,
    createdAt,
    updatedAt: createdAt,
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
