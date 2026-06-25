export const DEFAULT_BOARD_CATEGORY_ID = 'general'

// 디폴트 카테고리 상수
export const DEFAULT_BOARD_CATEGORIES = [
  { id: 'general', name: '일반', isDefault: true },
  { id: 'notice', name: '공지', isDefault: true },
  { id: 'dev', name: '개발', isDefault: true },
  { id: 'daily', name: '일상', isDefault: true },
  { id: 'question', name: '질문', isDefault: true },
  { id: 'image', name: '이미지', isDefault: true },
]

// 게시글 정렬 상수
export const BOARD_SORT_OPTIONS = [
  { id: 'latest', name: '최신순' },
  { id: 'oldest', name: '오래된순' },
  { id: 'views', name: '조회수순' },
  { id: 'title', name: '제목순' },
]

const createBoardBlockId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Board 카테고리 고유 ID 생성
const createBoardCategoryId = (name) => {
  const slug = String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `category-${slug || Date.now()}-${Math.random().toString(16).slice(2, 8)}`
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

// Board category/categoryId legacy 호환
export const getPostCategoryId = (post, categories = DEFAULT_BOARD_CATEGORIES) => {
  const categoryIds = new Set(normalizeBoardCategories(categories).map((category) => category.id))
  const candidateId = String(post?.categoryId ?? post?.category ?? '').trim()

  return categoryIds.has(candidateId) ? candidateId : DEFAULT_BOARD_CATEGORY_ID
}

// Board category record 생성
export const createBoardCategory = ({
  createdAt = new Date().toISOString(),
  id,
  isDefault = false,
  name = '',
}) => {
  const normalizedName = String(name ?? '').trim()

  if (!normalizedName) {
    return null
  }

  return {
    id: id || createBoardCategoryId(normalizedName),
    name: normalizedName,
    createdAt,
    updatedAt: createdAt,
    isDefault,
  }
}

// Board 카테고리 목록 정규화
export const normalizeBoardCategories = (categories = []) => {
  const now = new Date().toISOString()
  const sourceCategories =
    Array.isArray(categories) && categories.length > 0
      ? categories
      : DEFAULT_BOARD_CATEGORIES
  const normalizedCategories = sourceCategories
        .map((category) =>
          createBoardCategory({
            createdAt: category?.createdAt || now,
            id: category?.id,
            isDefault: Boolean(category?.isDefault),
            name: category?.name,
          }),
        )
        .filter(Boolean)
  const categoryMap = new Map()

  normalizedCategories.forEach((category) => {
    categoryMap.set(category.id, {
      ...category,
      updatedAt: category.updatedAt || category.createdAt || now,
    })
  })

  // general은 삭제 불가 fallback으로 항상 보존
  if (!categoryMap.has(DEFAULT_BOARD_CATEGORY_ID)) {
    const [generalCategory] = DEFAULT_BOARD_CATEGORIES
    categoryMap.set(DEFAULT_BOARD_CATEGORY_ID, {
      ...generalCategory,
      createdAt: now,
      updatedAt: now,
    })
  }

  return [...categoryMap.values()]
}

// Board 카테고리 localStorage JSON 복원
export const parseBoardCategories = (rawCategories) => {
  if (!rawCategories) {
    return normalizeBoardCategories()
  }

  try {
    const parsedCategories = JSON.parse(rawCategories)

    return normalizeBoardCategories(Array.isArray(parsedCategories) ? parsedCategories : [])
  } catch {
    return normalizeBoardCategories()
  }
}

// Board 카테고리 이름 중복 확인
const hasDuplicateCategoryName = (categories, name, ignoreCategoryId = '') => {
  const normalizedName = String(name ?? '').trim().toLowerCase()

  return categories.some(
    (category) =>
      category.id !== ignoreCategoryId &&
      category.name.trim().toLowerCase() === normalizedName,
  )
}

// Board 카테고리 추가
export const addBoardCategory = (categories, name) => {
  const normalizedCategories = normalizeBoardCategories(categories)
  const normalizedName = String(name ?? '').trim()

  if (!normalizedName || hasDuplicateCategoryName(normalizedCategories, normalizedName)) {
    return normalizedCategories
  }

  return [
    ...normalizedCategories,
    createBoardCategory({
      name: normalizedName,
    }),
  ]
}

// Board 카테고리 이름 수정
export const updateBoardCategory = (categories, categoryId, name) => {
  const normalizedCategories = normalizeBoardCategories(categories)
  const normalizedName = String(name ?? '').trim()

  if (
    !normalizedName ||
    !categoryId ||
    hasDuplicateCategoryName(normalizedCategories, normalizedName, categoryId)
  ) {
    return normalizedCategories
  }

  return normalizedCategories.map((category) =>
    category.id === categoryId
      ? {
          ...category,
          name: normalizedName,
          updatedAt: new Date().toISOString(),
        }
      : category,
  )
}

// Board 카테고리 삭제
export const deleteBoardCategory = (categories, categoryId) => {
  const normalizedCategories = normalizeBoardCategories(categories)

  if (!categoryId || categoryId === DEFAULT_BOARD_CATEGORY_ID) {
    return normalizedCategories
  }

  return normalizedCategories.filter((category) => category.id !== categoryId)
}

// 삭제된 카테고리 게시글 기본 카테고리 이동
export const movePostsToDefaultCategory = (
  posts = [],
  removedCategoryId,
  categories = DEFAULT_BOARD_CATEGORIES,
) =>
  posts.map((post) => {
    const currentCategoryId = getPostCategoryId(post, categories)

    return {
      ...post,
      categoryId:
        currentCategoryId === removedCategoryId
          ? DEFAULT_BOARD_CATEGORY_ID
          : currentCategoryId,
    }
  })

// Board 카테고리 이름 조회
export const getBoardCategoryName = (
  categoryId,
  categories = DEFAULT_BOARD_CATEGORIES,
) => {
  const normalizedCategories = normalizeBoardCategories(categories)
  const category = normalizedCategories.find((item) => item.id === categoryId)
  const fallbackCategory = normalizedCategories.find(
    (item) => item.id === DEFAULT_BOARD_CATEGORY_ID,
  )

  return category?.name ?? fallbackCategory?.name ?? '일반'
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
export const createBoardDraft = ({
  author = '',
  blocks = [],
  categoryId = DEFAULT_BOARD_CATEGORY_ID,
  title = '',
}) => ({
  author: String(author ?? ''),
  blocks: normalizeBoardBlocks(blocks),
  categoryId,
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
      categoryId: String(parsedDraft.categoryId ?? parsedDraft.category ?? DEFAULT_BOARD_CATEGORY_ID),
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
  category,
  categoryId = category ?? DEFAULT_BOARD_CATEGORY_ID,
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
    categoryId: String(categoryId || DEFAULT_BOARD_CATEGORY_ID),
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

// Board 게시글 휴지통 이동
export const moveBoardPostToTrash = (
  posts,
  postId,
  deletedAt = new Date().toISOString(),
) =>
  posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          deletedAt,
          updatedAt: deletedAt,
        }
      : post,
  )

// Board 게시글 복구
export const restoreBoardPost = (posts, postId) =>
  posts.map((post) => {
    if (post.id !== postId) {
      return post
    }

    const restoredPost = { ...post }
    delete restoredPost.deletedAt

    return {
      ...restoredPost,
      updatedAt: new Date().toISOString(),
    }
  })

// Board 게시글 조회수 증가
export const increaseBoardPostViews = (posts, postId) =>
  posts.map((post) => {
    if (post.id !== postId) {
      return post
    }

    return {
      ...post,
      categoryId: getPostCategoryId(post),
      views: Number.isFinite(post.views) ? post.views + 1 : 1,
    }
  })

// Board 게시글 고정 상태 전환
export const toggleBoardPostPinned = (posts, postId) =>
  posts.map((post) => {
    if (post.id !== postId) {
      return post
    }

    return {
      ...post,
      pinned: post.pinned !== true,
      updatedAt: new Date().toISOString(),
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
  const normalizedCategoryId = String(
    input.categoryId ?? input.category ?? DEFAULT_BOARD_CATEGORY_ID,
  )

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
      categoryId: normalizedCategoryId,
      updatedAt,
    }
  })
}

// 고정 게시글 우선순위
const compareBoardPostPinned = (a, b) => {
  if (a.pinned === true && b.pinned !== true) {
    return -1
  }

  if (a.pinned !== true && b.pinned === true) {
    return 1
  }

  return 0
}

// 게시글 정렬
export const sortBoardPosts = (posts = [], sortMode = 'latest') => {
  const copiedPosts = [...posts]
  const withPinnedFirst = (comparePosts) =>
    copiedPosts.sort((a, b) => compareBoardPostPinned(a, b) || comparePosts(a, b))

  // 오래된순
  if (sortMode === 'oldest') {
    return withPinnedFirst(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }

  // 조회수순
  if (sortMode === 'views') {
    return withPinnedFirst(
      (a, b) => (b.views ?? 0) - (a.views ?? 0),
    )
  }

  // 제목순
  if (sortMode === 'title') {
    return withPinnedFirst(
      (a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ko'),
    )
  }

  // 최신순
  return withPinnedFirst(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}
