import {
  localBoardPostRepository,
  remoteBoardPostRepository,
} from './repositories/index.js'

// TODO: REMOTE 카테고리 저장 API 추가 시 STORAGE_KEYS.boardCategories 복사도 연결
// 현재는 게시글의 categoryId만 그대로 전달
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

// LOCAL 원본을 변경하지 않는 게시글 단방향 복사
export const copyLocalBoardPostsToRemote = async ({
  localRepository = localBoardPostRepository,
  remoteRepository = remoteBoardPostRepository,
} = {}) => {
  const localPosts = localRepository.fetchAllPosts()
  const result = {
    total: localPosts.length,
    copied: 0,
    skipped: 0,
    failed: 0,
  }

  if (localPosts.length === 0) {
    return result
  }

  // 휴지통 글까지 조회해 REMOTE 전체 id 기준으로 중복 방지
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
      // 개별 실패가 나머지 게시글 복사를 막지 않도록 격리
      result.failed += 1
    }
  }

  return result
}
