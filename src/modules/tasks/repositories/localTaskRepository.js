import { STORAGE_KEYS } from '../../../constants/storageKeys.js'
import { createTask, normalizeTask, parseTasks } from '../../tasksLogic.js'

const DEFAULT_STORAGE_KEY = STORAGE_KEYS.tasks
const getDefaultStorage = () => globalThis.localStorage

const readTasks = (storage, storageKey) =>
  parseTasks(storage?.getItem(storageKey))

const writeTasks = (storage, storageKey, tasks) => {
  storage?.setItem(storageKey, JSON.stringify(tasks))
}

const findTask = (tasks, taskId) => tasks.find((task) => task.id === taskId) ?? null

export const createLocalTaskRepository = ({
  storage = getDefaultStorage(),
  storageKey = DEFAULT_STORAGE_KEY,
} = {}) => {
  const loadTasks = () => readTasks(storage, storageKey)
  const saveTasks = (tasks) => writeTasks(storage, storageKey, tasks)

  return {
    fetchAllTasks() {
      return loadTasks()
    },

    async fetchTasks() {
      return loadTasks().filter((task) => !task.deletedAt)
    },

    async createTask(payload) {
      const createdTask = createTask(payload)

      if (!createdTask) {
        throw new Error('Task title is required.')
      }

      saveTasks([createdTask, ...loadTasks()])

      return createdTask
    },

    async updateTask(id, payload) {
      const currentTasks = loadTasks()
      const targetTask = findTask(currentTasks, id)

      if (!targetTask) {
        throw new Error('Task not found.')
      }

      const updatedAt = new Date().toISOString()
      const nextTask = normalizeTask({
        ...targetTask,
        ...payload,
        id,
        updatedAt,
      })

      if (!nextTask) {
        throw new Error('Task title is required.')
      }

      saveTasks(currentTasks.map((task) => (task.id === id ? nextTask : task)))

      return nextTask
    },

    async deleteTask(id) {
      const currentTasks = loadTasks()

      if (!findTask(currentTasks, id)) {
        throw new Error('Task not found.')
      }

      saveTasks(currentTasks.filter((task) => task.id !== id))

      return null
    },
  }
}

export const localTaskRepository = createLocalTaskRepository()
