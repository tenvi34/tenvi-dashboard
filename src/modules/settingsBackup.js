export const START_MODULES = ['dashboard', 'tasks', 'notes', 'board', 'command']
export const HUD_EFFECTS = ['normal', 'reduced']
export const THEMES = ['hud', 'standard']
export const LANGUAGES = ['ko', 'en']
export const BACKUP_APP = 'TENVI'
export const BACKUP_TYPE = 'tenvi-dashboard-backup'
export const BACKUP_VERSION = 1

// 백업 파일명 생성
export const createBackupFileName = () => {
  const today = new Date().toISOString().slice(0, 10)

  return `tenvi-backup-${today}.json`
}

// 순수 객체 검증
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// 백업 payload 정규화
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
    theme = 'hud',
    timerCompletedSessions,
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
  const normalizedTimerSessions = Number.parseInt(timerCompletedSessions, 10)

  if (
    !Array.isArray(tasks) ||
    !Array.isArray(notes) ||
    Number.isNaN(normalizedTimerSessions) ||
    normalizedTimerSessions < 0 ||
    !LANGUAGES.includes(language) ||
    !START_MODULES.includes(startModule) ||
    !HUD_EFFECTS.includes(hudEffect) ||
    !THEMES.includes(theme)
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

  return {
    boardPosts: hasBoardPosts ? boardPosts : undefined,
    calendarEvents: hasCalendarEvents ? calendarEvents : undefined,
    hasBoardPosts,
    hasCalendarEvents,
    hudEffect,
    hasMapPhotoCollections,
    hasMapPhotoRecords,
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
    theme,
    timerCompletedSessions: normalizedTimerSessions,
  }
}
