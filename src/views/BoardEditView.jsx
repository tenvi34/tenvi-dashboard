import Board from '../modules/Board.jsx'
import useAppViewContext from './useAppViewContext.js'

function BoardEditView() {
  const { t } = useAppViewContext()

  return <Board routeView="edit" t={t} />
}

export default BoardEditView
