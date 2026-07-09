import {
  createBoardPost,
  fetchBoardPosts,
  fetchTrashBoardPosts,
  increaseBoardPostViews,
  permanentlyDeleteBoardPost,
  restoreBoardPost,
  softDeleteBoardPost,
  updateBoardPost,
} from '../../../api/boardApi.js'

const defaultBoardApi = {
  createBoardPost,
  fetchBoardPosts,
  fetchTrashBoardPosts,
  increaseBoardPostViews,
  permanentlyDeleteBoardPost,
  restoreBoardPost,
  softDeleteBoardPost,
  updateBoardPost,
}

// Board REMOTE repository adapter
export const createRemoteBoardPostRepository = (boardApi = defaultBoardApi) => ({
  // 백엔드 DTO가 프론트 BoardPost 이름을 그대로 내려주는 전제
  // REMOTE 활성 게시글 목록 조회
  fetchPosts() {
    return boardApi.fetchBoardPosts()
  },

  // REMOTE 휴지통 게시글 목록 조회
  fetchTrashPosts() {
    return boardApi.fetchTrashBoardPosts()
  },

  // REMOTE 게시글 생성
  createPost(payload) {
    return boardApi.createBoardPost(payload)
  },

  // REMOTE 게시글 수정
  updatePost(id, payload) {
    return boardApi.updateBoardPost(id, payload)
  },

  // REMOTE 게시글 soft delete
  softDeletePost(id) {
    return boardApi.softDeleteBoardPost(id)
  },

  // REMOTE 게시글 복원
  restorePost(id) {
    return boardApi.restoreBoardPost(id)
  },

  // REMOTE 게시글 영구 삭제
  permanentlyDeletePost(id) {
    return boardApi.permanentlyDeleteBoardPost(id)
  },

  // REMOTE 조회수 증가
  increaseViews(id) {
    return boardApi.increaseBoardPostViews(id)
  },
})

export const remoteBoardPostRepository = createRemoteBoardPostRepository()
