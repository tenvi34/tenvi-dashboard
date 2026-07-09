export const START_MODULES = ['dashboard', 'tasks', 'notes', 'board', 'command']
export const HUD_EFFECTS = ['normal', 'reduced']
export const THEMES = ['dark', 'standard']
export const LANGUAGES = ['ko', 'en']
export const BACKUP_APP = 'TENVI'
export const BACKUP_TYPE = 'tenvi-dashboard-backup'
export const BACKUP_VERSION = 1

// 백업 파일명 생성
// 백업 파일명 생성
export const createBackupFileName = () => {
  const today = new Date().toISOString().slice(0, 10)

  return `tenvi-backup-${today}.json`
}

// 순수 객체 검증
// 순수 객체 검증
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// 백업 payload 정규화
// 백업 payload 검증과 정규화
export const validateBackupPayload = (backupPayload) => {
  if (!isPlainObject(backupPayload)) {
    return null
  }

  // 복원 전 형식 검증
  if (
    backupPayload.app !== BACKUP_APP ||
    backupPayload.type !== BACKUP_TYPE ||
    backupPayload.version !== BACKUP_VERSION ||
    !isPlainObject(backupPayload.data)
  ) {
    return null
  }

  const {
    hudEffect,
    language,
    boardPosts,
    calendarEvents,
    notes,
    startModule,
    tasks,
    theme = 'dark',
  } = backupPayload.data
  const hasMapPhotoRecords = Object.prototype.hasOwnProperty.call(
    backupPayload.data,
    'mapPhotoRecords',
  )
  const hasMapPhotoCollections = Object.prototype.hasOwnProperty.call(
    backupPayload.data,
    'mapPhotoCollections',
  )
  const hasBoardPosts = Object.prototype.hasOwnProperty.call(
    backupPayload.data,
    'boardPosts',
  )
  const hasCalendarEvents = Object.prototype.hasOwnProperty.call(
    backupPayload.data,
    'calendarEvents',
  )
  const hasUserProfile = Object.prototype.hasOwnProperty.call(
    backupPayload.data,
    'userProfile',
  )

  // hudEffect: 구 백업 호환을 위해 존재하면 검증, 없으면 허용
  const isHudEffectValid = hudEffect === undefined || HUD_EFFECTS.includes(hudEffect)
  // theme: 구 백업의 'hud' 값을 'dark'로 정규화
  const normalizedTheme = theme === 'hud' ? 'dark' : theme

  if (
    !Array.isArray(tasks) ||
    !Array.isArray(notes) ||
    !LANGUAGES.includes(language) ||
    !START_MODULES.includes(startModule) ||
    !isHudEffectValid ||
    !THEMES.includes(normalizedTheme)
  ) {
    return null
  }

  if (hasMapPhotoRecords && !Array.isArray(backupPayload.data.mapPhotoRecords)) {
    return null
  }

  if (hasBoardPosts && !Array.isArray(boardPosts)) {
    return null
  }

  if (hasCalendarEvents && !Array.isArray(calendarEvents)) {
    return null
  }

  if (
    hasMapPhotoCollections &&
    !Array.isArray(backupPayload.data.mapPhotoCollections)
  ) {
    return null
  }

  if (hasUserProfile && !isPlainObject(backupPayload.data.userProfile)) {
    return null
  }

  return {
    boardPosts: hasBoardPosts ? boardPosts : undefined,
    calendarEvents: hasCalendarEvents ? calendarEvents : undefined,
    hasBoardPosts,
    hasCalendarEvents,
    hasMapPhotoCollections,
    hasMapPhotoRecords,
    hasUserProfile,
    language,
    mapPhotoCollections: hasMapPhotoCollections
      ? backupPayload.data.mapPhotoCollections
      : undefined,
    mapPhotoRecords: hasMapPhotoRecords
      ? backupPayload.data.mapPhotoRecords
      : undefined,
    notes,
    startModule,
    tasks,
    theme: normalizedTheme,
    userProfile: hasUserProfile ? backupPayload.data.userProfile : undefined,
  }
}
