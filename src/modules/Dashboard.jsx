import { STORAGE_KEYS } from '../constants/storageKeys.js'

const readStoredList = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const getNoteTime = (note) => {
  const time = new Date(note.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function Dashboard({ t }) {
  const tasks = readStoredList(STORAGE_KEYS.tasks)
  const notes = readStoredList(STORAGE_KEYS.notes)
  const completedTasks = tasks.filter((task) => task.completed).length
  const activeTasks = tasks.length - completedTasks
  const recentNotes = [...notes]
    .sort((firstNote, secondNote) => getNoteTime(secondNote) - getNoteTime(firstNote))
    .slice(0, 3)

  return (
    <section
      className="module-panel dashboard-module"
      aria-labelledby="dashboard-title"
    >
      <div className="module-header">
        <div>
          <p className="module-label">{t.dashboard.label}</p>
          <h2 id="dashboard-title">{t.dashboard.title}</h2>
        </div>
      </div>

      <div className="dashboard-summary-grid">
        <section className="summary-panel" aria-labelledby="task-summary-title">
          <div className="summary-panel-header">
            <p className="module-label">{t.dashboard.tasksSummary}</p>
            <h3 id="task-summary-title">{t.modules.tasks}</h3>
          </div>
          <div className="summary-metrics">
            <div className="summary-metric">
              <span>{t.dashboard.totalTasks}</span>
              <strong>{tasks.length}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.dashboard.activeTasks}</span>
              <strong>{activeTasks}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.dashboard.completedTasks}</span>
              <strong>{completedTasks}</strong>
            </div>
          </div>
        </section>

        <section className="summary-panel" aria-labelledby="notes-summary-title">
          <div className="summary-panel-header">
            <p className="module-label">{t.dashboard.notesSummary}</p>
            <h3 id="notes-summary-title">{t.modules.notes}</h3>
          </div>
          <div className="summary-metric summary-metric-wide">
            <span>{t.dashboard.totalNotes}</span>
            <strong>{notes.length}</strong>
          </div>

          <div className="recent-notes" aria-label={t.dashboard.recentNotes}>
            <p className="recent-notes-title">{t.dashboard.recentNotes}</p>
            {recentNotes.length > 0 ? (
              <ul>
                {recentNotes.map((note) => (
                  <li className="recent-note" key={note.id}>
                    <strong>{note.title || t.notes.untitled}</strong>
                    {note.content ? <span>{note.content}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state compact-empty" role="status">
                <span>{t.common.systemMessage}</span>
                <p>{t.dashboard.noRecentNotes}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

export default Dashboard
