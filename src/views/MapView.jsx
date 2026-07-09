import Map from '../modules/Map.jsx'
import useAppViewContext from './useAppViewContext.js'

function MapView() {
  const { t } = useAppViewContext()

  return <Map t={t} />
}

export default MapView
