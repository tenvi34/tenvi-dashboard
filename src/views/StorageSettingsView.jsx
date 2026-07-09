import { useNavigate } from 'react-router-dom'
import Settings from '../modules/Settings.jsx'
import useAppViewContext from './useAppViewContext.js'

function StorageSettingsView() {
  const navigate = useNavigate()
  const { language, setLanguage, setStartModule, setTheme, startModule, t, theme } =
    useAppViewContext()

  return (
    <Settings
      activeTab="server"
      language={language}
      onLanguageChange={setLanguage}
      onSettingsTabChange={(tabId) => {
        if (tabId === 'general') navigate('/settings')
      }}
      onStartModuleChange={setStartModule}
      onThemeChange={setTheme}
      startModule={startModule}
      t={t}
      theme={theme}
    />
  )
}

export default StorageSettingsView
