import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_BOARD_CATEGORY_ID,
  addBoardCategory,
  createBoardCategory,
  createBoardDraft,
  createBoardPost,
  deleteBoardPost,
  deleteBoardCategory,
  getBoardCategoryName,
  getBoardImageIds,
  getBoardPostTextContent,
  getPostCategoryId,
  getRemovedBoardImageIds,
  increaseBoardPostViews,
  movePostsToDefaultCategory,
  normalizeBoardCategories,
  normalizeBoardBlocks,
  parseBoardCategories,
  parseBoardDraft,
  parseBoardPosts,
  updateBoardCategory,
  updateBoardPost,
} from './boardLogic.js'

// Board 저장 구조와 legacy 호환성 검증
describe('boardLogic', () => {
  it('creates a normalized board post', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'generated-block-id' })

    const post = createBoardPost({
      id: 'post-1',
      author: '  TENVI  ',
      title: '  Title  ',
      content: '  Body  ',
      createdAt: '2026-06-15T00:00:00.000Z',
    })

    expect(post).toEqual({
      id: 'post-1',
      title: 'Title',
      content: 'Body',
      blocks: [
        {
          id: 'generated-block-id',
          type: 'text',
          content: 'Body',
        },
      ],
      author: 'TENVI',
      categoryId: 'general',
      createdAt: '2026-06-15T00:00:00.000Z',
      updatedAt: '2026-06-15T00:00:00.000Z',
      views: 0,
    })

    vi.unstubAllGlobals()
  })

  it('creates posts with blocks', () => {
    const post = createBoardPost({
      id: 'post-1',
      title: 'Cafe log',
      blocks: [
        { id: 'block-1', type: 'text', content: 'First paragraph' },
        {
          id: 'block-2',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'photo.png',
        },
        { id: 'block-3', type: 'text', content: 'Second paragraph' },
      ],
      createdAt: '2026-06-15T00:00:00.000Z',
    })

    expect(post).toMatchObject({
      id: 'post-1',
      title: 'Cafe log',
      content: 'First paragraph\n\nSecond paragraph',
      blocks: [
        { id: 'block-1', type: 'text', content: 'First paragraph' },
        {
          id: 'block-2',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'photo.png',
        },
        { id: 'block-3', type: 'text', content: 'Second paragraph' },
      ],
    })
  })

  it('keeps content-only posts compatible as a text block', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'legacy-block-id' })

    expect(normalizeBoardBlocks(undefined, 'Legacy content')).toEqual([
      {
        id: 'legacy-block-id',
        type: 'text',
        content: 'Legacy content',
      },
    ])

    vi.unstubAllGlobals()
  })

  it('builds content from text block content', () => {
    expect(
      getBoardPostTextContent([
        { id: 'block-1', type: 'text', content: '  Alpha  ' },
        { id: 'block-2', type: 'image', src: 'data:image/png;base64,abc' },
        { id: 'block-3', type: 'text', content: 'Beta' },
      ]),
    ).toBe('Alpha\n\nBeta')
  })

  it('preserves image blocks', () => {
    expect(
      normalizeBoardBlocks([
        {
          id: 'block-1',
          type: 'image',
          src: 'data:image/jpeg;base64,abc',
          name: 'dessert.jpg',
        },
      ]),
    ).toEqual([
      {
        id: 'block-1',
        type: 'image',
        src: 'data:image/jpeg;base64,abc',
        name: 'dessert.jpg',
      },
    ])
  })

  it('preserves imageId based image blocks', () => {
    expect(
      normalizeBoardBlocks([
        {
          id: 'block-1',
          type: 'image',
          imageId: 'board-image-1',
          name: 'stored.jpg',
        },
      ]),
    ).toEqual([
      {
        id: 'block-1',
        type: 'image',
        imageId: 'board-image-1',
        name: 'stored.jpg',
      },
    ])
  })

  it('ignores imageId blocks when building text content', () => {
    expect(
      getBoardPostTextContent([
        { id: 'block-1', type: 'text', content: 'Alpha' },
        {
          id: 'block-2',
          type: 'image',
          imageId: 'board-image-1',
          name: 'stored.jpg',
        },
        { id: 'block-3', type: 'text', content: 'Beta' },
      ]),
    ).toBe('Alpha\n\nBeta')
  })

  it('extracts removed imageIds for edit cleanup', () => {
    expect(
      getRemovedBoardImageIds(
        [
          { id: 'block-1', type: 'image', imageId: 'board-image-1' },
          { id: 'block-2', type: 'image', imageId: 'board-image-2' },
        ],
        [{ id: 'block-2', type: 'image', imageId: 'board-image-2' }],
      ),
    ).toEqual(['board-image-1'])
    expect(
      getBoardImageIds([
        { id: 'block-1', type: 'image', src: 'data:image/png;base64,abc' },
      ]),
    ).toEqual([])
  })

  it('does not create posts with an empty title', () => {
    expect(
      createBoardPost({
        title: '   ',
        blocks: [{ id: 'block-1', type: 'text', content: 'Body' }],
      }),
    ).toBeNull()
  })

  it('does not create posts with empty blocks', () => {
    expect(createBoardPost({ title: 'Title', blocks: [] })).toBeNull()
    expect(
      createBoardPost({
        title: 'Title',
        blocks: [{ id: 'block-1', type: 'text', content: '   ' }],
      }),
    ).toBeNull()
  })

  it('does not create empty content-only posts', () => {
    expect(createBoardPost({ title: '   ', content: 'Body' })).toBeNull()
    expect(createBoardPost({ title: 'Title', content: '   ' })).toBeNull()
  })

  it('creates image-only posts', () => {
    const post = createBoardPost({
      id: 'post-1',
      title: 'Image only',
      blocks: [
        {
          id: 'block-1',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'photo.png',
        },
      ],
    })

    expect(post).toMatchObject({
      title: 'Image only',
      content: '',
      blocks: [
        {
          id: 'block-1',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'photo.png',
        },
      ],
    })
  })

  it('uses crypto ids when no id is provided', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' })

    expect(createBoardPost({ title: 'Title', content: 'Body' })).toMatchObject({
      id: 'generated-id',
      author: 'TENVI',
      categoryId: DEFAULT_BOARD_CATEGORY_ID,
    })

    vi.unstubAllGlobals()
  })

  it('normalizes default board categories', () => {
    expect(normalizeBoardCategories().map((category) => category.id)).toEqual([
      'general',
      'notice',
      'dev',
      'daily',
      'question',
      'image',
    ])
    expect(normalizeBoardCategories()[0]).toMatchObject({
      id: 'general',
      name: '일반',
      isDefault: true,
    })
  })

  it('parses board categories safely from storage JSON', () => {
    expect(parseBoardCategories('broken-json').map((category) => category.id)).toContain(
      'general',
    )
    expect(parseBoardCategories(JSON.stringify({ id: 'bad' })).map((category) => category.id)).toContain(
      'general',
    )
    expect(
      parseBoardCategories(
        JSON.stringify([{ id: 'travel', name: '여행', createdAt: '2026-06-17' }]),
      ).some((category) => category.id === 'travel'),
    ).toBe(true)
  })

  it('adds board categories with valid unique names', () => {
    const categories = addBoardCategory(normalizeBoardCategories(), '자료')

    expect(categories.some((category) => category.name === '자료')).toBe(true)
  })

  it('does not add empty board categories', () => {
    const categories = normalizeBoardCategories()

    expect(addBoardCategory(categories, '   ')).toEqual(categories)
  })

  it('does not add duplicate board category names', () => {
    const categories = normalizeBoardCategories()

    expect(addBoardCategory(categories, '일반')).toEqual(categories)
  })

  it('updates board category names', () => {
    const [customCategory] = [createBoardCategory({ id: 'custom', name: '기록' })]
    const categories = normalizeBoardCategories([customCategory])
    const updatedCategories = updateBoardCategory(categories, 'custom', '아카이브')

    expect(updatedCategories.find((category) => category.id === 'custom')).toMatchObject({
      name: '아카이브',
    })
  })

  it('prevents deleting the general board category', () => {
    const categories = normalizeBoardCategories()

    expect(deleteBoardCategory(categories, 'general')).toEqual(categories)
  })

  it('allows deleting non-general default board categories', () => {
    const categories = normalizeBoardCategories()
    const nextCategories = deleteBoardCategory(categories, 'dev')

    expect(nextCategories.some((category) => category.id === 'dev')).toBe(false)
    expect(nextCategories.some((category) => category.id === 'general')).toBe(true)
    expect(normalizeBoardCategories(nextCategories).some((category) => category.id === 'dev')).toBe(
      false,
    )
  })

  it('moves posts to general when their category is deleted', () => {
    const posts = [
      { id: 'post-1', categoryId: 'dev', title: 'Dev' },
      { id: 'post-2', categoryId: 'daily', title: 'Daily' },
    ]

    expect(movePostsToDefaultCategory(posts, 'dev')).toEqual([
      { id: 'post-1', categoryId: 'general', title: 'Dev' },
      { id: 'post-2', categoryId: 'daily', title: 'Daily' },
    ])
  })

  it('reads legacy category fields as categoryId', () => {
    expect(getPostCategoryId({ category: 'dev' })).toBe('dev')
    expect(getPostCategoryId({ category: 'missing' })).toBe('general')
  })

  it('returns board category name with fallback', () => {
    expect(getBoardCategoryName('dev')).toBe('개발')
    expect(getBoardCategoryName('missing')).toBe('일반')
  })

  it('parses stored board posts safely', () => {
    const fallbackPosts = [{ id: 'fallback', title: 'Default post' }]

    expect(parseBoardPosts('', fallbackPosts)).toEqual(fallbackPosts)
    expect(parseBoardPosts('[{"id":"post-1"}]')).toEqual([{ id: 'post-1' }])
    expect(parseBoardPosts('{"id":"not-array"}')).toEqual([])
    expect(parseBoardPosts('broken-json')).toEqual([])
  })

  it('creates and parses board draft data without changing block shape', () => {
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(
      '2026-06-17T00:00:00.000Z',
    )

    const draft = createBoardDraft({
      author: 'TENVI',
      title: 'Draft title',
      blocks: [
        { id: 'block-1', type: 'text', content: 'Draft body' },
        {
          id: 'block-2',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'draft.png',
        },
      ],
    })

    expect(draft).toEqual({
      author: 'TENVI',
      blocks: [
        { id: 'block-1', type: 'text', content: 'Draft body' },
        {
          id: 'block-2',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'draft.png',
        },
      ],
      categoryId: 'general',
      savedAt: '2026-06-17T00:00:00.000Z',
      title: 'Draft title',
    })
    expect(parseBoardDraft(JSON.stringify(draft))).toEqual(draft)

    vi.restoreAllMocks()
  })

  it('parses damaged board draft data safely', () => {
    expect(parseBoardDraft('')).toBeNull()
    expect(parseBoardDraft('broken-json')).toBeNull()
    expect(parseBoardDraft('[]')).toBeNull()
  })

  it('deletes a post by id without mutating the original list', () => {
    const posts = [
      { id: 'post-1', title: 'First post' },
      { id: 'post-2', title: 'Second post' },
    ]

    expect(deleteBoardPost(posts, 'post-1')).toEqual([
      { id: 'post-2', title: 'Second post' },
    ])
    expect(posts).toHaveLength(2)
  })

  it('increases a post view count while tolerating old posts', () => {
    const posts = [
      { id: 'post-1', title: 'First post', views: 2 },
      { id: 'post-2', title: 'Second post' },
    ]

    expect(increaseBoardPostViews(posts, 'post-1')).toEqual([
      { id: 'post-1', title: 'First post', categoryId: 'general', views: 3 },
      { id: 'post-2', title: 'Second post' },
    ])
    expect(increaseBoardPostViews(posts, 'post-2')).toEqual([
      { id: 'post-1', title: 'First post', views: 2 },
      { id: 'post-2', title: 'Second post', categoryId: 'general', views: 1 },
    ])
  })

  it('updates a post while preserving stable fields', () => {
    const posts = [
      {
        id: 'post-1',
        title: 'Before',
        content: 'Old',
        author: 'Old Author',
        createdAt: '2026-06-15T00:00:00.000Z',
        views: 3,
      },
    ]

    const updatedPosts = updateBoardPost(posts, 'post-1', {
      author: ' New Author ',
      title: ' After ',
      content: ' New content ',
    })

    expect(updatedPosts[0]).toMatchObject({
      id: 'post-1',
      title: 'After',
      content: 'New content',
      author: 'New Author',
      createdAt: '2026-06-15T00:00:00.000Z',
      views: 3,
    })
    expect(updatedPosts[0].blocks[0]).toMatchObject({
      type: 'text',
      content: 'New content',
    })
    expect(updatedPosts[0].updatedAt).toEqual(expect.any(String))
  })

  it('updates post blocks', () => {
    const posts = [
      {
        id: 'post-1',
        title: 'Before',
        content: 'Old',
        blocks: [{ id: 'block-1', type: 'text', content: 'Old' }],
      },
    ]

    const updatedPosts = updateBoardPost(posts, 'post-1', {
      title: 'After',
      blocks: [
        { id: 'block-2', type: 'text', content: 'New text' },
        {
          id: 'block-3',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'new.png',
        },
      ],
    })

    expect(updatedPosts[0]).toMatchObject({
      title: 'After',
      content: 'New text',
      blocks: [
        { id: 'block-2', type: 'text', content: 'New text' },
        {
          id: 'block-3',
          type: 'image',
          src: 'data:image/png;base64,abc',
          name: 'new.png',
        },
      ],
    })
  })

  it('keeps imageId blocks when updating posts', () => {
    const posts = [
      {
        id: 'post-1',
        title: 'Before',
        content: 'Old',
        blocks: [{ id: 'block-1', type: 'text', content: 'Old' }],
      },
    ]

    const updatedPosts = updateBoardPost(posts, 'post-1', {
      title: 'After',
      blocks: [
        { id: 'block-2', type: 'text', content: 'New text' },
        {
          id: 'block-3',
          type: 'image',
          imageId: 'board-image-1',
          name: 'stored.png',
        },
      ],
    })

    expect(updatedPosts[0].blocks).toEqual([
      { id: 'block-2', type: 'text', content: 'New text' },
      {
        id: 'block-3',
        type: 'image',
        imageId: 'board-image-1',
        name: 'stored.png',
      },
    ])
  })

  it('does not update when title or body is empty', () => {
    const posts = [{ id: 'post-1', title: 'Before', content: 'Old' }]

    expect(updateBoardPost(posts, 'post-1', { title: '', content: 'New' })).toBe(posts)
    expect(updateBoardPost(posts, 'post-1', { title: 'New', content: '' })).toBe(posts)
    expect(updateBoardPost(posts, 'post-1', { title: 'New', blocks: [] })).toBe(posts)
  })
})
