import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import TravelGoogleMapsLink from './TravelGoogleMapsLink.jsx'
import { filterTravelPlaces, getTravelDayCount, hasPlaceLocation, PLACE_CATEGORIES } from './travelLogic.js'

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function MapViewport({ points, request }) {
  const map = useMap()
  // MapContainer props는 최초 생성에만 적용되므로 필터 변경은 지도 인스턴스에 반영
  useEffect(() => {
    if (points.length) map.fitBounds(points.map((place) => [place.latitude, place.longitude]), { padding: [32, 32], maxZoom: 15 })
  }, [map, points, request])
  return null
}

function LocationClick({ onPick }) {
  useMapEvents({ click: (event) => onPick({ latitude: event.latlng.lat, longitude: event.latlng.wrap().lng, provider: 'manual', providerPlaceId: '' }) })
  return null
}

export function TravelLocationPicker({ location, onPick, t }) {
  const [tileError, setTileError] = useState(false)
  const located = hasPlaceLocation(location)
  return <div className="travel-location-picker">
    <p>{t.pickHint}</p>
    {tileError && <p role="status">{t.mapError}</p>}
    <MapContainer center={located ? [location.latitude, location.longitude] : [20, 0]} zoom={located ? 14 : 2} className="travel-map-canvas" scrollWheelZoom>
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} eventHandlers={{ tileerror: () => setTileError(true) }} />
      <LocationClick onPick={onPick} />
      {located && <CircleMarker center={[location.latitude, location.longitude]} radius={9} />}
    </MapContainer>
  </div>
}

export default function TravelMap({ data, t }) {
  const [filter, setFilter] = useState('all')
  const [day, setDay] = useState('')
  const [request, setRequest] = useState(0)
  const [tileError, setTileError] = useState(false)
  const filtered = filterTravelPlaces(data, filter, day ? Number(day) : null)
  const located = filtered.filter(hasPlaceLocation)
  return <section className="travel-section">
    <p className="travel-map-hint">{t.mapUsageHint}</p>
    <div className="travel-toolbar">
      <label>{t.filter}<select value={filter} onChange={(event) => setFilter(event.target.value)}>
        {['all', 'scheduled', 'unscheduled', 'onHold', ...PLACE_CATEGORIES].map((key) => <option key={key} value={key}>{t.categories[key] || t[key]}</option>)}
      </select></label>
      <label>{t.day}<select value={day} onChange={(event) => setDay(event.target.value)}>
        <option value="">{t.all}</option>
        {Array.from({ length: getTravelDayCount(data) }, (_, index) => <option key={index} value={index + 1}>DAY {index + 1}</option>)}
      </select></label>
      <button type="button" onClick={() => setRequest((current) => current + 1)} disabled={!located.length}>{t.fitMap}</button>
    </div>
    {filtered.length > located.length && <p>{t.missingLocations(filtered.length - located.length)}</p>}
    {!located.length && <p>{t.mapEmpty}</p>}
    {tileError && <p role="status">{t.mapError}</p>}
    <MapContainer center={[20, 0]} zoom={2} className="travel-map-canvas" scrollWheelZoom>
      <TileLayer url={TILE_URL} attribution={ATTRIBUTION} eventHandlers={{ tileerror: () => setTileError(true) }} />
      <MapViewport points={located} request={request} />
      {located.map((place) => <CircleMarker key={place.id} center={[place.latitude, place.longitude]} radius={9}
        pathOptions={{ color: place.id === data.settings.lodgingPlaceId ? '#f59e0b' : place.onHold ? '#64748b' : '#0891b2', fillOpacity: 0.85 }}>
        <Popup><strong>{place.name}</strong><p>{t.categories[place.category]} · {t.priorities[place.priority]}</p><p>{place.address}</p>{place.onHold && <p>{t.onHold}</p>}
          <TravelGoogleMapsLink place={place} region={data.trip.region} t={t} />
        </Popup>
      </CircleMarker>)}
    </MapContainer>
    <ul className="travel-map-list">{located.map((place) => <li key={place.id}>{place.name} · {t.categories[place.category]}</li>)}</ul>
  </section>
}
