import {
  createRemoteNote,
  deleteRemoteNote,
  fetchNote,
  fetchNotes,
  updateRemoteNote,
} from '../../../api/notesApi.js'

const defaultNotesApi = {
  createRemoteNote,
  deleteRemoteNote,
  fetchNote,
  fetchNotes,
  updateRemoteNote,
}

// Notes REMOTE repository adapter
export const createRemoteNoteRepository = (notesApi = defaultNotesApi) => ({
  // REMOTE Note 목록 조회
  fetchNotes() {
    return notesApi.fetchNotes()
  },

  // REMOTE Note 단건 조회
  fetchNote(id) {
    return notesApi.fetchNote(id)
  },

  // REMOTE Note 생성
  createNote(payload) {
    return notesApi.createRemoteNote(payload)
  },

  // REMOTE Note 수정
  updateNote(id, payload) {
    return notesApi.updateRemoteNote(id, payload)
  },

  // REMOTE Note 삭제
  deleteNote(id) {
    return notesApi.deleteRemoteNote(id)
  },
})

export const remoteNoteRepository = createRemoteNoteRepository()
