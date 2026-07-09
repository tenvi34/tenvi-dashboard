import Calendar from '../modules/Calendar.jsx'
import useAppViewContext from './useAppViewContext.js'

function CalendarView() {
  const { t } = useAppViewContext()

  return <Calendar t={t} />
}

export default CalendarView
