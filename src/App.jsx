import { useEffect, useMemo, useState } from 'react'
import { STORAGE_KEYS } from './constants/storageKeys.js'
import { isSupportedLanguage, translations } from './i18n/translations.js'
import { readProfileSettingsStorageMode } from './modules/profileSettingsStorageMode.js'
import { loadRemoteAppSettings } from './modules/profileSettingsRemoteCopy.js'
import { START_MODULES } from './modules/settingsBackup.js'
import AppRouter from './router/AppRouter.jsx'
import './App.css'

const THEMES = ['dark', 'standard']

function App() {
  const [settingsReady, setSettingsReady] = useState(() => readProfileSettingsStorageMode() !== 'remote')
  const [startModule, setStartModule] = useState(() => {
    const savedStartModule = localStorage.getItem(STORAGE_KEYS.startModule)

    // 시작 모듈 localStorage 호환
    return START_MODULES.includes(savedStartModule) ? savedStartModule : 'dashboard'
  })
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme)

    // 이전 HUD 테마 값 마이그레이션
    if (savedTheme === 'hud') return 'dark'

    return THEMES.includes(savedTheme) ? savedTheme : 'dark'
  })
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem(STORAGE_KEYS.language)

    // 지원 언어 fallback
    return isSupportedLanguage(savedLanguage) ? savedLanguage : 'ko'
  })

  // 전역 설정 저장 흐름
  // REMOTE 공통 설정 복원
  useEffect(() => {
    let isMounted = true

    if (readProfileSettingsStorageMode() !== 'remote') {
      return () => {
        isMounted = false
      }
    }

    loadRemoteAppSettings()
      .then((remoteSettings) => {
        if (!isMounted) {
          return
        }

        if (remoteSettings.language) setLanguage(remoteSettings.language)
        if (remoteSettings.startModule) setStartModule(remoteSettings.startModule)
        if (remoteSettings.theme) setTheme(remoteSettings.theme)
        if (remoteSettings.hudEffect) {
          localStorage.setItem(STORAGE_KEYS.hudEffect, remoteSettings.hudEffect)
        }
      })
      .catch(() => {
        // REMOTE 서버가 없으면 기존 LOCAL 설정으로 기동
      })
      .finally(() => { if (isMounted) setSettingsReady(true) })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.language, language)
  }, [language])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.startModule, startModule)
  }, [startModule])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.theme, theme)
  }, [theme])

  const t = translations[language]
  const appContext = useMemo(
    () => ({
      language,
      setLanguage,
      setStartModule,
      setTheme,
      startModule,
      t,
      theme,
    }),
    [language, startModule, t, theme],
  )

  if (!settingsReady) {
    return <main className={`tenvi-dashboard theme-${theme}`}><p role="status">{t.common.loadingSettings}</p></main>
  }
  return <AppRouter appContext={appContext} />
}

export default App
