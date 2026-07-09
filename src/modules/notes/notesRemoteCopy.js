import {
  localNoteRepository,
  remoteNoteRepository,
} from './repositories/index.js'

const toRemotePayload = (note) => ({
  id: note.id,
  title: note.title,
  content: note.content,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  deletedAt: note.deletedAt,
})

// LOCAL Notes 원본 보존 단방향 복사
export const copyLocalNotesToRemote = async ({
  localRepository = localNoteRepository,
  remoteRepository = remoteNoteRepository,
} = {}) => {
  const localNotes = localRepository.fetchAllNotes()
  const result = {
    total: localNotes.length,
    copied: 0,
    skipped: 0,
    failed: 0,
  }

  if (localNotes.length === 0) {
    return result
  }

  const remoteNotes = await remoteRepository.fetchNotes()
  const remoteIds = new Set(remoteNotes.map((note) => String(note.id)))

  for (const note of localNotes) {
    if (remoteIds.has(String(note.id))) {
      result.skipped += 1
      continue
    }

    try {
      const createdNote = await remoteRepository.createNote(toRemotePayload(note))
      remoteIds.add(String(createdNote?.id ?? note.id))
      result.copied += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}
