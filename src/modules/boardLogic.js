const createBoardBlockId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Board 이미지 블록 정규화
const normalizeBoardImageBlock = (block) => {
  const imageId = String(block?.imageId ?? '').trim()
  const src = String(block?.src ?? '').trim()

  if (!imageId && !src) {
    return null
  }

  return {
    id: block.id || createBoardBlockId(),
    type: 'image',
    ...(imageId ? { imageId } : {}),
    ...(src ? { src } : {}),
    name: String(block.name ?? 'image').trim() || 'image',
  }
}

// Board 블록 저장 구조 정규화
export const normalizeBoardBlocks = (blocks, fallbackContent = '') => {
  if (!Array.isArray(blocks)) {
    const normalizedContent = String(fallbackContent ?? '').trim()

    return normalizedContent
      ? [
          {
            id: createBoardBlockId(),
            type: 'text',
            content: normalizedContent,
          },
        ]
      : []
  }

  return blocks
    .map((block) => {
      if (block?.type === 'image') {
        return normalizeBoardImageBlock(block)
      }

      const content = String(block?.content ?? '')

      return {
        id: block?.id || createBoardBlockId(),
        type: 'text',
        content,
      }
    })
    .filter(Boolean)
}

// Board imageId 목록 추출
export const getBoardImageIds = (blocks = []) =>
  normalizeBoardBlocks(blocks)
    .filter((block) => block.type === 'image' && block.imageId)
    .map((block) => block.imageId)

// 수정 중 제거된 Board imageId 계산
export const getRemovedBoardImageIds = (beforeBlocks = [], afterBlocks = []) => {
  const afterImageIds = new Set(getBoardImageIds(afterBlocks))

  return getBoardImageIds(beforeBlocks).filter((imageId) => !afterImageIds.has(imageId))
}

// Board draft 저장 payload 생성
export const createBoardDraft = ({ author = '', blocks = [], title = '' }) => ({
  author: String(author ?? ''),
  blocks: normalizeBoardBlocks(blocks),
  savedAt: new Date().toISOString(),
  title: String(title ?? ''),
})

// Board draft localStorage JSON 복원
export const parseBoardDraft = (rawDraft) => {
  if (!rawDraft) {
    return null
  }

  try {
    const parsedDraft = JSON.parse(rawDraft)

    if (!parsedDraft || typeof parsedDraft !== 'object' || Array.isArray(parsedDraft)) {
      return null
    }

    return {
      author: String(parsedDraft.author ?? ''),
      blocks: normalizeBoardBlocks(parsedDraft.blocks, parsedDraft.content),
      savedAt: String(parsedDraft.savedAt ?? ''),
      title: String(parsedDraft.title ?? ''),
    }
  } catch {
    return null
  }
}

export const getBoardPostTextContent = (blocks = []) =>
  normalizeBoardBlocks(blocks)
    .filter((block) => block.type === 'text')
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join('\n\n')

const hasBoardPostBody = (content, blocks) => {
  const normalizedContent = String(content ?? '').trim()
  const normalizedBlocks = normalizeBoardBlocks(blocks)
  const hasTextBlock = getBoardPostTextContent(normalizedBlocks).length > 0
  const hasImageBlock = normalizedBlocks.some((block) => block.type === 'image')

  return normalizedContent.length > 0 || hasTextBlock || hasImageBlock
}

// Board 게시글 생성 규칙
export const createBoardPost = ({
  author = 'TENVI',
  blocks,
  category = 'general',
  content = '',
  createdAt = new Date().toISOString(),
  id,
  title = '',
}) => {
  const normalizedAuthor = author.trim() || 'TENVI'
  const normalizedTitle = title.trim()
  const normalizedBlocks = normalizeBoardBlocks(blocks, content)
  const normalizedContent = Array.isArray(blocks)
    ? getBoardPostTextContent(normalizedBlocks)
    : content.trim()

  if (!normalizedTitle || !hasBoardPostBody(normalizedContent, normalizedBlocks)) {
    return null
  }

  return {
    id: id ?? crypto.randomUUID(),
    title: normalizedTitle,
    content: normalizedContent,
    blocks: normalizedBlocks,
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

// Board 게시글 수정
export const updateBoardPost = (posts, postId, input) => {
  const normalizedAuthor = (input.author ?? '').trim() || 'TENVI'
  const normalizedTitle = (input.title ?? '').trim()
  const normalizedBlocks = normalizeBoardBlocks(input.blocks, input.content)
  const normalizedContent = Array.isArray(input.blocks)
    ? getBoardPostTextContent(normalizedBlocks)
    : (input.content ?? '').trim()

  if (!normalizedTitle || !hasBoardPostBody(normalizedContent, normalizedBlocks)) {
    return posts
  }

  const updatedAt = new Date().toISOString()

  return posts.map((post) => {
    if (post.id !== postId) {
      return post
    }

    return {
      ...post,
      author: normalizedAuthor,
      title: normalizedTitle,
      content: normalizedContent,
      blocks: normalizedBlocks,
      updatedAt,
    }
  })
}
