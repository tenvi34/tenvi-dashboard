import { useNavigate } from 'react-router-dom'
import Settings from '../modules/Settings.jsx'
import useAppViewContext from './useAppViewContext.js'

function SettingsView() {
  const navigate = useNavigate()
  const { language, setLanguage, setStartModule, setTheme, startModule, t, theme } =
    useAppViewContext()

  return (
    <Settings
      activeTab="general"
      language={language}
      onLanguageChange={setLanguage}
      onSettingsTabChange={(tabId) => {
        if (tabId === 'server') navigate('/settings/storage')
      }}
      onStartModuleChange={setStartModule}
      onThemeChange={setTheme}
      startModule={startModule}
      t={t}
      theme={theme}
    />
  )
}

export default SettingsView
