import { useState } from 'react'

const TASKS_STORAGE_KEY = 'todo-manager-lite.todos'
const NOTES_STORAGE_KEY = 'tenvi.notes'

const START_MODULES = ['dashboard', 'tasks', 'notes', 'command']
const HUD_EFFECTS = ['normal', 'reduced']
const LANGUAGES = ['ko', 'en']

const readStoredCount = (storageKey) => {
  const savedValue = localStorage.getItem(storageKey)

  if (!savedValue) {
    return 0
  }

  try {
    const parsedValue = JSON.parse(savedValue)
    return Array.isArray(parsedValue) ? parsedValue.length : 0
  } catch {
    return 0
  }
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
  const taskCount = readStoredCount(TASKS_STORAGE_KEY)
  const noteCount = readStoredCount(NOTES_STORAGE_KEY)

  const handleConfirmReset = () => {
    localStorage.removeItem(TASKS_STORAGE_KEY)
    localStorage.removeItem(NOTES_STORAGE_KEY)
    setIsResetConfirmOpen(false)
    setDataVersion((currentVersion) => currentVersion + 1)
  }

  void dataVersion

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
      </div>
    </section>
  )
}

export default Settings
