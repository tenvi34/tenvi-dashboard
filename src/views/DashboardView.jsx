import Dashboard from '../modules/Dashboard.jsx'
import useAppViewContext from './useAppViewContext.js'

function DashboardView() {
  const { language, startModule, t, theme } = useAppViewContext()

  return (
    <Dashboard
      language={language}
      startModule={startModule}
      t={t}
      theme={theme}
    />
  )
}

export default DashboardView
