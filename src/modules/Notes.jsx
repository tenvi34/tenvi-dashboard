import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

// Notes key 공유
const STORAGE_KEY = STORAGE_KEYS.notes

// Notes 컴포넌트
function Notes({ t }) {
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem(STORAGE_KEY)

    if (!savedNotes) {
      return []
    }

    try {
      // 손상 JSON fallback
      return JSON.parse(savedNotes)
    } catch {
      return []
    }
  })
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // notes 저장 반영
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  // Note 생성
  const handleAddNote = (event) => {
    event.preventDefault()

    const title = noteTitle.trim()
    const content = noteContent.trim()

    if (!title && !content) {
      return
    }

    setNotes((currentNotes) => [
      {
        id: crypto.randomUUID(),
        // 기본 제목 fallback
        title: title || t.notes.untitled,
        content,
        createdAt: new Date().toISOString(),
      },
      ...currentNotes,
    ])
    setNoteTitle('')
    setNoteContent('')
  }

  // Note 삭제
  const handleDeleteNote = (noteId) => {
    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== noteId),
    )
  }

  // Note 작성 시각 표시
  const formatCreatedAt = (value) =>
    new Intl.DateTimeFormat(t.notes.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))

  return (
    <section className="module-panel notes-module" aria-labelledby="notes-title">
      {/* Notes 헤더 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.notes.label}</p>
          <h2 id="notes-title">{t.notes.title}</h2>
        </div>
        <p className="module-meta">
          {t.notes.entries}: <span>{notes.length}</span>
        </p>
      </div>

      {/* Note 입력 영역 */}
      <form className="notes-form" onSubmit={handleAddNote}>
        <label className="sr-only" htmlFor="note-title">
          {t.notes.titleLabel}
        </label>
        <input
          id="note-title"
          type="text"
          value={noteTitle}
          onChange={(event) => setNoteTitle(event.target.value)}
          placeholder={t.notes.titlePlaceholder}
        />

        <label className="sr-only" htmlFor="note-content">
          {t.notes.contentLabel}
        </label>
        <textarea
          id="note-content"
          value={noteContent}
          onChange={(event) => setNoteContent(event.target.value)}
          placeholder={t.notes.contentPlaceholder}
          rows="5"
        />

        <button type="submit">{t.notes.store}</button>
      </form>

      {/* Note 목록 */}
      {notes.length > 0 ? (
        <ul className="notes-list" aria-label={t.notes.listLabel}>
          {notes.map((note) => (
            <li className="note-item" key={note.id}>
              <div className="note-body">
                <div className="note-header">
                  <h3>{note.title}</h3>
                  <time dateTime={note.createdAt}>
                    {formatCreatedAt(note.createdAt)}
                  </time>
                </div>
                {note.content ? <p>{note.content}</p> : null}
              </div>
              <button
                type="button"
                className="delete-button"
                onClick={() => handleDeleteNote(note.id)}
              >
                {t.common.delete}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{t.notes.emptyMessage}</p>
        </div>
      )}
    </section>
  )
}

export default Notes
