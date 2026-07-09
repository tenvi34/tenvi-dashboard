import { useCallback, useEffect, useMemo, useState } from 'react'
import { readNotesStorageMode } from '../notesStorageMode.js'
import {
  localNoteRepository,
  remoteNoteRepository,
} from './repositories/index.js'

const REMOTE_ERROR_MESSAGE =
  'Notes 서버에 연결할 수 없어 이번 화면에서는 Local 데이터로 표시합니다.'

function useNotes() {
  const [storageMode] = useState(() => readNotesStorageMode())
  const repository = useMemo(
    () => (storageMode === 'remote' ? remoteNoteRepository : localNoteRepository),
    [storageMode],
  )
  const [notes, setNotes] = useState(() =>
    storageMode === 'local' ? localNoteRepository.fetchAllNotes() : [],
  )
  const [loading, setLoading] = useState(storageMode === 'remote')
  const [error, setError] = useState(null)
  const [isLocalFallback, setIsLocalFallback] = useState(false)
  const actionRepository = isLocalFallback ? localNoteRepository : repository

  const refreshNotes = useCallback(async () => {
    if (storageMode === 'local') {
      setNotes(localNoteRepository.fetchAllNotes())
      setError(null)
      return
    }

    setLoading(true)

    try {
      setNotes(await repository.fetchNotes())
      setError(null)
      setIsLocalFallback(false)
    } catch {
      setNotes(localNoteRepository.fetchAllNotes())
      setError(REMOTE_ERROR_MESSAGE)
      setIsLocalFallback(true)
    } finally {
      setLoading(false)
    }
  }, [repository, storageMode])

  useEffect(() => {
    if (storageMode === 'remote') {
      void Promise.resolve().then(refreshNotes)
    }
  }, [refreshNotes, storageMode])

  const runAction = async (action) => {
    if (!isLocalFallback) setError(null)

    try {
      const result = await action()
      await refreshNotes()
      return result
    } catch (actionError) {
      if (storageMode === 'remote') setError(REMOTE_ERROR_MESSAGE)
      throw actionError
    }
  }

  return {
    createNote: (payload) => runAction(() => actionRepository.createNote(payload)),
    deleteNote: (id) => runAction(() => actionRepository.deleteNote(id)),
    error,
    loading,
    notes,
    storageMode,
    updateNote: (id, payload) =>
      runAction(() => actionRepository.updateNote(id, payload)),
  }
}

export default useNotes
