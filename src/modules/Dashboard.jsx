import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  getMonthEvents,
  getNextEvent,
  getScheduledDateCount,
  getTodayEvents,
} from './calendarLogic.js'
import { getTodayDueTasks } from './tasksLogic.js'

// Dashboard 요약에 사용할 저장 목록을 localStorage에서 안전하게 읽습니다.
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

// 최근 Notes 정렬에 사용할 작성 시각을 숫자로 변환합니다.
const getNoteTime = (note) => {
  const time = new Date(note.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

// Tasks, Notes, Calendar의 핵심 현황을 한 화면에 요약하는 컴포넌트입니다.
function Dashboard({ t }) {
  const tasks = readStoredList(STORAGE_KEYS.tasks)
  const notes = readStoredList(STORAGE_KEYS.notes)
  const calendarEvents = readStoredList(STORAGE_KEYS.calendarEvents)
  const completedTasks = tasks.filter((task) => task.completed).length
  const activeTasks = tasks.length - completedTasks
  // Dashboard는 Calendar 데이터를 읽기만 하며, 저장 key와 이벤트 구조는 Calendar 모듈과 동일하게 유지합니다.
  const allTodayEvents = getTodayEvents(calendarEvents)
  const todayEvents = getTodayEvents(calendarEvents).slice(0, 3)
  const allTodayDueTasks = getTodayDueTasks(tasks)
  const todayDueTasks = allTodayDueTasks.slice(0, 3)
  const monthEvents = getMonthEvents(calendarEvents)
  const scheduledDateCount = getScheduledDateCount(monthEvents)
  const nextEvent = getNextEvent(calendarEvents)
  const recentNotes = [...notes]
    .sort((firstNote, secondNote) => getNoteTime(secondNote) - getNoteTime(firstNote))
    .slice(0, 3)

  return (
    <section
      className="module-panel dashboard-module"
      aria-labelledby="dashboard-title"
    >
      {/* Dashboard 상단 제목 영역 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.dashboard.label}</p>
          <h2 id="dashboard-title">{t.dashboard.title}</h2>
        </div>
      </div>

      {/* Dashboard 요약 카드 영역: Tasks, Notes, Calendar 현황을 한 화면에서 확인합니다. */}
      <div className="dashboard-summary-grid">
        {/* Tasks 요약 카드 */}
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

        {/* Notes 요약 카드 */}
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

        <section
          className="summary-panel"
          aria-labelledby="calendar-summary-title"
        >
          {/* Calendar 요약 카드 */}
          <div className="summary-panel-header">
            <p className="module-label">{t.dashboard.calendarSummary}</p>
            <h3 id="calendar-summary-title">{t.modules.calendar}</h3>
          </div>
          <div className="summary-metrics">
            <div className="summary-metric">
              <span>{t.dashboard.todayEvents}</span>
              <strong>{allTodayEvents.length}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.dashboard.todayDueTasks}</span>
              <strong>{allTodayDueTasks.length}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.dashboard.monthEvents}</span>
              <strong>{monthEvents.length}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.dashboard.scheduledDays}</span>
              <strong>{scheduledDateCount}</strong>
            </div>
          </div>

          {/* 오늘 일정 일부 목록 */}
          <div className="recent-notes" aria-label={t.dashboard.todayEvents}>
            <p className="recent-notes-title">{t.dashboard.todayEvents}</p>
            {todayEvents.length > 0 ? (
              <ul>
                {todayEvents.map((calendarEvent) => (
                  <li className="recent-note" key={calendarEvent.id}>
                    <strong>{calendarEvent.title}</strong>
                    {calendarEvent.memo ? <span>{calendarEvent.memo}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state compact-empty" role="status">
                <span>{t.common.systemMessage}</span>
                <p>{t.dashboard.noTodayEvents}</p>
              </div>
            )}
          </div>

          {/* 오늘 마감 Task 일부 목록 */}
          <div className="recent-notes dashboard-due-tasks">
            <p className="recent-notes-title">{t.dashboard.todayDueTasks}</p>
            {todayDueTasks.length > 0 ? (
              <ul>
                {todayDueTasks.map((task) => (
                  <li className="recent-note" key={task.id}>
                    <strong>{task.title}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state compact-empty" role="status">
                <span>{t.common.systemMessage}</span>
                <p>{t.dashboard.noTodayDueTasks}</p>
              </div>
            )}
          </div>

          {/* 다음 예정 일정 1개 */}
          <div className="recent-notes dashboard-calendar-next">
            <p className="recent-notes-title">{t.dashboard.nextEvent}</p>
            {nextEvent ? (
              <ul>
                <li className="recent-note">
                  <strong>
                    {nextEvent.date} - {nextEvent.title}
                  </strong>
                  {nextEvent.memo ? <span>{nextEvent.memo}</span> : null}
                </li>
              </ul>
            ) : (
              <div className="empty-state compact-empty" role="status">
                <span>{t.common.systemMessage}</span>
                <p>{t.dashboard.noNextEvent}</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  )
}

export default Dashboard
