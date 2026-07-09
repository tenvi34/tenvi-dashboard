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

export const createRemoteNoteRepository = (notesApi = defaultNotesApi) => ({
  fetchNotes() {
    return notesApi.fetchNotes()
  },

  fetchNote(id) {
    return notesApi.fetchNote(id)
  },

  createNote(payload) {
    return notesApi.createRemoteNote(payload)
  },

  updateNote(id, payload) {
    return notesApi.updateRemoteNote(id, payload)
  },

  deleteNote(id) {
    return notesApi.deleteRemoteNote(id)
  },
})

export const remoteNoteRepository = createRemoteNoteRepository()
