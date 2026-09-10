import Travel from '../modules/Travel.jsx'
import useAppViewContext from './useAppViewContext.js'

export default function TravelView() {
  const { t, language } = useAppViewContext()
  return <Travel t={t} language={language} />
}
