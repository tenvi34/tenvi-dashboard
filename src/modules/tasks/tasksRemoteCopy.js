import {
  localTaskRepository,
  remoteTaskRepository,
} from './repositories/index.js'

const toRemotePayload = (task) => ({
  id: task.id,
  title: task.title,
  dueDate: task.dueDate ?? '',
  completed: task.completed === true,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  deletedAt: task.deletedAt,
})

// LOCAL Tasks 원본 보존 단방향 복사
export const copyLocalTasksToRemote = async ({
  localRepository = localTaskRepository,
  remoteRepository = remoteTaskRepository,
} = {}) => {
  const localTasks = localRepository.fetchAllTasks()
  const result = {
    total: localTasks.length,
    copied: 0,
    skipped: 0,
    failed: 0,
  }

  if (localTasks.length === 0) {
    return result
  }

  const remoteTasks = await remoteRepository.fetchTasks()
  const remoteIds = new Set(remoteTasks.map((task) => String(task.id)))

  for (const task of localTasks) {
    if (remoteIds.has(String(task.id))) {
      result.skipped += 1
      continue
    }

    try {
      const createdTask = await remoteRepository.createTask(toRemotePayload(task))
      remoteIds.add(String(createdTask?.id ?? task.id))
      result.copied += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}
