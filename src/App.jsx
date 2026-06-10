import { useEffect, useMemo, useState } from 'react'
import MobileTabBar from './components/MobileTabBar.jsx'
import Sidebar from './components/Sidebar.jsx'
import { STORAGE_KEYS } from './constants/storageKeys.js'
import { isSupportedLanguage, translations } from './i18n/translations.js'
import Calendar from './modules/Calendar.jsx'
import Command from './modules/Command.jsx'
import Dashboard from './modules/Dashboard.jsx'
import Map from './modules/Map.jsx'
import Notes from './modules/Notes.jsx'
import Settings from './modules/Settings.jsx'
import Tasks from './modules/Tasks.jsx'
import Timer from './modules/Timer.jsx'
import './App.css'

const START_MODULES = ['dashboard', 'tasks', 'notes', 'command']
const HUD_EFFECTS = ['normal', 'reduced']
const THEMES = ['hud', 'standard']

// 모듈 목록과 매핑
const MODULES = [
  { id: 'dashboard' },
  { id: 'command' },
  { id: 'tasks' },
  { id: 'notes' },
  { id: 'calendar' },
  { id: 'map' },
  { id: 'timer' },
  { id: 'settings' },
]

// 모바일 탭 activeModule 공유
const MOBILE_TAB_MODULES = [
  { id: 'dashboard' },
  { id: 'tasks' },
  { id: 'notes' },
  { id: 'map' },
]

const MOBILE_MORE_MODULES = [
  { id: 'calendar' },
  { id: 'command' },
  { id: 'timer' },
  { id: 'settings' },
]

// 앱 최상위 컴포넌트
function App() {
  const [startModule, setStartModule] = useState(() => {
    const savedStartModule = localStorage.getItem(STORAGE_KEYS.startModule)

    // 기본 모듈 fallback
    return START_MODULES.includes(savedStartModule) ? savedStartModule : 'tasks'
  })
  const [activeModule, setActiveModule] = useState(startModule)
  const [hudEffect, setHudEffect] = useState(() => {
    const savedHudEffect = localStorage.getItem(STORAGE_KEYS.hudEffect)

    // HUD 효과 검증
    return HUD_EFFECTS.includes(savedHudEffect) ? savedHudEffect : 'normal'
  })
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme)

    // 테마 값 검증
    return THEMES.includes(savedTheme) ? savedTheme : 'hud'
  })
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.language)

    // 언어 코드 fallback
    return isSupportedLanguage(savedLanguage) ? savedLanguage : 'ko'
  })

  // 설정 즉시 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, language)
  }, [language])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.startModule, startModule)
  }, [startModule])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.hudEffect, hudEffect)
  }, [hudEffect])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, theme)
  }, [theme])

  const t = translations[language]
  const activeModuleLabel = t.modules[activeModule] ?? t.modules.tasks
  // 모듈 컴포넌트 전환
  const moduleComponents = useMemo(
    () => ({
      dashboard: (
        <Dashboard
          hudEffect={hudEffect}
          language={language}
          startModule={startModule}
          t={t}
          theme={theme}
        />
      ),
      command: <Command onModuleChange={setActiveModule} t={t} />,
      tasks: <Tasks t={t} />,
      notes: <Notes t={t} />,
      calendar: <Calendar t={t} />,
      map: <Map t={t} />,
      timer: <Timer t={t} />,
      settings: (
        <Settings
          hudEffect={hudEffect}
          language={language}
          // Settings 전역 setter
          onHudEffectChange={setHudEffect}
          onLanguageChange={setLanguage}
          onStartModuleChange={setStartModule}
          onThemeChange={setTheme}
          startModule={startModule}
          t={t}
          theme={theme}
        />
      ),
    }),
    [hudEffect, language, startModule, t, theme],
  )

  return (
    <main className={`tenvi-dashboard theme-${theme} hud-${hudEffect}`}>
      <div className="tenvi-grid" aria-hidden="true"></div>

      {/* TENVI 화면 프레임 */}
      <section className="tenvi-shell" aria-labelledby="tenvi-title">
        {/* 상단 브랜드 영역 */}
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

        {/* Sidebar와 모듈 화면 */}
        <section className="tenvi-workspace">
          <Sidebar
            activeModule={activeModule}
            modules={MODULES}
            onModuleChange={setActiveModule}
            t={t}
          />

          {/* activeModule 렌더 영역 */}
          <section
            className="module-stage"
            aria-label={`${activeModuleLabel} ${t.app.stageLabel}`}
          >
            {moduleComponents[activeModule]}
          </section>
        </section>

        <MobileTabBar
          activeModule={activeModule}
          moreModules={MOBILE_MORE_MODULES}
          modules={MOBILE_TAB_MODULES}
          onModuleChange={setActiveModule}
          t={t}
        />
      </section>
    </main>
  )
}

export default App
