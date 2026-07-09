import { useEffect, useRef, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import UserAvatar from '../components/UserAvatar.jsx'
import {
  createRemoteProfileImage,
  deleteRemoteProfileImage,
  fetchRemoteProfile,
  saveRemoteProfile,
} from '../api/profileApi.js'
import BackendEchoTest from './BackendEchoTest.jsx'
import BackendStatus from './BackendStatus.jsx'
import BoardApiTest from './BoardApiExtendedTest.jsx'
import {
  BOARD_STORAGE_MODES,
  readBoardStorageMode,
  saveBoardStorageMode,
} from './board/boardStorageMode.js'
import {
  copyLocalBoardCategoriesToRemote,
  copyLocalBoardImagesToRemote,
  copyLocalBoardPostsToRemote,
} from './board/boardRemoteCopy.js'
import {
  MAP_STORAGE_MODES,
  readMapStorageMode,
  saveMapStorageMode,
} from './mapStorageMode.js'
import { copyLocalMapDataToRemote } from './map/mapRemoteCopy.js'
import {
  PROFILE_SETTINGS_STORAGE_MODES,
  readProfileSettingsStorageMode,
  saveProfileSettingsStorageMode,
} from './profileSettingsStorageMode.js'
import {
  copyLocalProfileToRemote,
  copyLocalSettingsToRemote,
  saveRemoteSettingValue,
} from './profileSettingsRemoteCopy.js'
import {
  NOTES_STORAGE_MODES,
  readNotesStorageMode,
  saveNotesStorageMode,
} from './notesStorageMode.js'
import { copyLocalNotesToRemote } from './notes/notesRemoteCopy.js'
import {
  TASKS_STORAGE_MODES,
  readTasksStorageMode,
  saveTasksStorageMode,
} from './tasksStorageMode.js'
import { copyLocalTasksToRemote } from './tasks/tasksRemoteCopy.js'
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

// Settings ????key
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
const NOTES_STORAGE_KEY = STORAGE_KEYS.notes
const BOARD_POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts
const CALENDAR_EVENTS_STORAGE_KEY = STORAGE_KEYS.calendarEvents
const USER_PROFILE_STORAGE_KEY = STORAGE_KEYS.userProfile

const SETTINGS_TABS = [
  { id: 'general', label: '\uC77C\uBC18 \uC124\uC815' },
  { id: 'backup', label: '\uBC31\uC5C5/\uBCF5\uC6D0/\uCD08\uAE30\uD654' },
  { id: 'server', label: '\uC11C\uBC84 \uAD00\uB9AC' },
]

const readStoredCount = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return 0
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    // ???????????됰Ŧ鍮??fallback
    return Array.isArray(parsedValue) ? parsedValue.length : 0
  } catch {
    return 0
  }
}

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

const readStoredCompletedSessions = () => {
  const savedValue = localStorage.getItem(STORAGE_KEYS.timerCompletedSessions)
  const parsedValue = Number.parseInt(savedValue, 10)

  return Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue)
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const createProfileImageId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `profile-image-${globalThis.crypto.randomUUID()}`
  }

  return `profile-image-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const saveProfileToLocalStorage = (profile) => {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

function Settings({
  activeTab = 'general',
  language,
  onLanguageChange,
  onStartModuleChange,
  onSettingsTabChange,
  onThemeChange,
  startModule,
  t,
  theme,
}) {
  const [activeSettingsTab, setActiveSettingsTab] = useState(activeTab)
  const [boardStorageMode, setBoardStorageMode] = useState(() =>
    readBoardStorageMode(),
  )
  const [tasksStorageMode, setTasksStorageMode] = useState(() =>
    readTasksStorageMode(),
  )
  const [notesStorageMode, setNotesStorageMode] = useState(() =>
    readNotesStorageMode(),
  )
  const [mapStorageMode, setMapStorageMode] = useState(() =>
    readMapStorageMode(),
  )
  const [profileSettingsStorageMode, setProfileSettingsStorageMode] = useState(
    () => readProfileSettingsStorageMode(),
  )
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [backupStatus, setBackupStatus] = useState(null)
  const [boardBackupStatus, setBoardBackupStatus] = useState(null)
  const [boardRemoteCopyStatus, setBoardRemoteCopyStatus] = useState(null)
  const [boardCategoriesRemoteCopyStatus, setBoardCategoriesRemoteCopyStatus] =
    useState(null)
  const [boardImagesRemoteCopyStatus, setBoardImagesRemoteCopyStatus] =
    useState(null)
  const [tasksRemoteCopyStatus, setTasksRemoteCopyStatus] = useState(null)
  const [notesRemoteCopyStatus, setNotesRemoteCopyStatus] = useState(null)
  const [mapRemoteCopyStatus, setMapRemoteCopyStatus] = useState(null)
  const [profileRemoteCopyStatus, setProfileRemoteCopyStatus] = useState(null)
  const [settingsRemoteCopyStatus, setSettingsRemoteCopyStatus] = useState(null)
  const [isBoardRemoteCopying, setIsBoardRemoteCopying] = useState(false)
  const [isBoardCategoriesRemoteCopying, setIsBoardCategoriesRemoteCopying] =
    useState(false)
  const [isBoardImagesRemoteCopying, setIsBoardImagesRemoteCopying] =
    useState(false)
  const [isTasksRemoteCopying, setIsTasksRemoteCopying] = useState(false)
  const [isNotesRemoteCopying, setIsNotesRemoteCopying] = useState(false)
  const [isMapRemoteCopying, setIsMapRemoteCopying] = useState(false)
  const [isProfileRemoteCopying, setIsProfileRemoteCopying] = useState(false)
  const [isSettingsRemoteCopying, setIsSettingsRemoteCopying] = useState(false)
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
  const isProfileSettingsRemote =
    profileSettingsStorageMode === PROFILE_SETTINGS_STORAGE_MODES.remote

  useEffect(() => {
    let isMounted = true

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

  useEffect(() => {
    let isMounted = true

    if (!isProfileSettingsRemote) {
      return () => {
        isMounted = false
      }
    }

    fetchRemoteProfile()
      .then((remoteProfile) => {
        if (!isMounted) {
          return
        }

        const nextProfile = parseUserProfile(JSON.stringify(remoteProfile))

        saveProfileToLocalStorage(nextProfile)
        setProfileForm(nextProfile)
      })
      .catch(() => {
        if (isMounted) {
          setProfileStatus({
            type: 'info',
            message: t.settings.profileRemoteLoadError,
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [isProfileSettingsRemote, t.settings.profileRemoteLoadError])

  // LOCAL ?????? ????????汝뷴젆?琉????REMOTE ???뀀맩鍮???癲????????룸챷援????????????ш끽紐???
  const handleCopyBoardPostsToRemote = async () => {
    setIsBoardRemoteCopying(true)
    setBoardRemoteCopyStatus(null)

    try {
      const result = await copyLocalBoardPostsToRemote()

      if (result.total === 0) {
        setBoardRemoteCopyStatus({ type: 'info', message: t.settings.boardRemoteCopyEmpty })
        return
      }

      setBoardRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.boardRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setBoardRemoteCopyStatus({
        type: 'error',
        message: t.settings.boardRemoteCopyConnectionError,
      })
    } finally {
      setIsBoardRemoteCopying(false)
    }
  }

  const handleCopyBoardCategoriesToRemote = async () => {
    setIsBoardCategoriesRemoteCopying(true)
    setBoardCategoriesRemoteCopyStatus(null)

    try {
      const result = await copyLocalBoardCategoriesToRemote()

      if (result.total === 0) {
        setBoardCategoriesRemoteCopyStatus({
          type: 'info',
          message: t.settings.boardCategoriesRemoteCopyEmpty,
        })
        return
      }

      setBoardCategoriesRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.boardCategoriesRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setBoardCategoriesRemoteCopyStatus({
        type: 'error',
        message: t.settings.boardCategoriesRemoteCopyConnectionError,
      })
    } finally {
      setIsBoardCategoriesRemoteCopying(false)
    }
  }

  const handleCopyBoardImagesToRemote = async () => {
    setIsBoardImagesRemoteCopying(true)
    setBoardImagesRemoteCopyStatus(null)

    try {
      const result = await copyLocalBoardImagesToRemote()

      if (result.total === 0) {
        setBoardImagesRemoteCopyStatus({
          type: 'info',
          message: t.settings.boardImagesRemoteCopyEmpty,
        })
        return
      }

      setBoardImagesRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.boardImagesRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setBoardImagesRemoteCopyStatus({
        type: 'error',
        message: t.settings.boardImagesRemoteCopyConnectionError,
      })
    } finally {
      setIsBoardImagesRemoteCopying(false)
    }
  }

  const handleCopyTasksToRemote = async () => {
    setIsTasksRemoteCopying(true)
    setTasksRemoteCopyStatus(null)

    try {
      const result = await copyLocalTasksToRemote()

      if (result.total === 0) {
        setTasksRemoteCopyStatus({ type: 'info', message: t.settings.tasksRemoteCopyEmpty })
        return
      }

      setTasksRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.tasksRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setTasksRemoteCopyStatus({
        type: 'error',
        message: t.settings.tasksRemoteCopyConnectionError,
      })
    } finally {
      setIsTasksRemoteCopying(false)
    }
  }

  const handleCopyNotesToRemote = async () => {
    setIsNotesRemoteCopying(true)
    setNotesRemoteCopyStatus(null)

    try {
      const result = await copyLocalNotesToRemote()

      if (result.total === 0) {
        setNotesRemoteCopyStatus({ type: 'info', message: t.settings.notesRemoteCopyEmpty })
        return
      }

      setNotesRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.notesRemoteCopyResult(
          result.copied,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setNotesRemoteCopyStatus({
        type: 'error',
        message: t.settings.notesRemoteCopyConnectionError,
      })
    } finally {
      setIsNotesRemoteCopying(false)
    }
  }

  const handleCopyMapToRemote = async () => {
    setIsMapRemoteCopying(true)
    setMapRemoteCopyStatus(null)

    try {
      const result = await copyLocalMapDataToRemote()
      const total = result.collections.total + result.records.total

      if (total === 0) {
        setMapRemoteCopyStatus({ type: 'info', message: t.settings.mapRemoteCopyEmpty })
        return
      }

      setMapRemoteCopyStatus({
        type:
          result.collections.failed > 0 || result.records.failed > 0
            ? 'error'
            : 'success',
        message: t.settings.mapRemoteCopyResult(result.collections, result.records),
      })
    } catch {
      setMapRemoteCopyStatus({
        type: 'error',
        message: t.settings.mapRemoteCopyConnectionError,
      })
    } finally {
      setIsMapRemoteCopying(false)
    }
  }

  const handleCopyProfileToRemote = async () => {
    setIsProfileRemoteCopying(true)
    setProfileRemoteCopyStatus(null)

    try {
      const result = await copyLocalProfileToRemote()

      setProfileRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.profileRemoteCopyResult(
          result.copied,
          result.updated,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setProfileRemoteCopyStatus({
        type: 'error',
        message: t.settings.profileRemoteCopyConnectionError,
      })
    } finally {
      setIsProfileRemoteCopying(false)
    }
  }

  const handleCopySettingsToRemote = async () => {
    setIsSettingsRemoteCopying(true)
    setSettingsRemoteCopyStatus(null)

    try {
      const result = await copyLocalSettingsToRemote()

      setSettingsRemoteCopyStatus({
        type: result.failed > 0 ? 'error' : 'success',
        message: t.settings.appSettingsRemoteCopyResult(
          result.copied,
          result.updated,
          result.skipped,
          result.failed,
        ),
      })
    } catch {
      setSettingsRemoteCopyStatus({
        type: 'error',
        message: t.settings.appSettingsRemoteCopyConnectionError,
      })
    } finally {
      setIsSettingsRemoteCopying(false)
    }
  }

  const handleProfileSettingsModeChange = (mode) => {
    setProfileSettingsStorageMode(saveProfileSettingsStorageMode(mode))
    setProfileStatus(null)
  }

  const handleLanguageChange = (languageId) => {
    onLanguageChange(languageId)

    if (isProfileSettingsRemote) {
      saveRemoteSettingValue('language', languageId).catch(() => {
        setSettingsRemoteCopyStatus({
          type: 'error',
          message: t.settings.appSettingsRemoteSaveError,
        })
      })
    }
  }

  const handleThemeChange = (themeId) => {
    onThemeChange(themeId)

    if (isProfileSettingsRemote) {
      saveRemoteSettingValue('theme', themeId).catch(() => {
        setSettingsRemoteCopyStatus({
          type: 'error',
          message: t.settings.appSettingsRemoteSaveError,
        })
      })
    }
  }

  const handleStartModuleChange = (moduleId) => {
    onStartModuleChange(moduleId)

    if (isProfileSettingsRemote) {
      saveRemoteSettingValue('startModule', moduleId).catch(() => {
        setSettingsRemoteCopyStatus({
          type: 'error',
          message: t.settings.appSettingsRemoteSaveError,
        })
      })
    }
  }

  const handleSettingsTabChange = (tabId) => {
    setActiveSettingsTab(tabId)
    onSettingsTabChange?.(tabId)
  }

  const handleConfirmReset = () => {
    // ?????????濡?씀?濾??????
    localStorage.removeItem(TASKS_STORAGE_KEY)
    localStorage.removeItem(NOTES_STORAGE_KEY)
    setIsResetConfirmOpen(false)
    setDataVersion((currentVersion) => currentVersion + 1)
  }

  void dataVersion

  const handleSaveProfile = async () => {
    const nextProfile = updateUserProfile(
      parseUserProfile(localStorage.getItem(USER_PROFILE_STORAGE_KEY)),
      {
        nickname: profileForm.nickname,
        bio: profileForm.bio,
      },
    )

    try {
      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'success', message: t.settings.profileSaved })
      setDataVersion((currentVersion) => currentVersion + 1)
    } catch {
      setProfileStatus({
        type: 'error',
        message: t.settings.profileRemoteSaveError,
      })
    }
  }

  const handleSelectProfileImage = async (event) => {
    const imageFile = event.target.files?.[0]

    if (!imageFile) {
      return
    }

    try {
      const currentProfile = parseUserProfile(
        localStorage.getItem(USER_PROFILE_STORAGE_KEY),
      )
      const nextImage = isProfileSettingsRemote
        ? await createRemoteProfileImage({
            id: createProfileImageId(),
            dataUrl: await readFileAsDataUrl(imageFile),
            name: imageFile.name,
            type: imageFile.type,
            createdAt: new Date().toISOString(),
          })
        : await saveProfileImage(imageFile)
      const nextProfile = updateUserProfile(currentProfile, {
        ...profileForm,
        avatarImageId: nextImage.id,
      })

      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'success', message: t.settings.profileImageSaved })

      if (currentProfile.avatarImageId) {
        const deleteImage = isProfileSettingsRemote
          ? deleteRemoteProfileImage
          : deleteProfileImage

        deleteImage(currentProfile.avatarImageId).catch(() => {
          // ????癲ル슣?? ????????됰꽡????ш끽維곩ㅇ????????????癲ル슢??쭕? ???怨룹쓱
        })
      }
    } catch {
      setProfileStatus({ type: 'error', message: t.settings.profileImageError })
    } finally {
      event.target.value = ''
    }
  }

  const handleRemoveProfileImage = async () => {
    const currentProfile = parseUserProfile(
      localStorage.getItem(USER_PROFILE_STORAGE_KEY),
    )
    const nextProfile = updateUserProfile(currentProfile, {
      ...profileForm,
      avatarImageId: '',
    })

    try {
      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'info', message: t.settings.profileImageRemoved })
    } catch {
      setProfileStatus({
        type: 'error',
        message: t.settings.profileRemoteSaveError,
      })
      return
    }

    if (currentProfile.avatarImageId) {
      const deleteImage = isProfileSettingsRemote
        ? deleteRemoteProfileImage
        : deleteProfileImage

      deleteImage(currentProfile.avatarImageId).catch(() => {
            // ????癲ル슣?? ????????됰꽡????ш끽維곩ㅇ????????????癲ル슢??쭕? ???怨룹쓱
          })
    }
  }

  const handleResetProfile = async () => {
    const currentProfile = parseUserProfile(
      localStorage.getItem(USER_PROFILE_STORAGE_KEY),
    )
    const nextProfile = resetUserProfile()

    try {
      if (isProfileSettingsRemote) {
        await saveRemoteProfile(nextProfile)
      }

      saveProfileToLocalStorage(nextProfile)
      setProfileForm(nextProfile)
      setProfileStatus({ type: 'info', message: t.settings.profileReset })
      setDataVersion((currentVersion) => currentVersion + 1)
    } catch {
      setProfileStatus({
        type: 'error',
        message: t.settings.profileRemoteSaveError,
      })
      return
    }

    if (currentProfile.avatarImageId) {
      const deleteImage = isProfileSettingsRemote
        ? deleteRemoteProfileImage
        : deleteProfileImage

      deleteImage(currentProfile.avatarImageId).catch(() => {
            // ????癲ル슣?? ????????됰꽡????ш끽維곩ㅇ????????????癲ル슢??쭕? ???怨룹쓱
          })
    }
  }

  // JSON ??????꾩룆梨띰쭕?뚢뵾????????????????????롮쾸?椰???⑤챷寃??
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

  // Board ??????熬곣뫖利당춯??쎾퐲??JSON ??????꾩룆梨띰쭕?뚢뵾????????????????????롮쾸?椰???⑤챷寃??
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

  const restoreLocalStorageData = (validatedBackup) => {
    // ????????key ??????????
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
        // rollback????????熬곣뫖利당춯??쎾퐲??localStorage snapshot
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

        restoreLocalStorageData(validatedBackup)
      } catch {
        // ???????ㅻ깹???轅붽틓???????????????怨뺤름??rollback
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
      {/* Settings ????????썹땟戮녹??諭?? */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.settings.label}</p>
          <h2 id="settings-title">{t.settings.title}</h2>
        </div>
      </div>

      {/* Settings ????????ロ깫?????*/}
      <div className="settings-tabs" aria-label="Settings tabs">
        {SETTINGS_TABS.map((tab) => (
          <button
            className={`settings-tab ${
                  activeSettingsTab === tab.id ? 'is-active' : ''
            }`}
            key={tab.id}
            type="button"
            onClick={() => handleSettingsTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-grid">
        {/* ?????븐뼐???????????????????????*/}
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
                onClick={() => handleLanguageChange(languageId)}
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
                  onClick={() => handleThemeChange(themeId)}
                >
                  {t.settings.themes[themeId]}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ????????????遺얘턁????????????濾?????釉먮폁???????????釉먮폇????*/}
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
                onClick={() => handleStartModuleChange(moduleId)}
              >
                {t.modules[moduleId]}
              </button>
            ))}
          </div>
        </section>

        {/* ???????????????????????????*/}
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

        {/* ??????????????????????熬곣뫖利당춯??쎾퐲??逆????*/}
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

        {/* ??????꾩룆梨띰쭕?뚢뵾???????????????ㅻ깹???轅붽틓??????*/}
        <BackendStatus t={t} />
        <BackendEchoTest />
        <section className="settings-panel settings-board-storage-panel">
          <div className="settings-board-storage-copy">
            <div className="settings-panel-header">
              <p className="module-label">{t.settings.storageModeLabel}</p>
              <h3>{t.settings.storageModeTitle}</h3>
            </div>
            <p className="settings-note settings-board-storage-note">
              {t.settings.storageModeNote}
              <span>{t.settings.storageCopyNote}</span>
            </p>
          </div>

          <div className="settings-storage-grid">
            <div className="settings-storage-row">
              <div>
                <strong>{t.modules.board}</strong>
                <span>{t.settings.boardStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.boardStorageModeLabel}
                  role="group"
                >
                  {Object.values(BOARD_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={boardStorageMode === mode}
                      className={`settings-option ${boardStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => setBoardStorageMode(saveBoardStorageMode(mode))}
                    >
                      {mode === BOARD_STORAGE_MODES.local ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${boardStorageMode}`}>
                  {boardStorageMode === BOARD_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isBoardRemoteCopying}
                  onClick={handleCopyBoardPostsToRemote}
                >
                  {isBoardRemoteCopying
                    ? t.settings.boardRemoteCopying
                    : t.settings.boardRemoteCopy}
                </button>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isBoardCategoriesRemoteCopying}
                  onClick={handleCopyBoardCategoriesToRemote}
                >
                  {isBoardCategoriesRemoteCopying
                    ? t.settings.boardCategoriesRemoteCopying
                    : t.settings.boardCategoriesRemoteCopy}
                </button>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isBoardImagesRemoteCopying}
                  onClick={handleCopyBoardImagesToRemote}
                >
                  {isBoardImagesRemoteCopying
                    ? t.settings.boardImagesRemoteCopying
                    : t.settings.boardImagesRemoteCopy}
                </button>
              </div>
              {boardRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${boardRemoteCopyStatus.type}`}>
                  {boardRemoteCopyStatus.message}
                </p>
              ) : null}
              {boardCategoriesRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${boardCategoriesRemoteCopyStatus.type}`}>
                  {boardCategoriesRemoteCopyStatus.message}
                </p>
              ) : null}
              {boardImagesRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${boardImagesRemoteCopyStatus.type}`}>
                  {boardImagesRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>

            <div className="settings-storage-row">
              <div>
                <strong>{t.modules.tasks}</strong>
                <span>{t.settings.tasksStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.tasksStorageModeLabel}
                  role="group"
                >
                  {Object.values(TASKS_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={tasksStorageMode === mode}
                      className={`settings-option ${tasksStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => setTasksStorageMode(saveTasksStorageMode(mode))}
                    >
                      {mode === TASKS_STORAGE_MODES.local ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${tasksStorageMode}`}>
                  {tasksStorageMode === TASKS_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isTasksRemoteCopying}
                  onClick={handleCopyTasksToRemote}
                >
                  {isTasksRemoteCopying
                    ? t.settings.tasksRemoteCopying
                    : t.settings.tasksRemoteCopy}
                </button>
              </div>
              {tasksRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${tasksRemoteCopyStatus.type}`}>
                  {tasksRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>

            <div className="settings-storage-row">
              <div>
                <strong>{t.modules.notes}</strong>
                <span>{t.settings.notesStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.notesStorageModeLabel}
                  role="group"
                >
                  {Object.values(NOTES_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={notesStorageMode === mode}
                      className={`settings-option ${notesStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => setNotesStorageMode(saveNotesStorageMode(mode))}
                    >
                      {mode === NOTES_STORAGE_MODES.local ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${notesStorageMode}`}>
                  {notesStorageMode === NOTES_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isNotesRemoteCopying}
                  onClick={handleCopyNotesToRemote}
                >
                  {isNotesRemoteCopying
                    ? t.settings.notesRemoteCopying
                    : t.settings.notesRemoteCopy}
                </button>
              </div>
              {notesRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${notesRemoteCopyStatus.type}`}>
                  {notesRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>

            <div className="settings-storage-row">
              <div>
                <strong>{t.modules.map}</strong>
                <span>{t.settings.mapStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.mapStorageModeLabel}
                  role="group"
                >
                  {Object.values(MAP_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={mapStorageMode === mode}
                      className={`settings-option ${mapStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => setMapStorageMode(saveMapStorageMode(mode))}
                    >
                      {mode === MAP_STORAGE_MODES.local ? 'Local' : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${mapStorageMode}`}>
                  {mapStorageMode === MAP_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isMapRemoteCopying}
                  onClick={handleCopyMapToRemote}
                >
                  {isMapRemoteCopying
                    ? t.settings.mapRemoteCopying
                    : t.settings.mapRemoteCopy}
                </button>
              </div>
              {mapRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${mapRemoteCopyStatus.type}`}>
                  {mapRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>

            <div className="settings-storage-row">
              <div>
                <strong>{t.settings.profileSettingsStorageTitle}</strong>
                <span>{t.settings.profileSettingsStorageDescription}</span>
              </div>
              <div className="settings-board-storage-control">
                <div
                  className="settings-options settings-board-storage-options"
                  aria-label={t.settings.profileSettingsStorageModeLabel}
                  role="group"
                >
                  {Object.values(PROFILE_SETTINGS_STORAGE_MODES).map((mode) => (
                    <button
                      aria-pressed={profileSettingsStorageMode === mode}
                      className={`settings-option ${profileSettingsStorageMode === mode ? 'is-active' : ''}`}
                      key={mode}
                      type="button"
                      onClick={() => handleProfileSettingsModeChange(mode)}
                    >
                      {mode === PROFILE_SETTINGS_STORAGE_MODES.local
                        ? 'Local'
                        : 'Remote'}
                    </button>
                  ))}
                </div>
                <span className={`settings-board-storage-badge is-${profileSettingsStorageMode}`}>
                  {profileSettingsStorageMode === PROFILE_SETTINGS_STORAGE_MODES.local
                    ? t.settings.storageModeLocal
                    : t.settings.storageModeRemote}
                </span>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isProfileRemoteCopying}
                  onClick={handleCopyProfileToRemote}
                >
                  {isProfileRemoteCopying
                    ? t.settings.profileRemoteCopying
                    : t.settings.profileRemoteCopy}
                </button>
                <button
                  className="settings-option settings-board-copy-button"
                  type="button"
                  disabled={isSettingsRemoteCopying}
                  onClick={handleCopySettingsToRemote}
                >
                  {isSettingsRemoteCopying
                    ? t.settings.appSettingsRemoteCopying
                    : t.settings.appSettingsRemoteCopy}
                </button>
              </div>
              {profileRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${profileRemoteCopyStatus.type}`}>
                  {profileRemoteCopyStatus.message}
                </p>
              ) : null}
              {settingsRemoteCopyStatus ? (
                <p className={`backup-status settings-board-copy-status is-${settingsRemoteCopyStatus.type}`}>
                  {settingsRemoteCopyStatus.message}
                </p>
              ) : null}
            </div>
          </div>
        </section>        <BoardApiTest />

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

        {/* ?????????????danger ????????*/}
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
            /* ???????????????癲ル슢???????????븐뼐???????????*/
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
