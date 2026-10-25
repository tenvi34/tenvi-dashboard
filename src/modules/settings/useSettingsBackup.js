import { useRef, useState } from 'react'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { getPhotoRecords, replacePhotoArchiveData, replacePhotoRecords } from '../../services/photoArchiveRepository.js'
import { getPhotoCollections } from '../../services/photoCollectionRepository.js'
import { preparePhotoCollectionsForRestore, preparePhotoRecordsForRestore, serializePhotoCollectionsForBackup, serializePhotoRecordsForBackup } from '../../services/photoArchiveBackupService.js'
import { collectBoardBackupData, downloadBoardBackupFile, parseBoardBackupFile, restoreBoardBackupData } from '../boardBackupLogic.js'
import { BACKUP_APP, BACKUP_TYPE, BACKUP_VERSION, createBackupFileName, validateBackupPayload } from '../settingsBackup.js'
import { parseUserProfile } from '../userProfileLogic.js'
import { captureBackupExtras, collectBackupExtras, restoreBackupExtras } from './backupExtras.js'

const USER_PROFILE_STORAGE_KEY = STORAGE_KEYS.userProfile
// 백업 대상 목록 읽기
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


// 백업 UI와 저장소 복원 흐름을 Settings의 프로필/서버 관리에서 분리
export default function useSettingsBackup({ language, startModule, theme, t,
  onLanguageChange, onStartModuleChange, onThemeChange, setProfileForm, setDataVersion }) {
  const [backupStatus, setBackupStatus] = useState(null)
  const [boardBackupStatus, setBoardBackupStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const backupFileInputRef = useRef(null)
  const boardBackupFileInputRef = useRef(null)
  const runExclusive = async (action) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    try { await action() } finally { lock.current = false; setBusy(false) }
  }
  // 전체 백업 JSON 내보내기
  const handleExportBackupAction = async () => {
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
          ...(await collectBackupExtras()),
          boardPosts: readStoredList(STORAGE_KEYS.boardPosts),
          calendarEvents: readStoredList(STORAGE_KEYS.calendarEvents),
          language,
          startModule,
          theme,
          mapPhotoCollections,
          mapPhotoRecords,
          userProfile: parseUserProfile(
            localStorage.getItem(USER_PROFILE_STORAGE_KEY),
          ),
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

  // Board 백업 JSON 내보내기
  const handleExportBoardBackupAction = async () => {
    try {
      const backupPayload = await collectBoardBackupData()

      downloadBoardBackupFile(backupPayload)
      setBoardBackupStatus({
        type: 'success',
        message: t.settings.boardBackupExported,
      })
    } catch {
      setBoardBackupStatus({
        type: 'error',
        message: t.settings.boardBackupReadError,
      })
    }
  }

  // Board 백업 JSON 복원
  const handleRestoreBoardBackupAction = async (event) => {
    const backupFile = event.target.files?.[0]

    if (!backupFile) {
      return
    }

    try {
      const backupPayload = await parseBoardBackupFile(backupFile)

      if (!backupPayload) {
        setBoardBackupStatus({
          type: 'error',
          message: t.settings.boardBackupInvalid,
        })
        return
      }

      if (!window.confirm(t.settings.boardRestoreConfirmMessage)) {
        setBoardBackupStatus({
          type: 'info',
          message: t.settings.restoreCancelled,
        })
        return
      }

      await restoreBoardBackupData(backupPayload)
      setProfileForm(parseUserProfile(localStorage.getItem(USER_PROFILE_STORAGE_KEY)))
      setBoardBackupStatus({
        type: 'success',
        message: t.settings.boardBackupRestored,
      })
      setDataVersion((currentVersion) => currentVersion + 1)
    } catch {
      setBoardBackupStatus({
        type: 'error',
        message: t.settings.boardBackupReadError,
      })
    } finally {
      event.target.value = ''
    }
  }

  // 검증된 백업 localStorage 반영
  const restoreLocalStorageData = (validatedBackup) => {
    // 기존 localStorage key 유지
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
    if (validatedBackup.timerCompletedSessions !== undefined) {
      localStorage.setItem(STORAGE_KEYS.timerCompletedSessions, String(validatedBackup.timerCompletedSessions))
    }
    localStorage.setItem(STORAGE_KEYS.language, validatedBackup.language)
    localStorage.setItem(STORAGE_KEYS.startModule, validatedBackup.startModule)
    localStorage.setItem(STORAGE_KEYS.theme, validatedBackup.theme)
    if (validatedBackup.hasUserProfile) {
      localStorage.setItem(
        STORAGE_KEYS.userProfile,
        JSON.stringify(parseUserProfile(JSON.stringify(validatedBackup.userProfile))),
      )
    }
  }

  // 전체 백업 JSON 복원
  const handleRestoreBackupAction = async (event) => {
    const backupFile = event.target.files?.[0]

    if (!backupFile) {
      return
    }

    try {
      const backupPayload = JSON.parse(await backupFile.text())
      const validatedBackup = validateBackupPayload(backupPayload)

      if (!validatedBackup) {
        setBackupStatus({ type: 'error', message: t.settings.backupInvalid })
        return
      }

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
        // 복원 실패 rollback snapshot
        timerCompletedSessions: localStorage.getItem(STORAGE_KEYS.timerCompletedSessions),
        boardPosts: localStorage.getItem(STORAGE_KEYS.boardPosts),
        calendarEvents: localStorage.getItem(STORAGE_KEYS.calendarEvents),
        language: localStorage.getItem(STORAGE_KEYS.language),
        startModule: localStorage.getItem(STORAGE_KEYS.startModule),
        theme: localStorage.getItem(STORAGE_KEYS.theme),
        userProfile: localStorage.getItem(STORAGE_KEYS.userProfile),
      }
      const shouldTouchMapArchive =
        validatedBackup.hasMapPhotoRecords || validatedBackup.hasMapPhotoCollections
      const previousMapRecords = shouldTouchMapArchive
        ? await getPhotoRecords()
        : null
      const previousCollections = shouldTouchMapArchive
        ? await getPhotoCollections()
        : null

      const previousExtras = await captureBackupExtras(validatedBackup)

      try {
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
            records: (await getPhotoRecords()).map((record) => ({
              ...record,
              collectionId: restoredCollectionIds.has(record.collectionId)
                ? record.collectionId
                : null,
            })),
            collections: collectionRestorePlan.restoredCollections,
          })
        }

        await restoreBackupExtras(validatedBackup)
        restoreLocalStorageData(validatedBackup)
      } catch {
        // 저장소별 복구는 독립 실행하여 한 곳 실패가 나머지 복구를 막지 않도록 처리
        await Promise.allSettled([
          restoreBackupExtras(previousExtras),
          ...(shouldTouchMapArchive ? [replacePhotoArchiveData({
            records: previousMapRecords, collections: previousCollections,
          })] : []),
          ...Object.entries(previousLocalStorageData).map(([key, value]) => Promise.resolve().then(() => {
            if (value === null) localStorage.removeItem(STORAGE_KEYS[key])
            else localStorage.setItem(STORAGE_KEYS[key], value)
          })),
        ])

        setBackupStatus({
          type: 'error',
          message: t.settings.restoreRollbackError,
        })
        return
      }

      onLanguageChange(validatedBackup.language)
      onStartModuleChange(validatedBackup.startModule)
      onThemeChange(validatedBackup.theme)
      if (validatedBackup.hasUserProfile) {
        setProfileForm(parseUserProfile(localStorage.getItem(USER_PROFILE_STORAGE_KEY)))
      }
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

  const handleExportBackup = (event) => runExclusive(() => handleExportBackupAction(event))
  const handleExportBoardBackup = (event) => runExclusive(() => handleExportBoardBackupAction(event))
  const handleRestoreBoardBackup = (event) => runExclusive(() => handleRestoreBoardBackupAction(event))
  const handleRestoreBackup = (event) => runExclusive(() => handleRestoreBackupAction(event))
  return { backupStatus, boardBackupStatus, busy, backupFileInputRef, boardBackupFileInputRef,
    handleExportBackup, handleExportBoardBackup, handleRestoreBackup, handleRestoreBoardBackup }
}
