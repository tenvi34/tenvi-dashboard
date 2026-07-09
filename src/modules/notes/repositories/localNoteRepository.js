import { STORAGE_KEYS } from '../../../constants/storageKeys.js'
import { createNote, normalizeNote, parseNotes } from '../../notesLogic.js'

const DEFAULT_STORAGE_KEY = STORAGE_KEYS.notes
const getDefaultStorage = () => globalThis.localStorage

// localStorage Notes 원본 복원
const readNotes = (storage, storageKey) =>
  parseNotes(storage?.getItem(storageKey))

// 기존 Notes 저장 key 유지
const writeNotes = (storage, storageKey, notes) => {
  storage?.setItem(storageKey, JSON.stringify(notes))
}

const findNote = (notes, noteId) => notes.find((note) => note.id === noteId) ?? null

export const createLocalNoteRepository = ({
  storage = getDefaultStorage(),
  storageKey = DEFAULT_STORAGE_KEY,
} = {}) => {
  // 저장소 접근 경로 주입 가능
  const loadNotes = () => readNotes(storage, storageKey)
  const saveNotes = (notes) => writeNotes(storage, storageKey, notes)

  return {
    // 전체 Note 원본 조회
    fetchAllNotes() {
      return loadNotes()
    },

    // 활성 Note 목록 조회
    async fetchNotes() {
      return loadNotes().filter((note) => !note.deletedAt)
    },

    // LOCAL Note 생성
    async createNote(payload) {
      const createdNote = createNote(payload)

      if (!createdNote) {
        throw new Error('Note title or content is required.')
      }

      saveNotes([createdNote, ...loadNotes()])

      return createdNote
    },

    // LOCAL Note 수정
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

    // LOCAL Note 삭제
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
