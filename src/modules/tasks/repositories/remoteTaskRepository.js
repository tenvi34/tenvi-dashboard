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

export const createRemoteTaskRepository = (tasksApi = defaultTasksApi) => ({
  fetchTasks() {
    return tasksApi.fetchTasks()
  },

  fetchTask(id) {
    return tasksApi.fetchTask(id)
  },

  createTask(payload) {
    return tasksApi.createRemoteTask(payload)
  },

  updateTask(id, payload) {
    return tasksApi.updateRemoteTask(id, payload)
  },

  deleteTask(id) {
    return tasksApi.deleteRemoteTask(id)
  },
})

export const remoteTaskRepository = createRemoteTaskRepository()
