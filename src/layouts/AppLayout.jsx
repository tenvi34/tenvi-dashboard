import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import MobileTabBar from '../components/MobileTabBar.jsx'
import Sidebar from '../components/Sidebar.jsx'
import ModuleIcon from '../components/ModuleIcon.jsx'
import { translations } from '../i18n/translations.js'
import { getModuleFromPathname, getModulePath } from '../router/routes.js'

const MODULES = [
  { id: 'dashboard' },
  { id: 'board' },
  { id: 'calendar' },
  { id: 'map' },
  { id: 'travel' },
  { id: 'settings' },
]

const MOBILE_TAB_MODULES = [
  { id: 'dashboard' },
  { id: 'travel' },
  { id: 'calendar' },
  { id: 'map' },
]

const MOBILE_MORE_MODULES = [{ id: 'board' }, { id: 'settings' }]

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
    <main className={`tenvi-dashboard tenvi-app theme-${theme}`}>
      <a
        className="skip-link"
        href="#module-content"
      >
        {t.app.skipToContent}
      </a>

      <section
        className="tenvi-shell"
        aria-labelledby="tenvi-title"
      >
        <header className="tenvi-header">
          <div className="app-brand">
            <span
              className="brand-mark"
              aria-hidden="true"
            >
              T
            </span>
            <div>
              <h1 id="tenvi-title">TENVI</h1>
              <span>{t.app.personalSpace}</span>
            </div>
          </div>
          <div className="app-location">
            <ModuleIcon name={activeModule} />
            <span>{activeModuleLabel}</span>
          </div>
          <label className="app-language">
            <span>{t.app.languageLabel}</span>
            <select
              aria-label={t.app.languageLabel}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {Object.keys(translations).map((id) => (
                <option
                  key={id}
                  value={id}
                >
                  {t.languages[id]}
                </option>
              ))}
            </select>
          </label>
        </header>

        <section className="tenvi-workspace">
          <Sidebar
            activeModule={activeModule}
            modules={MODULES}
            t={t}
          />

          <section
            className="module-stage"
            id="module-content"
            tabIndex={-1}
            aria-label={`${activeModuleLabel} ${t.app.stageLabel}`}
          >
            <Outlet context={{ ...appContext, onModuleChange: handleModuleChange }} />
          </section>
        </section>

        <MobileTabBar
          key={activeModule}
          activeModule={activeModule}
          moreModules={MOBILE_MORE_MODULES}
          modules={MOBILE_TAB_MODULES}
          t={t}
        />
      </section>
    </main>
  )
}

export default AppLayout
