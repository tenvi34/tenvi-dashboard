import { describe, expect, it, vi } from 'vitest'
import { copyLocalBoardPostsToRemote } from './boardRemoteCopy.js'

const createRepositories = ({ localPosts = [], remotePosts = [], trashPosts = [] } = {}) => ({
  localRepository: { fetchAllPosts: vi.fn(() => localPosts) },
  remoteRepository: {
    fetchPosts: vi.fn(async () => remotePosts),
    fetchTrashPosts: vi.fn(async () => trashPosts),
    createPost: vi.fn(async (post) => post),
  },
})

describe('copyLocalBoardPostsToRemote', () => {
  it('keeps ids and does not mutate LOCAL posts', async () => {
    const localPosts = [{ id: 'local-1', title: 'LOCAL', content: 'body' }]
    const repositories = createRepositories({ localPosts })

    await expect(copyLocalBoardPostsToRemote(repositories)).resolves.toEqual({
      total: 1,
      copied: 1,
      skipped: 0,
      failed: 0,
    })
    expect(repositories.remoteRepository.createPost).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'local-1' }),
    )
    expect(localPosts).toEqual([{ id: 'local-1', title: 'LOCAL', content: 'body' }])
  })

  it('skips ids found in active posts or trash', async () => {
    const repositories = createRepositories({
      localPosts: [{ id: 'active' }, { id: 'trash' }, { id: 'new' }],
      remotePosts: [{ id: 'active' }],
      trashPosts: [{ id: 'trash' }],
    })

    const result = await copyLocalBoardPostsToRemote(repositories)

    expect(result).toEqual({ total: 3, copied: 1, skipped: 2, failed: 0 })
    expect(repositories.remoteRepository.createPost).toHaveBeenCalledTimes(1)
  })

  it('continues after an individual create failure', async () => {
    const repositories = createRepositories({
      localPosts: [{ id: 'fail' }, { id: 'success' }],
    })
    repositories.remoteRepository.createPost
      .mockRejectedValueOnce(new Error('failed'))
      .mockImplementationOnce(async (post) => post)

    await expect(copyLocalBoardPostsToRemote(repositories)).resolves.toEqual({
      total: 2,
      copied: 1,
      skipped: 0,
      failed: 1,
    })
  })
})
