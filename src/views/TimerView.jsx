import Timer from '../modules/Timer.jsx'
import useAppViewContext from './useAppViewContext.js'

function TimerView() {
  const { t } = useAppViewContext()

  return <Timer t={t} />
}

export default TimerView
