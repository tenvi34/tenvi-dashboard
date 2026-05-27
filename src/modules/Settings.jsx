import { useRef, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  BACKUP_APP,
  BACKUP_TYPE,
  BACKUP_VERSION,
  createBackupFileName,
  HUD_EFFECTS,
  LANGUAGES,
  START_MODULES,
  THEMES,
  validateBackupPayload,
} from './settingsBackup.js'

// Settings는 데이터 개수 표시와 초기화를 담당하므로 실제 모듈의 저장 키와 같아야 합니다.
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
const NOTES_STORAGE_KEY = STORAGE_KEYS.notes

// Settings 화면의 데이터 현황 표시를 위해 저장 목록의 개수를 안전하게 읽습니다.
const readStoredCount = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return 0
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    // 저장소 상태 표시용이므로 예상 밖 데이터는 삭제하지 않고 0개로만 보여줍니다.
    return Array.isArray(parsedValue) ? parsedValue.length : 0
  } catch {
    return 0
  }
}

// 백업 생성을 위해 지정한 localStorage 목록 데이터를 안전하게 복원합니다.
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

// 백업에 포함할 완료 타이머 세션 수를 안전한 숫자로 복원합니다.
const readStoredCompletedSessions = () => {
  const savedValue = localStorage.getItem(STORAGE_KEYS.timerCompletedSessions)
  const parsedValue = Number.parseInt(savedValue, 10)

  return Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue)
}

// 언어, 시작 모듈, HUD 효과, 데이터 초기화와 백업/복원을 관리하는 컴포넌트입니다.
function Settings({
  hudEffect,
  language,
  onHudEffectChange,
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
  const backupFileInputRef = useRef(null)
  const taskCount = readStoredCount(TASKS_STORAGE_KEY)
  const noteCount = readStoredCount(NOTES_STORAGE_KEY)

  // 사용자가 확인한 뒤 Tasks와 Notes 저장 데이터만 초기화합니다.
  const handleConfirmReset = () => {
    // 초기화는 사용자 콘텐츠인 Tasks/Notes만 대상으로 하고 앱 설정은 유지합니다.
    localStorage.removeItem(TASKS_STORAGE_KEY)
    localStorage.removeItem(NOTES_STORAGE_KEY)
    setIsResetConfirmOpen(false)
    setDataVersion((currentVersion) => currentVersion + 1)
  }

  // reset 직후 컴포넌트를 다시 렌더링해 저장소 개수 표시를 최신화하기 위한 상태입니다.
  void dataVersion

  // 현재 TENVI 데이터를 JSON 백업 파일로 내보냅니다.
  const handleExportBackup = () => {
    const backupPayload = {
      app: BACKUP_APP,
      type: BACKUP_TYPE,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      data: {
        tasks: readStoredList(STORAGE_KEYS.tasks),
        notes: readStoredList(STORAGE_KEYS.notes),
        timerCompletedSessions: readStoredCompletedSessions(),
        language,
        startModule,
        hudEffect,
        theme,
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
  }

  // 선택한 JSON 백업 파일을 검증한 뒤 기존 localStorage 데이터로 복원합니다.
  const handleRestoreBackup = async (event) => {
    const backupFile = event.target.files?.[0]

    if (!backupFile) {
      return
    }

    try {
      const backupPayload = JSON.parse(await backupFile.text())
      // 백업 파일은 기존 localStorage key에 다시 쓰이므로, TENVI 형식과 값 범위를 먼저 검증합니다.
      const validatedBackup = validateBackupPayload(backupPayload)

      if (!validatedBackup) {
        setBackupStatus({ type: 'error', message: t.settings.backupInvalid })
        return
      }

      if (!window.confirm(t.settings.restoreConfirmMessage)) {
        setBackupStatus({ type: 'info', message: t.settings.restoreCancelled })
        return
      }

      // 기존 key 문자열과 저장 구조를 유지해야 이전 데이터와 다른 모듈 동작이 깨지지 않습니다.
      localStorage.setItem(
        STORAGE_KEYS.tasks,
        JSON.stringify(validatedBackup.tasks),
      )
      localStorage.setItem(
        STORAGE_KEYS.notes,
        JSON.stringify(validatedBackup.notes),
      )
      localStorage.setItem(
        STORAGE_KEYS.timerCompletedSessions,
        String(validatedBackup.timerCompletedSessions),
      )
      localStorage.setItem(STORAGE_KEYS.language, validatedBackup.language)
      localStorage.setItem(STORAGE_KEYS.startModule, validatedBackup.startModule)
      localStorage.setItem(STORAGE_KEYS.hudEffect, validatedBackup.hudEffect)
      localStorage.setItem(STORAGE_KEYS.theme, validatedBackup.theme)

      onLanguageChange(validatedBackup.language)
      onStartModuleChange(validatedBackup.startModule)
      onHudEffectChange(validatedBackup.hudEffect)
      onThemeChange(validatedBackup.theme)
      setDataVersion((currentVersion) => currentVersion + 1)
      setBackupStatus({ type: 'success', message: t.settings.restoreComplete })
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
      {/* Settings 상단 제목 영역 */}
      <div className="module-header">
        <div>
          <p className="module-label">{t.settings.label}</p>
          <h2 id="settings-title">{t.settings.title}</h2>
        </div>
      </div>

      {/* Settings 설정 그룹 전체 그리드 */}
      <div className="settings-grid">
        {/* 언어 선택 그룹 */}
        <section className="settings-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.language}</p>
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
                // 실제 저장은 App 상태 변경 후 App의 useEffect에서 처리됩니다.
                onClick={() => onLanguageChange(languageId)}
              >
                {t.languages[languageId]}
              </button>
            ))}
          </div>
        </section>

        {/* 기본 시작 모듈 선택 그룹 */}
        <section className="settings-panel">
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
                // 시작 모듈 설정은 다음 앱 로드 시 초기 activeModule 값으로 사용됩니다.
                onClick={() => onStartModuleChange(moduleId)}
              >
                {t.modules[moduleId]}
              </button>
            ))}
          </div>
        </section>

        {/* 디자인 테마는 App 최상위 클래스에 반영되어 전체 모듈의 시각 톤을 전환합니다. */}
        <section className="settings-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.theme}</p>
            <h3>{t.settings.design}</h3>
          </div>
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
        </section>

        {/* HUD 효과 강도는 선택한 디자인 테마 안에서 광원과 장식 밀도만 조절합니다. */}
        <section className="settings-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.hudEffect}</p>
            <h3>{t.settings.visuals}</h3>
          </div>
          <div className="settings-options" aria-label={t.settings.hudEffect}>
            {HUD_EFFECTS.map((effectId) => (
              <button
                className={`settings-option ${
                  hudEffect === effectId ? 'is-active' : ''
                }`}
                key={effectId}
                type="button"
                // HUD 효과는 App의 최상위 CSS 클래스에 반영되어 전체 화면 톤을 바꿉니다.
                onClick={() => onHudEffectChange(effectId)}
              >
                {t.settings.effects[effectId]}
              </button>
            ))}
          </div>
        </section>

        {/* 저장된 Tasks/Notes 데이터 현황과 초기화 그룹 */}
        <section className="settings-panel">
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
            /* 데이터 초기화 확인 패널 */
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

        {/* 데이터 백업/복원 그룹 */}
        <section className="settings-panel">
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
          {backupStatus ? (
            <p className={`backup-status is-${backupStatus.type}`}>
              {backupStatus.message}
            </p>
          ) : null}
        </section>
      </div>
    </section>
  )
}

export default Settings
