import Tasks from '../modules/Tasks.jsx'
import useAppViewContext from './useAppViewContext.js'

function TasksView() {
  const { t } = useAppViewContext()

  return <Tasks t={t} />
}

export default TasksView
