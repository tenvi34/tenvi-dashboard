import { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import UserAvatar from '../components/UserAvatar.jsx'
import BackendEchoTest from './BackendEchoTest.jsx'
import BackendStatus from './BackendStatus.jsx'
import BoardApiTest from './BoardApiExtendedTest.jsx'
import {
  BOARD_STORAGE_MODES,
  readBoardStorageMode,
  saveBoardStorageMode,
} from './board/boardStorageMode.js'
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
  collectBoardBackupData,
  downloadBoardBackupFile,
  parseBoardBackupFile,
  restoreBoardBackupData,
} from './boardBackupLogic.js'
import { getAllBoardImages } from './boardImageStore.js'
import {
  deleteProfileImage,
  saveProfileImage,
} from './profileImageStore.js'
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
import {
  parseUserProfile,
  resetUserProfile,
  updateUserProfile,
} from './userProfileLogic.js'

// Settings 저장 key
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
const NOTES_STORAGE_KEY = STORAGE_KEYS.notes
const BOARD_POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts
const CALENDAR_EVENTS_STORAGE_KEY = STORAGE_KEYS.calendarEvents
const USER_PROFILE_STORAGE_KEY = STORAGE_KEYS.userProfile

// 설정 화면 탭 분리 기준
const SETTINGS_TABS = [
  { id: 'general', label: '일반설정' },
  { id: 'backup', label: '백업/복원/초기화' },
  { id: 'server', label: '서버 관련' },
]

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
  const [activeSettingsTab, setActiveSettingsTab] = useState('general')
  const [boardStorageMode, setBoardStorageMode] = useState(() =>
    readBoardStorageMode(),
  )
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [backupStatus, setBackupStatus] = useState(null)
  const [boardBackupStatus, setBoardBackupStatus] = useState(null)
  const [boardImageCount, setBoardImageCount] = useState(0)
  const [mapPhotoCount, setMapPhotoCount] = useState(0)
  const [profileStatus, setProfileStatus] = useState(null)
  const [profileForm, setProfileForm] = useState(() =>
    parseUserProfile(localStorage.getItem(USER_PROFILE_STORAGE_KEY)),
  )
  const backupFileInputRef = useRef(null)
  const boardBackupFileInputRef = useRef(null)
  const profileImageInputRef = useRef(null)
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

    // Board 이미지 IndexedDB 개수 반영
    getAllBoardImages()
      .then((images) => {
        if (isMounted) {
          setBoardImageCount(images.length)
        }
      })
      .catch(() => {
        if (isMounted) {
          setBoardImageCount(0)
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

  // 로컬 프로필 저장
  const handleSaveProfile = () => {
    const nextProfile = updateUserProfile(
      parseUserProfile(localStorage.getItem(USER_PROFILE_STORAGE_KEY)),
      {
        nickname: profileForm.nickname,
        bio: profileForm.bio,
      },
    )

    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
    setProfileForm(nextProfile)
    setProfileStatus({ type: 'success', message: t.settings.profileSaved })
    setDataVersion((currentVersion) => currentVersion + 1)
  }

  // 프로필 이미지 선택 즉시 IndexedDB와 프로필 key 갱신
  const handleSelectProfileImage = async (event) => {
    const imageFile = event.target.files?.[0]

    if (!imageFile) {
      return
    }

    try {
      const currentProfile = parseUserProfile(
        localStorage.getItem(USER_PROFILE_STORAGE_KEY),
      )
      const nextImage = await saveProfileImage(imageFile)
      const nextProfile = updateUserProfile(currentProfile, {
        ...profileForm,
        avatarImageId: nextImage.id,
      })

      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'success', message: t.settings.profileImageSaved })

      if (currentProfile.avatarImageId) {
        deleteProfileImage(currentProfile.avatarImageId).catch(() => {
          // 새 이미지 반영을 우선하고 이전 이미지 정리는 후처리
        })
      }
    } catch {
      setProfileStatus({ type: 'error', message: t.settings.profileImageError })
    } finally {
      event.target.value = ''
    }
  }

  const handleRemoveProfileImage = () => {
    const currentProfile = parseUserProfile(
      localStorage.getItem(USER_PROFILE_STORAGE_KEY),
    )
    const nextProfile = updateUserProfile(currentProfile, {
      ...profileForm,
      avatarImageId: '',
    })

    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
    setProfileForm(nextProfile)
    setProfileStatus({ type: 'info', message: t.settings.profileImageRemoved })

    if (currentProfile.avatarImageId) {
      deleteProfileImage(currentProfile.avatarImageId).catch(() => {
        // 프로필 fallback 전환을 우선하고 이미지 정리는 후처리
      })
    }
  }

  // 로컬 프로필 기본값 복원
  const handleResetProfile = () => {
    const currentProfile = parseUserProfile(
      localStorage.getItem(USER_PROFILE_STORAGE_KEY),
    )
    const nextProfile = resetUserProfile()

    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile))
    setProfileForm(nextProfile)
    setProfileStatus({ type: 'info', message: t.settings.profileReset })
    setDataVersion((currentVersion) => currentVersion + 1)

    if (currentProfile.avatarImageId) {
      deleteProfileImage(currentProfile.avatarImageId).catch(() => {
        // 기본 프로필 복원을 우선하고 이미지 정리는 후처리
      })
    }
  }

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

  // Board 전용 JSON 백업 내보내기
  const handleExportBoardBackup = async () => {
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

  // Board 전용 JSON 백업 복원
  const handleRestoreBoardBackup = async (event) => {
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
    if (validatedBackup.hasUserProfile) {
      localStorage.setItem(
        STORAGE_KEYS.userProfile,
        JSON.stringify(parseUserProfile(JSON.stringify(validatedBackup.userProfile))),
      )
    }
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

  return (
    <section
      className={`module-panel settings-module settings-module--${activeSettingsTab}`}
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
      <div className="settings-tabs" aria-label="설정 탭">
        {SETTINGS_TABS.map((tab) => (
          <button
            className={`settings-tab ${
              activeSettingsTab === tab.id ? 'is-active' : ''
            }`}
            key={tab.id}
            type="button"
            onClick={() => setActiveSettingsTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              <span>{t.settings.boardImageData}</span>
              <strong>{boardImageCount}</strong>
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

        {/* 로컬 사용자 프로필 */}
        <section className="settings-panel settings-profile-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.profileLabel}</p>
            <h3>{t.settings.profileTitle}</h3>
          </div>
          <div className="profile-settings__preview">
            <UserAvatar
              avatarImageId={profileForm.avatarImageId}
              nickname={profileForm.nickname}
              size="lg"
            />
            <div>
              <strong>{profileForm.nickname || 'TENVI'}</strong>
              <span>{profileForm.bio || t.settings.profileNoBio}</span>
            </div>
          </div>
          <div className="backup-actions profile-settings__image-actions">
            <button
              className="settings-option"
              type="button"
              onClick={() => profileImageInputRef.current?.click()}
            >
              {t.settings.selectProfileImage}
            </button>
            <button
              className="settings-option"
              type="button"
              onClick={handleRemoveProfileImage}
              disabled={!profileForm.avatarImageId}
            >
              {t.settings.removeProfileImage}
            </button>
          </div>
          <input
            ref={profileImageInputRef}
            className="backup-file-input"
            type="file"
            accept="image/*"
            aria-label={t.settings.selectProfileImage}
            onChange={handleSelectProfileImage}
          />
          <div className="settings-profile-form">
            <label className="settings-field">
              <span>{t.settings.profileNickname}</span>
              <input
                type="text"
                value={profileForm.nickname}
                onChange={(event) =>
                  setProfileForm((currentProfile) => ({
                    ...currentProfile,
                    nickname: event.target.value,
                  }))
                }
                placeholder="TENVI"
              />
            </label>
            <label className="settings-field">
              <span>{t.settings.profileBio}</span>
              <textarea
                value={profileForm.bio}
                onChange={(event) =>
                  setProfileForm((currentProfile) => ({
                    ...currentProfile,
                    bio: event.target.value,
                  }))
                }
                rows={3}
                placeholder={t.settings.profileBioPlaceholder}
              />
            </label>
          </div>
          <div className="backup-actions">
            <button
              className="settings-option"
              type="button"
              onClick={handleSaveProfile}
            >
              {t.settings.saveProfile}
            </button>
            <button
              className="settings-option"
              type="button"
              onClick={handleResetProfile}
            >
              {t.settings.resetProfile}
            </button>
          </div>
          <p className="settings-note">{t.settings.profileNote}</p>
          {profileStatus ? (
            <p className={`backup-status is-${profileStatus.type}`}>
              {profileStatus.message}
            </p>
          ) : null}
        </section>

        {/* 백업/복원 */}
        <BackendStatus t={t} />
        <BackendEchoTest />
        <section className="settings-panel settings-board-storage-panel">
          <div className="settings-panel-header">
            <p className="module-label">BOARD STORAGE</p>
            <h3>게시글 저장소 모드</h3>
          </div>
          <div className="settings-options" aria-label="Board 저장소 모드">
            {Object.values(BOARD_STORAGE_MODES).map((mode) => (
              <button
                className={`settings-option ${boardStorageMode === mode ? 'is-active' : ''}`}
                key={mode}
                type="button"
                onClick={() => setBoardStorageMode(saveBoardStorageMode(mode))}
              >
                {mode === BOARD_STORAGE_MODES.local ? 'Local' : 'Remote'}
              </button>
            ))}
          </div>
          <p className="settings-note">
            기본값은 Local입니다. 변경 후 Board에 다시 진입하면 적용됩니다.
          </p>
          <p className="settings-note">
            Remote에서도 이미지는 이 브라우저의 IndexedDB에만 저장되어 다른 브라우저에서는 표시되지 않습니다.
          </p>
        </section>
        <BoardApiTest />

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

        <section className="settings-panel settings-board-backup-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.backupLabel}</p>
            <h3>{t.settings.boardBackupTitle}</h3>
          </div>
          <div className="backup-actions">
            <button
              className="settings-option"
              type="button"
              onClick={handleExportBoardBackup}
            >
              {t.settings.exportBoardBackup}
            </button>
            <button
              className="settings-option"
              type="button"
              onClick={() => boardBackupFileInputRef.current?.click()}
            >
              {t.settings.importBoardBackup}
            </button>
          </div>
          <input
            ref={boardBackupFileInputRef}
            className="backup-file-input"
            type="file"
            accept="application/json,.json"
            aria-label={t.settings.importBoardBackup}
            onChange={handleRestoreBoardBackup}
          />
          <p className="settings-note">{t.settings.boardBackupNote}</p>
          {boardBackupStatus ? (
            <p className={`backup-status is-${boardBackupStatus.type}`}>
              {boardBackupStatus.message}
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
