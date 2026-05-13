import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import { isSupportedLanguage, translations } from './i18n/translations.js'
import Dashboard from './modules/Dashboard.jsx'
import Notes from './modules/Notes.jsx'
import Settings from './modules/Settings.jsx'
import Tasks from './modules/Tasks.jsx'
import Timer from './modules/Timer.jsx'
import './App.css'

const LANGUAGE_STORAGE_KEY = 'tenvi.language'

const MODULES = [
  { id: 'dashboard' },
  { id: 'tasks' },
  { id: 'notes' },
  { id: 'timer' },
  { id: 'settings' },
]

function App() {
  const [activeModule, setActiveModule] = useState('tasks')
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY)

    return isSupportedLanguage(savedLanguage) ? savedLanguage : 'ko'
  })

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  const t = translations[language]
  const activeModuleLabel = t.modules[activeModule] ?? t.modules.tasks
  const moduleComponents = useMemo(
    () => ({
      dashboard: <Dashboard t={t} />,
      tasks: <Tasks t={t} />,
      notes: <Notes t={t} />,
      timer: <Timer t={t} />,
      settings: <Settings t={t} />,
    }),
    [t],
  )

  return (
    <main className="tenvi-dashboard">
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
