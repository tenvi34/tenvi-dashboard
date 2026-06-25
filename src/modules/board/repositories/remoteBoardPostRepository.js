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

export const createRemoteBoardPostRepository = (boardApi = defaultBoardApi) => ({
  // 백엔드 DTO가 프론트 BoardPost 이름을 그대로 내려주는 전제
  fetchPosts() {
    return boardApi.fetchBoardPosts()
  },

  fetchTrashPosts() {
    return boardApi.fetchTrashBoardPosts()
  },

  createPost(payload) {
    return boardApi.createBoardPost(payload)
  },

  updatePost(id, payload) {
    return boardApi.updateBoardPost(id, payload)
  },

  softDeletePost(id) {
    return boardApi.softDeleteBoardPost(id)
  },

  restorePost(id) {
    return boardApi.restoreBoardPost(id)
  },

  permanentlyDeletePost(id) {
    return boardApi.permanentlyDeleteBoardPost(id)
  },

  increaseViews(id) {
    return boardApi.increaseBoardPostViews(id)
  },
})

export const remoteBoardPostRepository = createRemoteBoardPostRepository()
