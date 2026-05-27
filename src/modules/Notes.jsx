import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

// Command와 Settings도 같은 키를 사용하므로 변경 시 연동 로직을 함께 확인해야 합니다.
const STORAGE_KEY = STORAGE_KEYS.notes

// 사용자의 Note 추가, 삭제, 저장을 관리하는 컴포넌트입니다.
function Notes({ t }) {
  const [notes, setNotes] = useState(() => {
    const savedNotes = localStorage.getItem(STORAGE_KEY)

    if (!savedNotes) {
      return []
    }

    try {
      // 깨진 JSON은 사용자가 화면을 계속 열 수 있도록 빈 목록으로 취급합니다.
      return JSON.parse(savedNotes)
    } catch {
      return []
    }
  })
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  // notes 배열이 바뀔 때마다 브라우저 저장소에 최신 상태를 반영합니다.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  // 입력된 제목과 내용을 정리해 새 Note로 저장합니다.
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
        // 내용만 있는 메모도 잃지 않도록 현재 언어의 기본 제목을 사용합니다.
        title: title || t.notes.untitled,
        content,
        createdAt: new Date().toISOString(),
      },
      ...currentNotes,
    ])
    setNoteTitle('')
    setNoteContent('')
  }

  // 지정한 Note를 현재 목록에서 제거합니다.
  const handleDeleteNote = (noteId) => {
    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== noteId),
    )
  }

  // Note 작성 시각을 현재 언어권에 맞는 날짜/시간 문자열로 변환합니다.
  const formatCreatedAt = (value) =>
    new Intl.DateTimeFormat(t.notes.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))

  return (
    <section className="module-panel notes-module" aria-labelledby="notes-title">
      {/* Notes 상단 제목과 저장된 노트 개수 표시 영역 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.notes.label}</p>
          <h2 id="notes-title">{t.notes.title}</h2>
        </div>
        <p className="module-meta">
          {t.notes.entries}: <span>{notes.length}</span>
        </p>
      </div>

      {/* 새 Note 입력 영역 */}
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

      {/* Note 목록 또는 빈 상태 메시지 */}
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
