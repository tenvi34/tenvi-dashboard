import {
  createRemoteTask,
  deleteRemoteTask,
  fetchTask,
  fetchTasks,
  updateRemoteTask,
} from '../../../api/tasksApi.js'

const defaultTasksApi = {
  createRemoteTask,
  deleteRemoteTask,
  fetchTask,
  fetchTasks,
  updateRemoteTask,
}

// Tasks REMOTE repository adapter
export const createRemoteTaskRepository = (tasksApi = defaultTasksApi) => ({
  // REMOTE Task 목록 조회
  fetchTasks() {
    return tasksApi.fetchTasks()
  },

  // REMOTE Task 단건 조회
  fetchTask(id) {
    return tasksApi.fetchTask(id)
  },

  // REMOTE Task 생성
  createTask(payload) {
    return tasksApi.createRemoteTask(payload)
  },

  // REMOTE Task 수정
  updateTask(id, payload) {
    return tasksApi.updateRemoteTask(id, payload)
  },

  // REMOTE Task 삭제
  deleteTask(id) {
    return tasksApi.deleteRemoteTask(id)
  },
})

export const remoteTaskRepository = createRemoteTaskRepository()
