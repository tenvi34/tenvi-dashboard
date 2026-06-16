import { describe, expect, it, vi } from 'vitest'
import {
  createBoardPost,
  deleteBoardPost,
  getBoardPostTextContent,
  increaseBoardPostViews,
  normalizeBoardBlocks,
  parseBoardPosts,
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
      category: 'general',
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
    })

    vi.unstubAllGlobals()
  })

  it('parses stored board posts safely', () => {
    const fallbackPosts = [{ id: 'fallback', title: 'Default post' }]

    expect(parseBoardPosts('', fallbackPosts)).toEqual(fallbackPosts)
    expect(parseBoardPosts('[{"id":"post-1"}]')).toEqual([{ id: 'post-1' }])
    expect(parseBoardPosts('{"id":"not-array"}')).toEqual([])
    expect(parseBoardPosts('broken-json')).toEqual([])
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
      { id: 'post-1', title: 'First post', views: 3 },
      { id: 'post-2', title: 'Second post' },
    ])
    expect(increaseBoardPostViews(posts, 'post-2')).toEqual([
      { id: 'post-1', title: 'First post', views: 2 },
      { id: 'post-2', title: 'Second post', views: 1 },
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

  it('does not update when title or body is empty', () => {
    const posts = [{ id: 'post-1', title: 'Before', content: 'Old' }]

    expect(updateBoardPost(posts, 'post-1', { title: '', content: 'New' })).toBe(posts)
    expect(updateBoardPost(posts, 'post-1', { title: 'New', content: '' })).toBe(posts)
    expect(updateBoardPost(posts, 'post-1', { title: 'New', blocks: [] })).toBe(posts)
  })
})
