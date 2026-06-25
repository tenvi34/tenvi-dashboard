import { describe, expect, it, vi } from 'vitest'
import {
  createBoardPost,
  deleteBoardPost,
  fetchBoardPost,
  fetchBoardPosts,
  fetchTrashBoardPosts,
  getBoardPostUrl,
  getBoardPostsUrl,
  getBoardPostPermanentUrl,
  getBoardPostRestoreUrl,
  getTrashBoardPostsUrl,
  permanentlyDeleteBoardPost,
  restoreBoardPost,
  softDeleteBoardPost,
  updateBoardPost,
} from './boardApi.js'

describe('boardApi', () => {
  it('fetches board posts', async () => {
    const posts = [{ id: 'post-1', title: 'TENVI' }]
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(posts),
    })

    await expect(
      fetchBoardPosts({ baseUrl: 'http://localhost:5032', fetcher }),
    ).resolves.toBe(posts)
    expect(fetcher).toHaveBeenCalledWith(
      getBoardPostsUrl('http://localhost:5032'),
      {},
    )
  })

  it('fetches trash board posts', async () => {
    const posts = [{ id: 'post-1', deletedAt: '2026-06-25T00:00:00Z' }]
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(posts),
    })

    await expect(
      fetchTrashBoardPosts({ baseUrl: 'http://localhost:5032', fetcher }),
    ).resolves.toBe(posts)
    expect(fetcher).toHaveBeenCalledWith(
      getTrashBoardPostsUrl('http://localhost:5032'),
      {},
    )
  })

  it('fetches one board post', async () => {
    const post = { id: 'post/1', title: 'TENVI' }
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(post),
    })

    await expect(
      fetchBoardPost('post/1', {
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBe(post)
    expect(fetcher).toHaveBeenCalledWith(
      getBoardPostUrl('post/1', 'http://localhost:5032'),
      {},
    )
  })

  it('creates a board post', async () => {
    const payload = { title: 'New', content: 'Body' }
    const created = { id: 'post-1', ...payload }
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(created),
    })

    await expect(
      createBoardPost(payload, {
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBe(created)
    expect(fetcher).toHaveBeenCalledWith(
      getBoardPostsUrl('http://localhost:5032'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    )
  })

  it('updates a board post', async () => {
    const payload = { title: 'Updated', content: 'Body' }
    const updated = { id: 'post-1', ...payload }
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(updated),
    })

    await expect(
      updateBoardPost('post-1', payload, {
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBe(updated)
    expect(fetcher).toHaveBeenCalledWith(
      getBoardPostUrl('post-1', 'http://localhost:5032'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    )
  })

  it('deletes a board post with no content response', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    })

    await expect(
      softDeleteBoardPost('post-1', {
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBeNull()
    expect(fetcher).toHaveBeenCalledWith(
      getBoardPostUrl('post-1', 'http://localhost:5032'),
      { method: 'DELETE' },
    )
  })

  it('keeps deleteBoardPost as a soft delete alias', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    })

    await expect(
      deleteBoardPost('post-1', {
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBeNull()
  })

  it('restores a board post', async () => {
    const restored = { id: 'post-1', deletedAt: null }
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(restored),
    })

    await expect(
      restoreBoardPost('post-1', {
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBe(restored)
    expect(fetcher).toHaveBeenCalledWith(
      getBoardPostRestoreUrl('post-1', 'http://localhost:5032'),
      { method: 'PATCH' },
    )
  })

  it('permanently deletes a board post', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    })

    await expect(
      permanentlyDeleteBoardPost('post-1', {
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBeNull()
    expect(fetcher).toHaveBeenCalledWith(
      getBoardPostPermanentUrl('post-1', 'http://localhost:5032'),
      { method: 'DELETE' },
    )
  })

  it('throws backend error messages', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: 'Title is required.' }),
    })

    await expect(
      createBoardPost(
        { title: '' },
        { baseUrl: 'http://localhost:5032', fetcher },
      ),
    ).rejects.toThrow('Title is required.')
  })
})
