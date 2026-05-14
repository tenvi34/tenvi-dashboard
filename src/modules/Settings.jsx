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
  validateBackupPayload,
} from './settingsBackup.js'

// Settings는 데이터 개수 표시와 초기화를 담당하므로 실제 모듈의 저장 키와 같아야 합니다.
const TASKS_STORAGE_KEY = STORAGE_KEYS.tasks
const NOTES_STORAGE_KEY = STORAGE_KEYS.notes

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

function Settings({
  hudEffect,
  language,
  onHudEffectChange,
  onLanguageChange,
  onStartModuleChange,
  startModule,
  t,
}) {
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [dataVersion, setDataVersion] = useState(0)
  const [backupStatus, setBackupStatus] = useState(null)
  const backupFileInputRef = useRef(null)
  const taskCount = readStoredCount(TASKS_STORAGE_KEY)
  const noteCount = readStoredCount(NOTES_STORAGE_KEY)

  const handleConfirmReset = () => {
    // 초기화는 사용자 콘텐츠인 Tasks/Notes만 대상으로 하고 앱 설정은 유지합니다.
    localStorage.removeItem(TASKS_STORAGE_KEY)
    localStorage.removeItem(NOTES_STORAGE_KEY)
    setIsResetConfirmOpen(false)
    setDataVersion((currentVersion) => currentVersion + 1)
  }

  // reset 직후 컴포넌트를 다시 렌더링해 저장소 개수 표시를 최신화하기 위한 상태입니다.
  void dataVersion

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

      onLanguageChange(validatedBackup.language)
      onStartModuleChange(validatedBackup.startModule)
      onHudEffectChange(validatedBackup.hudEffect)
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
      <div className="module-header">
        <div>
          <p className="module-label">{t.settings.label}</p>
          <h2 id="settings-title">{t.settings.title}</h2>
        </div>
      </div>

      <div className="settings-grid">
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
