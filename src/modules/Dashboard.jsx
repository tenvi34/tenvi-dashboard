import { useEffect, useState } from 'react'

import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { getMapArchiveSummary } from '../services/photoArchiveSummaryService.js'
import {
  getCalendarEventDateLabel,
  getMonthEvents,
  getNextEvent,
  getScheduledDateCount,
  getTodayEvents,
} from './calendarLogic.js'
import { getTodayDueTasks } from './tasksLogic.js'

const DASHBOARD_TABS = ['overview', 'work', 'archive', 'system']

// Dashboard 저장 목록 읽기
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

const readStoredNumber = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)
  const parsedValue = Number.parseInt(savedValue, 10)

  return Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue)
}

// Notes 작성 시각 변환
const getNoteTime = (note) => {
  const time = new Date(note.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

const getBoardPostTime = (post) => {
  const time = new Date(post.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

const MAP_SUMMARY_STATUS = {
  error: 'error',
  loading: 'loading',
  ready: 'ready',
}

function Dashboard({
  language = 'ko',
  startModule = 'tasks',
  t,
  theme = 'dark',
}) {
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview')
  const [mapSummaryState, setMapSummaryState] = useState({
    data: null,
    status: MAP_SUMMARY_STATUS.loading,
  })
  const tasks = readStoredList(STORAGE_KEYS.tasks)
  const notes = readStoredList(STORAGE_KEYS.notes)
  const boardPosts = readStoredList(STORAGE_KEYS.boardPosts)
  const calendarEvents = readStoredList(STORAGE_KEYS.calendarEvents)
  const completedTasks = tasks.filter((task) => task.completed).length
  const activeTasks = tasks.length - completedTasks
  const activeTaskList = tasks.filter((task) => !task.completed).slice(0, 4)
  const timerCompletedSessions = readStoredNumber(
    STORAGE_KEYS.timerCompletedSessions,
  )

  // Calendar 요약 재배치
  const allTodayEvents = getTodayEvents(calendarEvents)
  const todayEvents = allTodayEvents.slice(0, 3)
  const allTodayDueTasks = getTodayDueTasks(tasks)
  const todayDueTasks = allTodayDueTasks.slice(0, 3)
  const monthEvents = getMonthEvents(calendarEvents)
  const scheduledDateCount = getScheduledDateCount(monthEvents)
  const nextEvent = getNextEvent(calendarEvents)
  const recentNotes = [...notes]
    .sort((firstNote, secondNote) => getNoteTime(secondNote) - getNoteTime(firstNote))
    .slice(0, 3)
  const recentBoardPosts = [...boardPosts]
    .sort(
      (firstPost, secondPost) =>
        getBoardPostTime(secondPost) - getBoardPostTime(firstPost),
    )
    .slice(0, 3)
  const mapSummary = mapSummaryState.data
  const hasMapRecords = Number(mapSummary?.totalPhotoRecords) > 0
  const mapPhotoCount = Number(mapSummary?.totalPhotoRecords) || 0

  useEffect(() => {
    let isMounted = true

    // Map 요약 읽기 전용
    const loadMapSummary = async () => {
      setMapSummaryState((currentState) => ({
        ...currentState,
        status: MAP_SUMMARY_STATUS.loading,
      }))

      try {
        const summary = await getMapArchiveSummary()

        if (isMounted) {
          setMapSummaryState({
            data: summary,
            status: MAP_SUMMARY_STATUS.ready,
          })
        }
      } catch {
        if (isMounted) {
          setMapSummaryState({
            data: null,
            status: MAP_SUMMARY_STATUS.error,
          })
        }
      }
    }

    loadMapSummary()

    return () => {
      isMounted = false
    }
  }, [])

  const renderEmptyState = (message) => (
    <div className="empty-state compact-empty" role="status">
      <span>{t.common.systemMessage}</span>
      <p>{message}</p>
    </div>
  )

  const renderNoteList = (items = recentNotes) =>
    items.length > 0 ? (
      <ul>
        {items.map((note) => (
          <li className="recent-note" key={note.id}>
            <strong>{note.title || t.notes.untitled}</strong>
            {note.content ? <span>{note.content}</span> : null}
          </li>
        ))}
      </ul>
    ) : (
      renderEmptyState(t.dashboard.noRecentNotes)
    )

  const renderBoardPostList = () =>
    recentBoardPosts.length > 0 ? (
      <ul>
        {recentBoardPosts.map((post) => (
          <li className="recent-note" key={post.id}>
            <strong>{post.title}</strong>
            {post.author ? <span>{post.author}</span> : null}
          </li>
        ))}
      </ul>
    ) : (
      renderEmptyState(t.dashboard.noBoardPosts)
    )

  const renderTodayScheduleList = () =>
    todayEvents.length > 0 ? (
      <ul>
        {todayEvents.map((calendarEvent) => (
          <li className="recent-note" key={calendarEvent.id}>
            <strong>{calendarEvent.title}</strong>
            {calendarEvent.memo ? <span>{calendarEvent.memo}</span> : null}
          </li>
        ))}
      </ul>
    ) : (
      renderEmptyState(t.dashboard.noTodayEvents)
    )

  const renderDueTaskList = () =>
    todayDueTasks.length > 0 ? (
      <ul>
        {todayDueTasks.map((task) => (
          <li className="recent-note" key={task.id}>
            <strong>{task.title}</strong>
          </li>
        ))}
      </ul>
    ) : (
      renderEmptyState(t.dashboard.noTodayDueTasks)
    )

  const renderNextEvent = () =>
    nextEvent ? (
      <ul>
        <li className="recent-note">
          <strong>
            {getCalendarEventDateLabel(nextEvent)} - {nextEvent.title}
          </strong>
          {nextEvent.memo ? <span>{nextEvent.memo}</span> : null}
        </li>
      </ul>
    ) : (
      renderEmptyState(t.dashboard.noNextEvent)
    )

  const renderMapSummaryBody = () => {
    if (mapSummaryState.status === MAP_SUMMARY_STATUS.loading) {
      return renderEmptyState(t.dashboard.mapSummaryLoading)
    }

    if (mapSummaryState.status === MAP_SUMMARY_STATUS.error) {
      return renderEmptyState(t.dashboard.mapSummaryLoadError)
    }

    if (!hasMapRecords) {
      return renderEmptyState(t.dashboard.noMapRecords)
    }

    return (
      <>
        <div className="summary-metrics map-summary-metrics">
          <div className="summary-metric">
            <span>{t.dashboard.totalMapRecords}</span>
            <strong>{mapSummary.totalPhotoRecords}</strong>
          </div>
          <div className="summary-metric">
            <span>{t.dashboard.totalMapCollections}</span>
            <strong>{mapSummary.totalCollections}</strong>
          </div>
        </div>

        <div className="map-source-grid" aria-label={t.dashboard.mapLocationSources}>
          <div>
            <span>{t.dashboard.mapSourceExif}</span>
            <strong>{mapSummary.locationSourceCounts.exif}</strong>
          </div>
          <div>
            <span>{t.dashboard.mapSourceManual}</span>
            <strong>{mapSummary.locationSourceCounts.manual}</strong>
          </div>
          <div>
            <span>{t.dashboard.mapSourceSearch}</span>
            <strong>{mapSummary.locationSourceCounts.search}</strong>
          </div>
          <div>
            <span>{t.dashboard.mapSourceUnknown}</span>
            <strong>{mapSummary.locationSourceCounts.unknown}</strong>
          </div>
        </div>

        <div className="recent-notes">
          <p className="recent-notes-title">{t.dashboard.recentMapRecords}</p>
          <ul>
            {mapSummary.recentPhotoRecords.map((record) => (
              <li className="recent-note" key={record.id}>
                <strong>{record.title || t.dashboard.untitledMapRecord}</strong>
                <span>
                  {record.collectionName || t.map.unassignedCollection} /{' '}
                  {t.dashboard.mapLocationSourceValue(record.locationSource)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </>
    )
  }

  const renderOverviewTab = () => (
    <>
      {/* 개요 탭 */}
      <div className="dashboard-tab-grid dashboard-overview-grid">
        <section className="summary-panel dashboard-overview-panel">
          <div className="summary-panel-header">
            <p className="module-label">{t.dashboard.overviewMetrics}</p>
            <h3>{t.dashboard.quickStatus}</h3>
          </div>
          <dl className="dashboard-compact-list dashboard-overview-list">
            <div>
              <dt>{t.dashboard.activeTasks}</dt>
              <dd>{activeTasks}</dd>
            </div>
            <div>
              <dt>{t.dashboard.completedTasks}</dt>
              <dd>{completedTasks}</dd>
            </div>
            <div>
              <dt>{t.dashboard.todayEvents}</dt>
              <dd>{allTodayEvents.length || (nextEvent ? 1 : 0)}</dd>
            </div>
            <div>
              <dt>{t.dashboard.totalNotes}</dt>
              <dd>{notes.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.totalBoardPosts}</dt>
              <dd>{boardPosts.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.totalMapRecords}</dt>
              <dd>{mapPhotoCount}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  )

  const renderWorkTab = () => (
    <>
      {/* 작업 탭 */}
      <div className="dashboard-tab-grid dashboard-work-grid">
        <section className="summary-panel dashboard-work-panel">
          <div className="summary-panel-header">
            <p className="module-label">{t.dashboard.tasksSummary}</p>
            <h3>{t.modules.tasks}</h3>
          </div>
          <dl className="dashboard-compact-list dashboard-work-list">
            <div>
              <dt>{t.dashboard.totalTasks}</dt>
              <dd>{tasks.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.activeTasks}</dt>
              <dd>{activeTasks}</dd>
            </div>
            <div>
              <dt>{t.dashboard.completedTasks}</dt>
              <dd>{completedTasks}</dd>
            </div>
          </dl>
          <div className="recent-notes">
            <p className="recent-notes-title">{t.dashboard.activeTaskList}</p>
            {activeTaskList.length > 0 ? (
              <ul>
                {activeTaskList.map((task) => (
                  <li className="recent-note" key={task.id}>
                    <strong>{task.title}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              renderEmptyState(t.command.noActiveTasks)
            )}
          </div>
          <div className="recent-notes dashboard-due-tasks">
            <p className="recent-notes-title">{t.dashboard.todayDueTasks}</p>
            {renderDueTaskList()}
          </div>
        </section>

        <section className="summary-panel dashboard-work-panel">
          <div className="summary-panel-header">
            <p className="module-label">{t.dashboard.calendarSummary}</p>
            <h3>{t.modules.calendar}</h3>
          </div>
          <dl className="dashboard-compact-list dashboard-work-list">
            <div>
              <dt>{t.dashboard.todayEvents}</dt>
              <dd>{allTodayEvents.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.monthEvents}</dt>
              <dd>{monthEvents.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.scheduledDays}</dt>
              <dd>{scheduledDateCount}</dd>
            </div>
          </dl>
          <div className="recent-notes">
            <p className="recent-notes-title">{t.dashboard.todayEvents}</p>
            {renderTodayScheduleList()}
          </div>
          <div className="recent-notes dashboard-calendar-next">
            <p className="recent-notes-title">{t.dashboard.nextEvent}</p>
            {renderNextEvent()}
          </div>
        </section>
      </div>
    </>
  )

  const renderArchiveTab = () => (
    <>
      {/* 기록 탭 */}
      <div className="dashboard-tab-grid dashboard-archive-grid">
        <section className="summary-panel">
          <div className="summary-panel-header">
            <div>
              <p className="module-label">{t.dashboard.notesSummary}</p>
              <h3>{t.modules.notes}</h3>
            </div>
            <span className="dashboard-count-chip">
              {t.dashboard.totalNotes} {notes.length}
            </span>
          </div>
          <div className="recent-notes" aria-label={t.dashboard.recentNotes}>
            <p className="recent-notes-title">{t.dashboard.recentNotes}</p>
            {renderNoteList()}
          </div>
        </section>

        <section className="summary-panel">
          <div className="summary-panel-header">
            <div>
              <p className="module-label">{t.dashboard.boardSummary}</p>
              <h3>{t.modules.board}</h3>
            </div>
            <span className="dashboard-count-chip">
              {t.dashboard.totalBoardPosts} {boardPosts.length}
            </span>
          </div>
          <div className="recent-notes" aria-label={t.dashboard.recentBoardPosts}>
            <p className="recent-notes-title">{t.dashboard.recentBoardPosts}</p>
            {renderBoardPostList()}
          </div>
        </section>

        <section className="summary-panel">
          <div className="summary-panel-header">
            <p className="module-label">{t.dashboard.mapSummary}</p>
            <h3>{t.modules.map}</h3>
          </div>
          {renderMapSummaryBody()}
        </section>
      </div>
    </>
  )

  const renderSystemTab = () => (
    <>
      {/* 시스템 탭 */}
      <div className="dashboard-tab-grid dashboard-system-grid">
        <section className="summary-panel dashboard-system-panel">
          <div className="summary-panel-header">
            <div>
              <p className="module-label">{t.dashboard.systemSummary}</p>
              <h3>{t.dashboard.currentSettings}</h3>
            </div>
            <span className="dashboard-system-tag">CONFIG</span>
          </div>
          <dl className="dashboard-compact-list dashboard-system-list">
            <div>
              <dt>{t.dashboard.timerSessions}</dt>
              <dd>{timerCompletedSessions}</dd>
            </div>
            <div>
              <dt>{t.dashboard.currentLanguage}</dt>
              <dd>{t.languages[language] ?? language}</dd>
            </div>
            <div>
              <dt>{t.dashboard.defaultStartModule}</dt>
              <dd>{t.modules[startModule] ?? startModule}</dd>
            </div>
            <div>
              <dt>{t.dashboard.theme}</dt>
              <dd>{t.settings.themes[theme] ?? theme}</dd>
            </div>
          </dl>
        </section>

        <section className="summary-panel dashboard-system-panel">
          <div className="summary-panel-header">
            <div>
              <p className="module-label">{t.dashboard.storedData}</p>
              <h3>{t.dashboard.storageOverview}</h3>
            </div>
            <span className="dashboard-system-tag">STORE</span>
          </div>
          <dl className="dashboard-compact-list dashboard-system-list">
            <div>
              <dt>{t.dashboard.totalTasks}</dt>
              <dd>{tasks.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.totalNotes}</dt>
              <dd>{notes.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.totalBoardPosts}</dt>
              <dd>{boardPosts.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.totalSchedules}</dt>
              <dd>{calendarEvents.length}</dd>
            </div>
            <div>
              <dt>{t.dashboard.totalMapRecords}</dt>
              <dd>{mapPhotoCount}</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  )

  const tabRenderers = {
    archive: renderArchiveTab,
    overview: renderOverviewTab,
    system: renderSystemTab,
    work: renderWorkTab,
  }

  return (
    <section className="module-panel dashboard-module" aria-label={t.modules.dashboard}>
      {/* Dashboard 탭 */}
      <div className="dashboard-tabs" aria-label={t.dashboard.tabsLabel}>
        {DASHBOARD_TABS.map((tabId) => (
          <button
            className={`dashboard-tab ${
              activeDashboardTab === tabId ? 'is-active' : ''
            }`}
            key={tabId}
            type="button"
            onClick={() => setActiveDashboardTab(tabId)}
          >
            {t.dashboard.tabs[tabId]}
          </button>
        ))}
      </div>

      <div className="dashboard-tab-panel">
        {tabRenderers[activeDashboardTab]()}
      </div>
    </section>
  )
}

export default Dashboard
