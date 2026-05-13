import ModulePlaceholder from '../components/ModulePlaceholder.jsx'

function Settings({ t }) {
  return (
    <ModulePlaceholder
      label={t.settings.label}
      title={t.settings.title}
      message={t.settings.message}
      systemMessage={t.common.systemMessage}
    />
  )
}

export default Settings
