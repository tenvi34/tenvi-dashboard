import ModulePlaceholder from '../components/ModulePlaceholder.jsx'

function Timer({ t }) {
  return (
    <ModulePlaceholder
      label={t.timer.label}
      title={t.timer.title}
      message={t.timer.message}
      systemMessage={t.common.systemMessage}
    />
  )
}

export default Timer
