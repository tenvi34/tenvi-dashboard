import { useCallback, useEffect, useMemo, useState } from 'react'
import { readTasksStorageMode } from '../tasksStorageMode.js'
import {
  localTaskRepository,
  remoteTaskRepository,
} from './repositories/index.js'

const REMOTE_ERROR_MESSAGE =
  'Tasks 서버에 연결할 수 없어 이번 화면에서는 Local 데이터로 표시합니다.'

function useTasks() {
  const [storageMode] = useState(() => readTasksStorageMode())
  const repository = useMemo(
    () => (storageMode === 'remote' ? remoteTaskRepository : localTaskRepository),
    [storageMode],
  )
  const [tasks, setTasks] = useState(() =>
    storageMode === 'local' ? localTaskRepository.fetchAllTasks() : [],
  )
  const [loading, setLoading] = useState(storageMode === 'remote')
  const [error, setError] = useState(null)
  const [isLocalFallback, setIsLocalFallback] = useState(false)
  const actionRepository = isLocalFallback ? localTaskRepository : repository

  const refreshTasks = useCallback(async () => {
    if (storageMode === 'local') {
      setTasks(localTaskRepository.fetchAllTasks())
      setError(null)
      return
    }

    setLoading(true)

    try {
      setTasks(await repository.fetchTasks())
      setError(null)
      setIsLocalFallback(false)
    } catch {
      setTasks(localTaskRepository.fetchAllTasks())
      setError(REMOTE_ERROR_MESSAGE)
      setIsLocalFallback(true)
    } finally {
      setLoading(false)
    }
  }, [repository, storageMode])

  useEffect(() => {
    if (storageMode === 'remote') {
      void Promise.resolve().then(refreshTasks)
    }
  }, [refreshTasks, storageMode])

  const runAction = async (action) => {
    if (!isLocalFallback) setError(null)

    try {
      const result = await action()
      await refreshTasks()
      return result
    } catch (actionError) {
      if (storageMode === 'remote') setError(REMOTE_ERROR_MESSAGE)
      throw actionError
    }
  }

  return {
    createTask: (payload) => runAction(() => actionRepository.createTask(payload)),
    deleteTask: (id) => runAction(() => actionRepository.deleteTask(id)),
    error,
    loading,
    storageMode,
    tasks,
    updateTask: (id, payload) =>
      runAction(() => actionRepository.updateTask(id, payload)),
  }
}

export default useTasks
