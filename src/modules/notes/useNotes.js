import { useCallback, useEffect, useMemo, useState } from 'react'
import { readNotesStorageMode } from '../notesStorageMode.js'
import {
  localNoteRepository,
  remoteNoteRepository,
} from './repositories/index.js'

const REMOTE_ERROR_MESSAGE =
  'Notes 서버에 연결할 수 없어 이번 화면에서는 Local 데이터로 표시합니다.'

// Notes 저장소 컨트롤러
function useNotes() {
  // 저장소 모드별 repository 선택
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
  // REMOTE 장애 시 현재 세션 LOCAL 쓰기
  const actionRepository = isLocalFallback ? localNoteRepository : repository

  // 선택 저장소 기준 목록 동기화
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
      // REMOTE 장애 fallback
      setNotes(localNoteRepository.fetchAllNotes())
      setError(REMOTE_ERROR_MESSAGE)
      setIsLocalFallback(true)
    } finally {
      setLoading(false)
    }
  }, [repository, storageMode])

  useEffect(() => {
    // REMOTE 모드 초기 조회
    if (storageMode === 'remote') {
      void Promise.resolve().then(refreshNotes)
    }
  }, [refreshNotes, storageMode])

  // 저장 후 목록 재조회 공통 흐름
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
