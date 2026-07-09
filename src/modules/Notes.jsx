import { useState } from 'react'
import useNotes from './notes/useNotes.js'
import './Notes.css'

// Notes 컴포넌트
function Notes({ t }) {
  const {
    createNote,
    deleteNote,
    error: notesError,
    loading: notesLoading,
    notes,
  } = useNotes()
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // Note 생성
  const handleAddNote = async (event) => {
    event.preventDefault()

    const title = noteTitle.trim()
    const content = noteContent.trim()

    if (!title && !content) {
      return
    }

    try {
      await createNote({
        // 기본 제목 fallback
        title: title || t.notes.untitled,
        content,
      })
      setNoteTitle('')
      setNoteContent('')
    } catch {
      // 저장 실패 메시지는 hook error로 표시
    }
  }

  // Note 삭제
  const handleDeleteNote = async (noteId) => {
    try {
      await deleteNote(noteId)
    } catch {
      // 저장 실패 메시지는 hook error로 표시
    }
  }

  // Note 작성 시각 표시
  const formatCreatedAt = (value) =>
    new Intl.DateTimeFormat(t.notes.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))

  return (
    <section className="module-panel notes-module" aria-labelledby="notes-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.notes.label}</p>
          <h2 id="notes-title">{t.notes.title}</h2>
        </div>
        <p className="module-meta">
          {t.notes.entries}: <span>{notes.length}</span>
        </p>
      </div>

      {notesLoading ? (
        <p className="board-storage-status">Notes 데이터를 불러오는 중입니다.</p>
      ) : null}
      {notesError ? (
        <p className="board-storage-status is-error" role="alert">
          {notesError}
        </p>
      ) : null}

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
