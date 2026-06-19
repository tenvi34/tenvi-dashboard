import { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import './Settings.css'
import {
  getPhotoRecordCount,
  getPhotoRecords,
  replacePhotoArchiveData,
  replacePhotoRecords,
} from '../services/photoArchiveRepository.js'
import {
  preparePhotoCollectionsForRestore,
  preparePhotoRecordsForRestore,
  serializePhotoCollectionsForBackup,
  serializePhotoRecordsForBackup,
} from '../services/photoArchiveBackupService.js'
import { getPhotoCollections } from '../services/photoCollectionRepository.js'
import {
  BACKUP_APP,
  BACKUP_TYPE,
  BACKUP_VERSION,
  createBackupFileName,
  LANGUAGES,
  START_MODULES,
  THEMES,
  validateBackupPayload,
} from './settingsBackup.js'

// Settings 저장 key
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
const NOTES_STORAGE_KEY = STORAGE_KEYS.notes
const BOARD_POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts
const CALENDAR_EVENTS_STORAGE_KEY = STORAGE_KEYS.calendarEvents

// 저장 목록 개수 읽기
const readStoredCount = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return 0
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    // 저장소 상태 fallback
    return Array.isArray(parsedValue) ? parsedValue.length : 0
  } catch {
    return 0
  }
}

// 백업용 목록 복원
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

// 백업용 Timer 세션 복원
const readStoredCompletedSessions = () => {
  const savedValue = localStorage.getItem(STORAGE_KEYS.timerCompletedSessions)
  const parsedValue = Number.parseInt(savedValue, 10)

  return Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue)
}

// Settings 컴포넌트
function Settings({
  language,
  onLanguageChange,
  onStartModuleChange,
  onThemeChange,
  startModule,
  t,
  theme,
}) {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [backupStatus, setBackupStatus] = useState(null)
  const [mapPhotoCount, setMapPhotoCount] = useState(0)
  const backupFileInputRef = useRef(null)
  const taskCount = readStoredCount(TASKS_STORAGE_KEY)
  const noteCount = readStoredCount(NOTES_STORAGE_KEY)
  const boardPostCount = readStoredCount(BOARD_POSTS_STORAGE_KEY)
  const calendarEventCount = readStoredCount(CALENDAR_EVENTS_STORAGE_KEY)

  useEffect(() => {
    let isMounted = true

    // Map 기록 개수 반영
    getPhotoRecordCount()
      .then((count) => {
        if (isMounted) {
          setMapPhotoCount(count)
        }
      })
      .catch(() => {
        if (isMounted) {
          setMapPhotoCount(0)
        }
      })

    return () => {
      isMounted = false
    }
  }, [dataVersion])

  // Tasks/Notes 초기화
  const handleConfirmReset = () => {
    // 앱 설정 유지
    localStorage.removeItem(TASKS_STORAGE_KEY)
    localStorage.removeItem(NOTES_STORAGE_KEY)
    setIsResetConfirmOpen(false)
    setDataVersion((currentVersion) => currentVersion + 1)
  }

  // reset 후 개수 갱신
  void dataVersion

  // JSON 백업 내보내기
  const handleExportBackup = async () => {
    try {
      const mapPhotoRecords = await serializePhotoRecordsForBackup(
        await getPhotoRecords(),
      )
      const mapPhotoCollections = serializePhotoCollectionsForBackup(
        await getPhotoCollections(),
      )
      const backupPayload = {
        app: BACKUP_APP,
        type: BACKUP_TYPE,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        data: {
          tasks: readStoredList(STORAGE_KEYS.tasks),
          notes: readStoredList(STORAGE_KEYS.notes),
          boardPosts: readStoredList(STORAGE_KEYS.boardPosts),
          calendarEvents: readStoredList(STORAGE_KEYS.calendarEvents),
          timerCompletedSessions: readStoredCompletedSessions(),
          language,
          startModule,
          theme,
          mapPhotoCollections,
          mapPhotoRecords,
        },
      }
      const backupBlob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json',
      })
      const backupUrl = URL.createObjectURL(backupBlob)
      const downloadLink = document.createElement('a')

      downloadLink.href = backupUrl
      downloadLink.download = createBackupFileName()
      downloadLink.click()
      URL.revokeObjectURL(backupUrl)
      setBackupStatus({ type: 'success', message: t.settings.backupExported })
    } catch {
      setBackupStatus({ type: 'error', message: t.settings.backupReadError })
    }
  }

  // JSON 백업 복원
  const restoreLocalStorageData = (validatedBackup) => {
    // 기존 key 구조 유지
    localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(validatedBackup.tasks))
    localStorage.setItem(STORAGE_KEYS.notes, JSON.stringify(validatedBackup.notes))
    if (validatedBackup.hasBoardPosts) {
      localStorage.setItem(
        STORAGE_KEYS.boardPosts,
        JSON.stringify(validatedBackup.boardPosts),
      )
    }
    if (validatedBackup.hasCalendarEvents) {
      localStorage.setItem(
        STORAGE_KEYS.calendarEvents,
        JSON.stringify(validatedBackup.calendarEvents),
      )
    }
    localStorage.setItem(
      STORAGE_KEYS.timerCompletedSessions,
      String(validatedBackup.timerCompletedSessions),
    )
    localStorage.setItem(STORAGE_KEYS.language, validatedBackup.language)
    localStorage.setItem(STORAGE_KEYS.startModule, validatedBackup.startModule)
    localStorage.setItem(STORAGE_KEYS.theme, validatedBackup.theme)
  }

  const handleRestoreBackup = async (event) => {
    const backupFile = event.target.files?.[0]

    if (!backupFile) {
      return
    }

    try {
      const backupPayload = JSON.parse(await backupFile.text())
      // 백업 형식 사전 검증
      const validatedBackup = validateBackupPayload(backupPayload)

      if (!validatedBackup) {
        setBackupStatus({ type: 'error', message: t.settings.backupInvalid })
        return
      }

      // 저장소 변경 전 검증
      const collectionRestorePlan = validatedBackup.hasMapPhotoCollections
        ? preparePhotoCollectionsForRestore(validatedBackup.mapPhotoCollections)
        : null
      const mapRestorePlan = validatedBackup.hasMapPhotoRecords
        ? await preparePhotoRecordsForRestore(
            validatedBackup.mapPhotoRecords,
            collectionRestorePlan?.restoredCollections ?? null,
          )
        : null

      if (!window.confirm(t.settings.restoreConfirmMessage)) {
        setBackupStatus({ type: 'info', message: t.settings.restoreCancelled })
        return
      }

      if (mapRestorePlan?.damagedCount > 0) {
        const shouldContinueWithValidMapRecords = window.confirm(
          t.settings.restoreDamagedMapConfirm(
            mapRestorePlan.totalCount,
            mapRestorePlan.validCount,
            mapRestorePlan.damagedCount,
          ),
        )

        if (!shouldContinueWithValidMapRecords) {
          setBackupStatus({ type: 'info', message: t.settings.restoreCancelled })
          return
        }
      }

      if (collectionRestorePlan?.damagedCount > 0) {
        const shouldContinueWithValidCollections = window.confirm(
          t.settings.restoreDamagedMapCollectionsConfirm(
            collectionRestorePlan.totalCount,
            collectionRestorePlan.validCount,
            collectionRestorePlan.damagedCount,
          ),
        )

        if (!shouldContinueWithValidCollections) {
          setBackupStatus({ type: 'info', message: t.settings.restoreCancelled })
          return
        }
      }

      if (
        (validatedBackup.hasMapPhotoRecords ||
          validatedBackup.hasMapPhotoCollections) &&
        !window.confirm(
          t.settings.restoreMapReplaceConfirm(
            mapRestorePlan?.totalCount ?? 0,
            mapRestorePlan?.validCount ?? 0,
            mapRestorePlan?.damagedCount ?? 0,
          ),
        )
      ) {
        setBackupStatus({ type: 'info', message: t.settings.restoreCancelled })
        return
      }

      const previousLocalStorageData = {
        // rollback용 현재 localStorage snapshot
        tasks: localStorage.getItem(STORAGE_KEYS.tasks),
        notes: localStorage.getItem(STORAGE_KEYS.notes),
        boardPosts: localStorage.getItem(STORAGE_KEYS.boardPosts),
        calendarEvents: localStorage.getItem(STORAGE_KEYS.calendarEvents),
        timerCompletedSessions: localStorage.getItem(
          STORAGE_KEYS.timerCompletedSessions,
        ),
        language: localStorage.getItem(STORAGE_KEYS.language),
        startModule: localStorage.getItem(STORAGE_KEYS.startModule),
        theme: localStorage.getItem(STORAGE_KEYS.theme),
      }
      const shouldTouchMapArchive =
        validatedBackup.hasMapPhotoRecords || validatedBackup.hasMapPhotoCollections
      const previousMapRecords = shouldTouchMapArchive
        ? await getPhotoRecords()
        : null
      const previousCollections = shouldTouchMapArchive
        ? await getPhotoCollections()
        : null

      try {
        // 백업 종류별 Map 교체 범위
        if (
          validatedBackup.hasMapPhotoRecords &&
          validatedBackup.hasMapPhotoCollections
        ) {
          await replacePhotoArchiveData({
            records: mapRestorePlan.restoredRecords,
            collections: collectionRestorePlan.restoredCollections,
          })
        } else if (validatedBackup.hasMapPhotoRecords) {
          await replacePhotoRecords(mapRestorePlan.restoredRecords)
        } else if (validatedBackup.hasMapPhotoCollections) {
          const restoredCollectionIds = new Set(
            collectionRestorePlan.restoredCollections.map(
              (collection) => collection.id,
            ),
          )

          await replacePhotoArchiveData({
            // 사라진 컬렉션 연결 해제
            records: (await getPhotoRecords()).map((record) => ({
              ...record,
              collectionId: restoredCollectionIds.has(record.collectionId)
                ? record.collectionId
                : null,
            })),
            collections: collectionRestorePlan.restoredCollections,
          })
        }

        restoreLocalStorageData(validatedBackup)
      } catch {
        // 복원 실패 rollback
        if (previousMapRecords) {
          await replacePhotoArchiveData({
            records: previousMapRecords,
            collections: previousCollections ?? undefined,
          })
        } else if (previousCollections) {
          await replacePhotoArchiveData({
            records: await getPhotoRecords(),
            collections: previousCollections,
          })
        }

        Object.entries(previousLocalStorageData).forEach(([key, value]) => {
          const storageKey = STORAGE_KEYS[key]

          if (value === null) {
            localStorage.removeItem(storageKey)
            return
          }

          localStorage.setItem(storageKey, value)
        })

        setBackupStatus({
          type: 'error',
          message: t.settings.restoreRollbackError,
        })
        return
      }

      onLanguageChange(validatedBackup.language)
      onStartModuleChange(validatedBackup.startModule)
      onThemeChange(validatedBackup.theme)
      setDataVersion((currentVersion) => currentVersion + 1)

      if (!validatedBackup.hasMapPhotoRecords) {
        setBackupStatus({
          type: 'success',
          message: `${t.settings.restoreComplete} ${t.settings.restoreMapKept}`,
        })
      } else if (mapRestorePlan.damagedCount > 0) {
        setBackupStatus({
          type: 'success',
          message: t.settings.restoreCompleteWithDamagedMap(
            mapRestorePlan.validCount,
            mapRestorePlan.damagedCount,
          ),
        })
      } else if (collectionRestorePlan?.damagedCount > 0) {
        setBackupStatus({
          type: 'success',
          message: `${
            mapRestorePlan
              ? t.settings.restoreCompleteWithMap(mapRestorePlan.validCount)
              : t.settings.restoreComplete
          } ${t.settings.restoreDamagedMapCollectionsSkipped(
            collectionRestorePlan.validCount,
            collectionRestorePlan.damagedCount,
          )}`,
        })
      } else {
        setBackupStatus({
          type: 'success',
          message: t.settings.restoreCompleteWithMap(mapRestorePlan.validCount),
        })
      }
    } catch {
      setBackupStatus({ type: 'error', message: t.settings.backupReadError })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section
      className="module-panel settings-module"
      aria-labelledby="settings-title"
    >
      {/* Settings 헤더 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.settings.label}</p>
          <h2 id="settings-title">{t.settings.title}</h2>
        </div>
      </div>

      {/* Settings 그리드 */}
      <div className="settings-grid">
        {/* 언어 선택 */}
        <section className="settings-panel settings-preference-panel settings-interface-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.language} / {t.settings.theme}</p>
            <h3>{t.settings.interface}</h3>
          </div>
          <div className="settings-options" aria-label={t.settings.language}>
            {LANGUAGES.map((languageId) => (
              <button
                className={`settings-option ${
                  language === languageId ? 'is-active' : ''
                }`}
                key={languageId}
                type="button"
                // App 저장 흐름
                onClick={() => onLanguageChange(languageId)}
              >
                {t.languages[languageId]}
              </button>
            ))}
          </div>
          <div className="settings-combined-group">
            <p className="settings-group-label">{t.settings.theme}</p>
            <div className="settings-options" aria-label={t.settings.theme}>
              {THEMES.map((themeId) => (
                <button
                  className={`settings-option ${
                    theme === themeId ? 'is-active' : ''
                  }`}
                  key={themeId}
                  type="button"
                  onClick={() => onThemeChange(themeId)}
                >
                  {t.settings.themes[themeId]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 기본 시작 모듈 */}
        <section className="settings-panel settings-preference-panel settings-start-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.defaultStartModule}</p>
            <h3>{t.settings.startup}</h3>
          </div>
          <div
            className="settings-options settings-options-grid"
            aria-label={t.settings.defaultStartModule}
          >
            {START_MODULES.map((moduleId) => (
              <button
                className={`settings-option ${
                  startModule === moduleId ? 'is-active' : ''
                }`}
                key={moduleId}
                type="button"
                // 다음 로드 시작 모듈
                onClick={() => onStartModuleChange(moduleId)}
              >
                {t.modules[moduleId]}
              </button>
            ))}
          </div>
        </section>

        {/* 저장 데이터 현황 */}
        <section className="settings-panel settings-data-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.dataManagement}</p>
            <h3>{t.settings.storage}</h3>
          </div>
          <div className="data-metrics">
            <div className="data-metric">
              <span>{t.settings.tasksData}</span>
              <strong>{taskCount}</strong>
            </div>
            <div className="data-metric">
              <span>{t.settings.notesData}</span>
              <strong>{noteCount}</strong>
            </div>
            <div className="data-metric">
              <span>{t.settings.boardData}</span>
              <strong>{boardPostCount}</strong>
            </div>
            <div className="data-metric">
              <span>{t.settings.calendarData}</span>
              <strong>{calendarEventCount}</strong>
            </div>
            <div className="data-metric">
              <span>{t.settings.mapData}</span>
              <strong>{mapPhotoCount}</strong>
            </div>
          </div>
        </section>

        {/* 백업/복원 */}
        <div className="settings-action-stack">
        <section className="settings-panel settings-backup-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.backupLabel}</p>
            <h3>{t.settings.backupTitle}</h3>
          </div>
          <div className="backup-actions">
            <button
              className="settings-option"
              type="button"
              onClick={handleExportBackup}
            >
              {t.settings.exportBackup}
            </button>
            <button
              className="settings-option"
              type="button"
              onClick={() => backupFileInputRef.current?.click()}
            >
              {t.settings.importBackup}
            </button>
          </div>
          <input
            ref={backupFileInputRef}
            className="backup-file-input"
            type="file"
            accept="application/json,.json"
            aria-label={t.settings.importBackup}
            onChange={handleRestoreBackup}
          />
          <p className="settings-note">{t.settings.backupNote}</p>
          <p className="settings-note">{t.settings.mapBackupNote}</p>
          {backupStatus ? (
            <p className={`backup-status is-${backupStatus.type}`}>
              {backupStatus.message}
            </p>
          ) : null}
        </section>

        {/* 데이터 삭제 danger 패널 */}
        <section className="settings-panel settings-danger-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.resetWarningLabel}</p>
            <h3>{t.settings.resetWarningTitle}</h3>
          </div>
          <button
            className="reset-button"
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
          >
            {t.settings.resetData}
          </button>
          <p className="settings-note">{t.settings.resetRequiresConfirmation}</p>

          {isResetConfirmOpen ? (
            /* 데이터 초기화 확인 */
            <div className="reset-confirm-panel" role="alert">
              <p className="module-label">{t.settings.resetWarningLabel}</p>
              <h4>{t.settings.resetWarningTitle}</h4>
              <p>{t.settings.resetWarningMessage}</p>
              <div className="reset-actions">
                <button
                  className="reset-button confirm-reset-button"
                  type="button"
                  onClick={handleConfirmReset}
                >
                  {t.settings.confirmReset}
                </button>
                <button
                  className="settings-option"
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                >
                  {t.settings.cancelReset}
                </button>
              </div>
            </div>
          ) : null}
        </section>
        </div>
      </div>
    </section>
  )
}

export default Settings
