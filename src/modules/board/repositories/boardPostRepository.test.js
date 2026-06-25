import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../../../constants/storageKeys.js'
import { createLocalBoardPostRepository } from './localBoardPostRepository.js'
import { createRemoteBoardPostRepository } from './remoteBoardPostRepository.js'

const createMemoryStorage = () => {
  const store = new Map()

  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => {
      store.set(key, value)
    }),
  }
}

describe('localBoardPostRepository', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'generated-id'),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates and fetches active posts from the existing board storage key', async () => {
    const storage = createMemoryStorage()
    const repository = createLocalBoardPostRepository({ storage })

    const createdPost = await repository.createPost({
      title: 'Local title',
      content: 'Local body',
      author: 'TENVI',
      categoryId: 'general',
      pinned: true,
    })

    await expect(repository.fetchPosts()).resolves.toEqual([createdPost])
    expect(createdPost).toMatchObject({
      id: 'generated-id',
      title: 'Local title',
      content: 'Local body',
      author: 'TENVI',
      categoryId: 'general',
      pinned: true,
      views: 0,
    })
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.boardPosts,
      expect.stringContaining('Local title'),
    )
    expect(repository.fetchAllPosts()).toEqual([createdPost])
  })

  it('reads and replaces the full posts snapshot for useBoardPosts compatibility', () => {
    const storage = createMemoryStorage()
    const repository = createLocalBoardPostRepository({ storage })
    const posts = [
      { id: 'post-1', title: 'Active' },
      { id: 'post-2', title: 'Trash', deletedAt: '2026-06-25T00:00:00.000Z' },
    ]

    expect(repository.replacePosts(posts)).toBe(posts)
    expect(repository.fetchAllPosts()).toEqual(posts)
    expect(storage.setItem).toHaveBeenCalledWith(
      STORAGE_KEYS.boardPosts,
      JSON.stringify(posts),
    )
  })

  it('updates posts through boardLogic normalization', async () => {
    const storage = createMemoryStorage()
    const repository = createLocalBoardPostRepository({ storage })
    const createdPost = await repository.createPost({
      title: 'Before',
      content: 'Body',
    })

    const updatedPost = await repository.updatePost(createdPost.id, {
      title: 'After',
      blocks: [{ id: 'block-1', type: 'text', content: 'Updated body' }],
      author: 'Dashboard',
      categoryId: 'notice',
    })

    expect(updatedPost).toMatchObject({
      id: createdPost.id,
      title: 'After',
      content: 'Updated body',
      author: 'Dashboard',
      categoryId: 'notice',
      blocks: [{ id: 'block-1', type: 'text', content: 'Updated body' }],
    })
  })

  it('moves posts between active and trash lists', async () => {
    const storage = createMemoryStorage()
    const repository = createLocalBoardPostRepository({ storage })
    const createdPost = await repository.createPost({
      title: 'Trash target',
      content: 'Body',
    })

    await expect(repository.softDeletePost(createdPost.id)).resolves.toBeNull()
    expect(repository.fetchAllPosts()).toMatchObject([
      { id: createdPost.id, deletedAt: expect.any(String) },
    ])
    await expect(repository.fetchPosts()).resolves.toEqual([])
    await expect(repository.fetchTrashPosts()).resolves.toMatchObject([
      { id: createdPost.id, deletedAt: expect.any(String) },
    ])

    const restoredPost = await repository.restorePost(createdPost.id)

    expect(restoredPost.deletedAt).toBeUndefined()
    expect(repository.fetchAllPosts()[0]).not.toHaveProperty('deletedAt')
    await expect(repository.fetchPosts()).resolves.toMatchObject([
      { id: createdPost.id },
    ])
  })

  it('permanently deletes posts', async () => {
    const storage = createMemoryStorage()
    const repository = createLocalBoardPostRepository({ storage })
    const createdPost = await repository.createPost({
      title: 'Permanent target',
      content: 'Body',
    })

    await expect(repository.permanentlyDeletePost(createdPost.id)).resolves.toBeNull()
    expect(repository.fetchAllPosts()).toEqual([])
    await expect(repository.fetchPosts()).resolves.toEqual([])
    await expect(repository.fetchTrashPosts()).resolves.toEqual([])
  })

  it('increases views without changing updatedAt', async () => {
    const storage = createMemoryStorage()
    const repository = createLocalBoardPostRepository({ storage })
    const createdPost = await repository.createPost({
      title: 'Viewed title',
      content: 'Body',
    })

    const viewedPost = await repository.increaseViews(createdPost.id)

    expect(viewedPost.views).toBe(1)
    expect(viewedPost.updatedAt).toBe(createdPost.updatedAt)
    expect(repository.fetchAllPosts()).toMatchObject([
      { id: createdPost.id, views: 1 },
    ])
  })
})

describe('remoteBoardPostRepository', () => {
  it('delegates every repository method to boardApi helpers', async () => {
    const api = {
      createBoardPost: vi.fn().mockResolvedValue({ id: 'created' }),
      fetchBoardPosts: vi.fn().mockResolvedValue([{ id: 'active' }]),
      fetchTrashBoardPosts: vi.fn().mockResolvedValue([{ id: 'trash' }]),
      increaseBoardPostViews: vi.fn().mockResolvedValue({ id: 'viewed' }),
      permanentlyDeleteBoardPost: vi.fn().mockResolvedValue(null),
      restoreBoardPost: vi.fn().mockResolvedValue({ id: 'restored' }),
      softDeleteBoardPost: vi.fn().mockResolvedValue(null),
      updateBoardPost: vi.fn().mockResolvedValue({ id: 'updated' }),
    }
    const repository = createRemoteBoardPostRepository(api)

    await expect(repository.fetchPosts()).resolves.toEqual([{ id: 'active' }])
    await expect(repository.fetchTrashPosts()).resolves.toEqual([{ id: 'trash' }])
    await expect(repository.createPost({ title: 'New' })).resolves.toEqual({ id: 'created' })
    await expect(repository.updatePost('post-1', { title: 'Edit' })).resolves.toEqual({ id: 'updated' })
    await expect(repository.softDeletePost('post-1')).resolves.toBeNull()
    await expect(repository.restorePost('post-1')).resolves.toEqual({ id: 'restored' })
    await expect(repository.permanentlyDeletePost('post-1')).resolves.toBeNull()
    await expect(repository.increaseViews('post-1')).resolves.toEqual({ id: 'viewed' })

    expect(api.createBoardPost).toHaveBeenCalledWith({ title: 'New' })
    expect(api.updateBoardPost).toHaveBeenCalledWith('post-1', { title: 'Edit' })
    expect(api.softDeleteBoardPost).toHaveBeenCalledWith('post-1')
    expect(api.restoreBoardPost).toHaveBeenCalledWith('post-1')
    expect(api.permanentlyDeleteBoardPost).toHaveBeenCalledWith('post-1')
    expect(api.increaseBoardPostViews).toHaveBeenCalledWith('post-1')
  })
})
