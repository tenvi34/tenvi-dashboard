import { STORAGE_KEYS } from '../../../constants/storageKeys.js'
import { createNote, normalizeNote, parseNotes } from '../../notesLogic.js'

const DEFAULT_STORAGE_KEY = STORAGE_KEYS.notes
const getDefaultStorage = () => globalThis.localStorage

const readNotes = (storage, storageKey) =>
  parseNotes(storage?.getItem(storageKey))

const writeNotes = (storage, storageKey, notes) => {
  storage?.setItem(storageKey, JSON.stringify(notes))
}

const findNote = (notes, noteId) => notes.find((note) => note.id === noteId) ?? null

export const createLocalNoteRepository = ({
  storage = getDefaultStorage(),
  storageKey = DEFAULT_STORAGE_KEY,
} = {}) => {
  const loadNotes = () => readNotes(storage, storageKey)
  const saveNotes = (notes) => writeNotes(storage, storageKey, notes)

  return {
    fetchAllNotes() {
      return loadNotes()
    },

    async fetchNotes() {
      return loadNotes().filter((note) => !note.deletedAt)
    },

    async createNote(payload) {
      const createdNote = createNote(payload)

      if (!createdNote) {
        throw new Error('Note title or content is required.')
      }

      saveNotes([createdNote, ...loadNotes()])

      return createdNote
    },

    async updateNote(id, payload) {
      const currentNotes = loadNotes()
      const targetNote = findNote(currentNotes, id)

      if (!targetNote) {
        throw new Error('Note not found.')
      }

      const nextNote = normalizeNote({
        ...targetNote,
        ...payload,
        id,
        updatedAt: new Date().toISOString(),
      })

      if (!nextNote) {
        throw new Error('Note not found.')
      }

      saveNotes(currentNotes.map((note) => (note.id === id ? nextNote : note)))

      return nextNote
    },

    async deleteNote(id) {
      const currentNotes = loadNotes()

      if (!findNote(currentNotes, id)) {
        throw new Error('Note not found.')
      }

      saveNotes(currentNotes.filter((note) => note.id !== id))

      return null
    },
  }
}

export const localNoteRepository = createLocalNoteRepository()
