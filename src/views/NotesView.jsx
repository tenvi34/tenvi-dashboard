import Notes from '../modules/Notes.jsx'
import useAppViewContext from './useAppViewContext.js'

function NotesView() {
  const { t } = useAppViewContext()

  return <Notes t={t} />
}

export default NotesView
