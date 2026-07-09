import Board from '../modules/Board.jsx'
import useAppViewContext from './useAppViewContext.js'

function BoardListView() {
  const { t } = useAppViewContext()

  return <Board routeView="list" t={t} />
}

export default BoardListView
