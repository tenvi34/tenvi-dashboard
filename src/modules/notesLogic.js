export const createNote = ({
  content = '',
  createdAt = new Date().toISOString(),
  id,
  title,
}) => {
  const normalizedTitle = String(title ?? '').trim()
  const normalizedContent = String(content ?? '').trim()

  if (!normalizedTitle && !normalizedContent) {
    return null
  }

  return {
    id: id ?? crypto.randomUUID(),
    title: normalizedTitle,
    content: normalizedContent,
    createdAt,
  }
}

// localStorage/REMOTE 응답 Note 구조 보정
export const normalizeNote = (
  note,
  fallbackCreatedAt = new Date().toISOString(),
) => {
  if (!note?.id) {
    return null
  }

  const createdAt = String(note.createdAt ?? fallbackCreatedAt)
  const normalizedNote = {
    id: String(note.id),
    title: String(note.title ?? ''),
    content: String(note.content ?? ''),
    createdAt,
  }

  if (note.updatedAt) {
    normalizedNote.updatedAt = String(note.updatedAt)
  }

  if (note.deletedAt) {
    normalizedNote.deletedAt = String(note.deletedAt)
  }

  return normalizedNote
}

export const parseNotes = (rawNotes, fallbackNotes = []) => {
  if (!rawNotes) {
    return fallbackNotes
  }

  try {
    const parsedNotes = JSON.parse(rawNotes)

    return Array.isArray(parsedNotes)
      ? parsedNotes.map((note) => normalizeNote(note)).filter(Boolean)
      : []
  } catch {
    return []
  }
}
