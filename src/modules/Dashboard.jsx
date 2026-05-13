import ModulePlaceholder from '../components/ModulePlaceholder.jsx'

function Dashboard({ t }) {
  return (
    <ModulePlaceholder
      label={t.dashboard.label}
      title={t.dashboard.title}
      message={t.dashboard.message}
      systemMessage={t.common.systemMessage}
    />
  )
}

export default Dashboard
