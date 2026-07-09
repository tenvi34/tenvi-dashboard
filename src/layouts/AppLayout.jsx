import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import MobileTabBar from '../components/MobileTabBar.jsx'
import Sidebar from '../components/Sidebar.jsx'
import { translations } from '../i18n/translations.js'
import { getModuleFromPathname, getModulePath } from '../router/routes.js'

const MODULES = [
  { id: 'dashboard' },
  { id: 'command' },
  { id: 'tasks' },
  { id: 'notes' },
  { id: 'board' },
  { id: 'calendar' },
  { id: 'map' },
  { id: 'timer' },
  { id: 'settings' },
]

const MOBILE_TAB_MODULES = [
  { id: 'dashboard' },
  { id: 'tasks' },
  { id: 'notes' },
  { id: 'map' },
]

const MOBILE_MORE_MODULES = [
  { id: 'calendar' },
  { id: 'board' },
  { id: 'command' },
  { id: 'timer' },
  { id: 'settings' },
]

function AppLayout({ appContext }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { language, setLanguage, t, theme } = appContext
  const activeModule = getModuleFromPathname(location.pathname)
  const activeModuleLabel = t.modules[activeModule] ?? t.modules.dashboard

  // 모듈 전환은 URL 이동으로 단일화
  const handleModuleChange = (moduleId) => {
    navigate(getModulePath(moduleId))
  }

  return (
    <main className={`tenvi-dashboard theme-${theme}`}>
      <div className="tenvi-grid" aria-hidden="true"></div>

      <section className="tenvi-shell" aria-labelledby="tenvi-title">
        <header className="tenvi-header">
          <div>
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
            onModuleChange={handleModuleChange}
            t={t}
          />

          <section
            className="module-stage"
            aria-label={`${activeModuleLabel} ${t.app.stageLabel}`}
          >
            <Outlet context={{ ...appContext, onModuleChange: handleModuleChange }} />
          </section>
        </section>

        <MobileTabBar
          activeModule={activeModule}
          moreModules={MOBILE_MORE_MODULES}
          modules={MOBILE_TAB_MODULES}
          onModuleChange={handleModuleChange}
          t={t}
        />
      </section>
    </main>
  )
}

export default AppLayout
