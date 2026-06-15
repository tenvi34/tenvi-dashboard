import { describe, expect, it, vi } from 'vitest'
import { createBoardPost, deleteBoardPost, parseBoardPosts } from './boardLogic.js'

describe('boardLogic', () => {
  it('creates a normalized board post', () => {
    expect(
      createBoardPost({
        id: 'post-1',
        title: '  제목  ',
        content: '  내용  ',
        createdAt: '2026-06-15T00:00:00.000Z',
      }),
    ).toEqual({
      id: 'post-1',
      title: '제목',
      content: '내용',
      category: 'general',
      createdAt: '2026-06-15T00:00:00.000Z',
      updatedAt: '2026-06-15T00:00:00.000Z',
    })
  })

  it('does not create empty posts', () => {
    expect(createBoardPost({ title: '   ', content: '내용' })).toBeNull()
    expect(createBoardPost({ title: '제목', content: '   ' })).toBeNull()
  })

  it('uses crypto ids when no id is provided', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'generated-id' })

    expect(createBoardPost({ title: '제목', content: '내용' })).toMatchObject({
      id: 'generated-id',
    })

    vi.unstubAllGlobals()
  })

  it('parses stored board posts safely', () => {
    const fallbackPosts = [{ id: 'fallback', title: '기본 글' }]

    expect(parseBoardPosts('', fallbackPosts)).toEqual(fallbackPosts)
    expect(parseBoardPosts('[{"id":"post-1"}]')).toEqual([{ id: 'post-1' }])
    expect(parseBoardPosts('{"id":"not-array"}')).toEqual([])
    expect(parseBoardPosts('broken-json')).toEqual([])
  })

  it('deletes a post by id without mutating the original list', () => {
    const posts = [
      { id: 'post-1', title: '첫 글' },
      { id: 'post-2', title: '둘째 글' },
    ]

    expect(deleteBoardPost(posts, 'post-1')).toEqual([
      { id: 'post-2', title: '둘째 글' },
    ])
    expect(posts).toHaveLength(2)
  })
})
