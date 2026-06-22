import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { getAllBoardImages, putBoardImages } from './boardImageStore.js'
import { getAllProfileImages, putProfileImages } from './profileImageStore.js'

export const BOARD_BACKUP_APP = 'TENVI Dashboard'
export const BOARD_BACKUP_TYPE = 'board-backup'
export const BOARD_BACKUP_VERSION = 1

export const BOARD_BACKUP_STORAGE_KEYS = [
  STORAGE_KEYS.boardPosts,
  STORAGE_KEYS.boardCategories,
  STORAGE_KEYS.boardDraft,
  STORAGE_KEYS.boardDrafts,
  STORAGE_KEYS.userProfile,
]

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// 파일명 충돌을 줄이는 Board 백업 timestamp
export const createBoardBackupFileName = (date = new Date()) => {
  const timestamp = date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, '')
    .replace('T', '-')

  return `tenvi-board-backup-${timestamp}.json`
}

const normalizeBoardImageBackupRecord = (imageRecord) => {
  if (!isPlainObject(imageRecord)) {
    return null
  }

  const id = String(imageRecord.id ?? '').trim()
  const dataUrl = String(imageRecord.dataUrl ?? '').trim()

  if (!id || !dataUrl) {
    return null
  }

  return {
    id,
    dataUrl,
    name: String(imageRecord.name ?? 'image').trim() || 'image',
    type: String(imageRecord.type ?? '').trim(),
    createdAt: String(imageRecord.createdAt ?? '').trim(),
  }
}

const normalizeProfileImageBackupRecord = normalizeBoardImageBackupRecord

// localStorage 원문과 IndexedDB 이미지 레코드를 하나의 payload로 수집
export const collectBoardBackupData = async ({
  now = new Date(),
  readBoardImages = getAllBoardImages,
  readProfileImages = getAllProfileImages,
  storage = localStorage,
} = {}) => {
  const localStorageData = Object.fromEntries(
    BOARD_BACKUP_STORAGE_KEYS.map((storageKey) => [
      storageKey,
      storage.getItem(storageKey),
    ]),
  )
  const boardImages = (await readBoardImages())
    .map(normalizeBoardImageBackupRecord)
    .filter(Boolean)
  const profileImages = (await readProfileImages())
    .map(normalizeProfileImageBackupRecord)
    .filter(Boolean)

  return {
    version: BOARD_BACKUP_VERSION,
    app: BOARD_BACKUP_APP,
    type: BOARD_BACKUP_TYPE,
    exportedAt: now.toISOString(),
    localStorage: localStorageData,
    indexedDb: {
      boardImages,
      profileImages,
    },
  }
}

export const validateBoardBackupData = (backupPayload) => {
  if (
    !isPlainObject(backupPayload) ||
    backupPayload.version !== BOARD_BACKUP_VERSION ||
    backupPayload.app !== BOARD_BACKUP_APP ||
    backupPayload.type !== BOARD_BACKUP_TYPE ||
    !isPlainObject(backupPayload.localStorage) ||
    !isPlainObject(backupPayload.indexedDb) ||
    !Array.isArray(backupPayload.indexedDb.boardImages) ||
    (backupPayload.indexedDb.profileImages !== undefined &&
      !Array.isArray(backupPayload.indexedDb.profileImages))
  ) {
    return null
  }

  const localStorageData = {}

  for (const storageKey of BOARD_BACKUP_STORAGE_KEYS) {
    const value = backupPayload.localStorage[storageKey]

    if (value !== null && value !== undefined && typeof value !== 'string') {
      return null
    }

    localStorageData[storageKey] = value ?? null
  }

  const boardImages = backupPayload.indexedDb.boardImages
    .map(normalizeBoardImageBackupRecord)
    .filter(Boolean)
  const profileImages = (backupPayload.indexedDb.profileImages ?? [])
    .map(normalizeProfileImageBackupRecord)
    .filter(Boolean)

  if (
    boardImages.length !== backupPayload.indexedDb.boardImages.length ||
    profileImages.length !== (backupPayload.indexedDb.profileImages ?? []).length
  ) {
    return null
  }

  return {
    version: BOARD_BACKUP_VERSION,
    app: BOARD_BACKUP_APP,
    type: BOARD_BACKUP_TYPE,
    exportedAt: String(backupPayload.exportedAt ?? ''),
    localStorage: localStorageData,
    indexedDb: {
      boardImages,
      profileImages,
    },
  }
}

// 검증된 key만 복원해 unrelated localStorage 데이터 보호
export const restoreBoardBackupData = async (
  backupPayload,
  {
    putImages = putBoardImages,
    putProfileImageRecords = putProfileImages,
    storage = localStorage,
  } = {},
) => {
  const validatedBackup = validateBoardBackupData(backupPayload)

  if (!validatedBackup) {
    return null
  }

  Object.entries(validatedBackup.localStorage).forEach(([storageKey, value]) => {
    if (value === null) {
      storage.removeItem(storageKey)
      return
    }

    storage.setItem(storageKey, value)
  })

  await putImages(validatedBackup.indexedDb.boardImages)
  await putProfileImageRecords(validatedBackup.indexedDb.profileImages)

  return validatedBackup
}

export const downloadBoardBackupFile = (backupPayload) => {
  const backupBlob = new Blob([JSON.stringify(backupPayload, null, 2)], {
    type: 'application/json',
  })
  const backupUrl = URL.createObjectURL(backupBlob)
  const downloadLink = document.createElement('a')

  downloadLink.href = backupUrl
  downloadLink.download = createBoardBackupFileName()
  downloadLink.click()
  URL.revokeObjectURL(backupUrl)
}

export const parseBoardBackupFile = async (backupFile) =>
  validateBoardBackupData(JSON.parse(await backupFile.text()))
