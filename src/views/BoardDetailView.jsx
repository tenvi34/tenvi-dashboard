import Board from '../modules/Board.jsx'
import useAppViewContext from './useAppViewContext.js'

function BoardDetailView() {
  const { t } = useAppViewContext()

  return <Board routeView="detail" t={t} />
}

export default BoardDetailView
