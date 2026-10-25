import { useEffect, useState } from 'react'
import './Dashboard.css'

import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { getMapArchiveSummary } from '../services/photoArchiveSummaryService.js'
import {
  getCalendarEventDateLabel,
  getMonthEvents,
  getNextEvent,
  getScheduledDateCount,
  getTodayEvents,
} from './calendarLogic.js'

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
  startModule = 'dashboard',
  t,
  theme = 'dark',
}) {
  const [activeDashboardTab, setActiveDashboardTab] = useState('overview')
  const [mapSummaryState, setMapSummaryState] = useState({
    data: null,
    status: MAP_SUMMARY_STATUS.loading,
  })
  const boardPosts = readStoredList(STORAGE_KEYS.boardPosts)
  const calendarEvents = readStoredList(STORAGE_KEYS.calendarEvents)
  // Calendar 요약 재배치
  const allTodayEvents = getTodayEvents(calendarEvents)
  const todayEvents = allTodayEvents.slice(0, 3)
  const monthEvents = getMonthEvents(calendarEvents)
  const scheduledDateCount = getScheduledDateCount(monthEvents)
  const nextEvent = getNextEvent(calendarEvents)
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

  const renderBoardPostList = () =>
    recentBoardPosts.length > 0 ? (
      <ul>
        {recentBoardPosts.map((post) => (
          <li className="summary-list-item" key={post.id}>
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
          <li className="summary-list-item" key={calendarEvent.id}>
            <strong>{calendarEvent.title}</strong>
            {calendarEvent.memo ? <span>{calendarEvent.memo}</span> : null}
          </li>
        ))}
      </ul>
    ) : (
      renderEmptyState(t.dashboard.noTodayEvents)
    )

  const renderNextEvent = () =>
    nextEvent ? (
      <ul>
        <li className="summary-list-item">
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

        <div className="summary-list">
          <p className="summary-list-title">{t.dashboard.recentMapRecords}</p>
          <ul>
            {mapSummary.recentPhotoRecords.map((record) => (
              <li className="summary-list-item" key={record.id}>
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
              <dt>{t.dashboard.todayEvents}</dt>
              <dd>{allTodayEvents.length || (nextEvent ? 1 : 0)}</dd>
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
          <div className="summary-list">
            <p className="summary-list-title">{t.dashboard.todayEvents}</p>
            {renderTodayScheduleList()}
          </div>
          <div className="summary-list dashboard-calendar-next">
            <p className="summary-list-title">{t.dashboard.nextEvent}</p>
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
              <p className="module-label">{t.dashboard.boardSummary}</p>
              <h3>{t.modules.board}</h3>
            </div>
            <span className="dashboard-count-chip">
              {t.dashboard.totalBoardPosts} {boardPosts.length}
            </span>
          </div>
          <div className="summary-list" aria-label={t.dashboard.recentBoardPosts}>
            <p className="summary-list-title">{t.dashboard.recentBoardPosts}</p>
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
