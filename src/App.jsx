import { useEffect, useMemo, useState } from 'react'
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

// 새 모듈을 추가할 때는 사이드바 목록과 아래 moduleComponents 매핑을 함께 맞춰야 합니다.
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

// 앱 전역 설정과 현재 모듈 화면을 관리하는 최상위 컴포넌트입니다.
function App() {
  const [startModule, setStartModule] = useState(() => {
    const savedStartModule = localStorage.getItem(STORAGE_KEYS.startModule)

    // localStorage 값이 예전 버전이거나 손상된 경우 안전한 기본 모듈로 시작합니다.
    return START_MODULES.includes(savedStartModule) ? savedStartModule : 'tasks'
  })
  const [activeModule, setActiveModule] = useState(startModule)
  const [hudEffect, setHudEffect] = useState(() => {
    const savedHudEffect = localStorage.getItem(STORAGE_KEYS.hudEffect)

    // 허용된 HUD 효과만 복원해 CSS 클래스가 예상 범위를 벗어나지 않게 합니다.
    return HUD_EFFECTS.includes(savedHudEffect) ? savedHudEffect : 'normal'
  })
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme)

    // 테마 값은 최상위 CSS 클래스에 직접 연결되므로 허용된 값만 복원합니다.
    return THEMES.includes(savedTheme) ? savedTheme : 'hud'
  })
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.language)

    // 지원하지 않는 언어 코드는 translations 접근 오류를 막기 위해 기본 언어로 되돌립니다.
    return isSupportedLanguage(savedLanguage) ? savedLanguage : 'ko'
  })

  // 설정 변경은 App 상태를 기준으로 즉시 저장되어 새로고침 후에도 유지됩니다.
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
  // activeModule 문자열을 실제 모듈 컴포넌트로 바꾸는 중앙 전환 지점입니다.
  const moduleComponents = useMemo(
    () => ({
      dashboard: <Dashboard t={t} />,
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
          // Settings는 App의 전역 설정 setter를 받아 저장 흐름을 한곳으로 유지합니다.
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

      {/* TENVI 전체 화면 프레임: 상단 헤더와 모듈 작업 영역을 감쌉니다. */}
      <section className="tenvi-shell" aria-labelledby="tenvi-title">
        {/* 앱 상단 브랜드, 언어 전환, 시스템 상태 영역 */}
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

        {/* 좌측 Sidebar와 우측 활성 모듈 화면 영역 */}
        <section className="tenvi-workspace">
          <Sidebar
            activeModule={activeModule}
            modules={MODULES}
            onModuleChange={setActiveModule}
            t={t}
          />

          {/* activeModule 값에 따라 실제 화면 컴포넌트가 교체되는 영역 */}
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
