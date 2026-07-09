import Board from '../modules/Board.jsx'
import useAppViewContext from './useAppViewContext.js'

function BoardWriteView() {
  const { t } = useAppViewContext()

  return <Board routeView="write" t={t} />
}

export default BoardWriteView
