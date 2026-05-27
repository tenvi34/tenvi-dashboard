export const START_MODULES = ['dashboard', 'tasks', 'notes', 'command']
export const HUD_EFFECTS = ['normal', 'reduced']
export const LANGUAGES = ['ko', 'en']
export const BACKUP_APP = 'TENVI'
export const BACKUP_TYPE = 'tenvi-dashboard-backup'
export const BACKUP_VERSION = 1

// 오늘 날짜를 포함한 TENVI 백업 파일명을 생성합니다.
export const createBackupFileName = () => {
  const today = new Date().toISOString().slice(0, 10)

  return `tenvi-backup-${today}.json`
}

// 백업 payload 검증에 사용할 순수 객체 여부를 확인합니다.
const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// 가져온 백업 payload가 TENVI 복원 형식에 맞는지 검증하고 정규화합니다.
export const validateBackupPayload = (backupPayload) => {
  if (!isPlainObject(backupPayload)) {
    return null
  }

  // 기존 localStorage key에 덮어쓰기 전에 TENVI 백업 형식과 허용값을 먼저 검증합니다.
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
    notes,
    startModule,
    tasks,
    timerCompletedSessions,
  } = backupPayload.data
  const normalizedTimerSessions = Number.parseInt(timerCompletedSessions, 10)

  if (
    !Array.isArray(tasks) ||
    !Array.isArray(notes) ||
    Number.isNaN(normalizedTimerSessions) ||
    normalizedTimerSessions < 0 ||
    !LANGUAGES.includes(language) ||
    !START_MODULES.includes(startModule) ||
    !HUD_EFFECTS.includes(hudEffect)
  ) {
    return null
  }

  return {
    hudEffect,
    language,
    notes,
    startModule,
    tasks,
    timerCompletedSessions: normalizedTimerSessions,
  }
}
