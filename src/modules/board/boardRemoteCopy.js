import {
  localBoardCategoryRepository,
  remoteBoardCategoryRepository,
} from './boardCategoryRepository.js'
import {
  localBoardImageRepository,
  remoteBoardImageRepository,
} from './boardImageRepository.js'
import {
  localBoardPostRepository,
  remoteBoardPostRepository,
} from './repositories/index.js'

const toRemotePayload = (post) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  blocks: post.blocks,
  author: post.author,
  categoryId: post.categoryId,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  deletedAt: post.deletedAt,
  pinned: post.pinned,
  views: post.views,
})

const createCopyResult = (total) => ({
  total,
  copied: 0,
  skipped: 0,
  failed: 0,
})

// LOCAL 원본을 변경하지 않는 Board 게시글 복사
export const copyLocalBoardPostsToRemote = async ({
  localRepository = localBoardPostRepository,
  remoteRepository = remoteBoardPostRepository,
} = {}) => {
  const localPosts = localRepository.fetchAllPosts()
  const result = createCopyResult(localPosts.length)

  if (localPosts.length === 0) {
    return result
  }

  const [remotePosts, remoteTrashPosts] = await Promise.all([
    remoteRepository.fetchPosts(),
    remoteRepository.fetchTrashPosts(),
  ])
  const remoteIds = new Set(
    [...remotePosts, ...remoteTrashPosts].map((post) => String(post.id)),
  )

  for (const post of localPosts) {
    if (remoteIds.has(String(post.id))) {
      result.skipped += 1
      continue
    }

    try {
      const createdPost = await remoteRepository.createPost(toRemotePayload(post))
      remoteIds.add(String(createdPost?.id ?? post.id))
      result.copied += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}

export const copyLocalBoardCategoriesToRemote = async ({
  localRepository = localBoardCategoryRepository,
  remoteRepository = remoteBoardCategoryRepository,
} = {}) => {
  const localCategories = localRepository.fetchCategories()
  const result = createCopyResult(localCategories.length)

  if (localCategories.length === 0) {
    return result
  }

  const remoteCategories = await remoteRepository.fetchCategories()
  const remoteIds = new Set(remoteCategories.map((category) => String(category.id)))

  for (const category of localCategories) {
    if (remoteIds.has(String(category.id))) {
      result.skipped += 1
      continue
    }

    try {
      await remoteRepository.replaceCategories(
        [...remoteCategories, category],
        remoteCategories,
      )
      remoteIds.add(String(category.id))
      remoteCategories.push(category)
      result.copied += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}

export const copyLocalBoardImagesToRemote = async ({
  localRepository = localBoardImageRepository,
  remoteRepository = remoteBoardImageRepository,
} = {}) => {
  const localImages = await localRepository.getAllImages()
  const result = createCopyResult(localImages.length)

  if (localImages.length === 0) {
    return result
  }

  const remoteImages = await remoteRepository.fetchImages()
  const remoteIds = new Set(remoteImages.map((image) => String(image.id)))

  for (const image of localImages) {
    if (remoteIds.has(String(image.id))) {
      result.skipped += 1
      continue
    }

    try {
      const createdImage = await remoteRepository.createImage(image)
      remoteIds.add(String(createdImage?.id ?? image.id))
      result.copied += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}
