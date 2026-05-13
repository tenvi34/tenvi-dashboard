import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import { isSupportedLanguage, translations } from './i18n/translations.js'
import Command from './modules/Command.jsx'
import Dashboard from './modules/Dashboard.jsx'
import Notes from './modules/Notes.jsx'
import Settings from './modules/Settings.jsx'
import Tasks from './modules/Tasks.jsx'
import Timer from './modules/Timer.jsx'
import './App.css'

const LANGUAGE_STORAGE_KEY = 'tenvi.language'
const START_MODULE_STORAGE_KEY = 'tenvi.startModule'
const HUD_EFFECT_STORAGE_KEY = 'tenvi.hudEffect'

const START_MODULES = ['dashboard', 'tasks', 'notes', 'command']
const HUD_EFFECTS = ['normal', 'reduced']

const MODULES = [
  { id: 'dashboard' },
  { id: 'command' },
  { id: 'tasks' },
  { id: 'notes' },
  { id: 'timer' },
  { id: 'settings' },
]

function App() {
  const [startModule, setStartModule] = useState(() => {
    const savedStartModule = localStorage.getItem(START_MODULE_STORAGE_KEY)

    return START_MODULES.includes(savedStartModule) ? savedStartModule : 'tasks'
  })
  const [activeModule, setActiveModule] = useState(startModule)
  const [hudEffect, setHudEffect] = useState(() => {
    const savedHudEffect = localStorage.getItem(HUD_EFFECT_STORAGE_KEY)

    return HUD_EFFECTS.includes(savedHudEffect) ? savedHudEffect : 'normal'
  })
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)

    return isSupportedLanguage(savedLanguage) ? savedLanguage : 'ko'
  })

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  useEffect(() => {
    localStorage.setItem(START_MODULE_STORAGE_KEY, startModule)
  }, [startModule])

  useEffect(() => {
    localStorage.setItem(HUD_EFFECT_STORAGE_KEY, hudEffect)
  }, [hudEffect])

  const t = translations[language]
  const activeModuleLabel = t.modules[activeModule] ?? t.modules.tasks
  const moduleComponents = useMemo(
    () => ({
      dashboard: <Dashboard t={t} />,
      command: <Command t={t} />,
      tasks: <Tasks t={t} />,
      notes: <Notes t={t} />,
      timer: <Timer t={t} />,
      settings: (
        <Settings
          hudEffect={hudEffect}
          language={language}
          onHudEffectChange={setHudEffect}
          onLanguageChange={setLanguage}
          onStartModuleChange={setStartModule}
          startModule={startModule}
          t={t}
        />
      ),
    }),
    [hudEffect, language, startModule, t],
  )

  return (
    <main className={`tenvi-dashboard hud-${hudEffect}`}>
      <div className="tenvi-grid" aria-hidden="true"></div>

      <section className="tenvi-shell" aria-labelledby="tenvi-title">
        <header className="tenvi-header">
          <div>
            {/* <p className="tenvi-kicker">Personal AI Command Dashboard</p> */}
            <h1 id="tenvi-title">TENVI</h1>
          </div>
          <div className="header-controls">
            <div className="language-switch" aria-label={t.app.languageLabel}>
              {Object.keys(translations).map((languageId) => (
                <button
                  className={`language-button ${
                    language === languageId ? 'is-active' : ''
                  }`}
                  key={languageId}
                  type="button"
                  onClick={() => setLanguage(languageId)}
                >
                  {t.languages[languageId]}
                </button>
              ))}
            </div>
            <div className="system-status" aria-label={t.app.statusLabel}>
              <span className="status-dot"></span>
              <span>{t.app.status}</span>
            </div>
          </div>
        </header>

        <section className="tenvi-workspace">
          <Sidebar
            activeModule={activeModule}
            modules={MODULES}
            onModuleChange={setActiveModule}
            t={t}
          />

          <section
            className="module-stage"
            aria-label={`${activeModuleLabel} ${t.app.stageLabel}`}
          >
            {moduleComponents[activeModule]}
          </section>
        </section>
      </section>
    </main>
  )
}

export default App
