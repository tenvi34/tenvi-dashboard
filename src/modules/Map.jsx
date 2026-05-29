import { useEffect, useMemo, useState } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createManualLocation, readPhotoLocation } from './mapLogic.js'

const DEFAULT_CENTER = [37.5665, 126.978]
const DEFAULT_ZOOM = 2
const MARKER_ZOOM = 15
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function MapFocus({ location }) {
  const map = useMap()

  useEffect(() => {
    if (location?.status === 'located') {
      map.setView([location.latitude, location.longitude], MARKER_ZOOM)
    }
  }, [location, map])

  return null
}

function ManualLocationPicker({ disabled, onPickLocation }) {
  useMapEvents({
    click(event) {
      if (!disabled) {
        onPickLocation(event.latlng)
      }
    },
  })

  return null
}

function Map({ t }) {
  const [location, setLocation] = useState(null)
  const [isReading, setIsReading] = useState(false)
  const [error, setError] = useState('')
  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: 'map-marker-icon',
        html: '<span></span>',
        iconAnchor: [12, 12],
        iconSize: [24, 24],
        popupAnchor: [0, -14],
      }),
    [],
  )
  const markerPosition =
    location?.status === 'located'
      ? [location.latitude, location.longitude]
      : null
  const canPickLocation = Boolean(location?.fileName)
  const sourceLabel =
    location?.source === 'manual' ? t.map.sourceManual : t.map.sourceExif

  const handlePickLocation = ({ lat, lng }) => {
    setLocation((currentLocation) => createManualLocation(currentLocation, lat, lng))
  }

  const handlePhotoChange = async (event) => {
    const [file] = event.target.files

    setError('')

    if (!file) {
      setLocation(null)
      return
    }

    setIsReading(true)

    try {
      // 선택 파일은 저장하지 않고 EXIF GPS 결과만 현재 화면 상태로 유지합니다.
      setLocation(await readPhotoLocation(file))
    } catch {
      setLocation(null)
      setError(t.map.readError)
    } finally {
      setIsReading(false)
    }
  }

  return (
    <section className="module-panel map-module" aria-labelledby="map-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.map.label}</p>
          <h2 id="map-title">{t.map.title}</h2>
        </div>
        <p className="module-meta">{t.map.pocBadge}</p>
      </div>

      <div className="map-layout">
        <section className="map-control-panel" aria-label={t.map.uploadLabel}>
          <label className="map-upload-box" htmlFor="map-photo-input">
            <span>{t.map.uploadTitle}</span>
            <strong>{t.map.uploadAction}</strong>
            <input
              id="map-photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </label>

          {isReading ? (
            <div className="map-status" role="status">
              {t.map.reading}
            </div>
          ) : null}

          {error ? (
            <div className="map-status is-error" role="alert">
              {error}
            </div>
          ) : null}

          {location?.status === 'missing-location' ? (
            <div className="empty-state compact-empty" role="status">
              <span>{t.common.systemMessage}</span>
              <p>{t.map.noLocation}</p>
              <p>{t.map.manualPrompt}</p>
            </div>
          ) : null}

          {location?.status === 'located' ? (
            <dl className="map-coordinate-panel">
              <div>
                <dt>{t.map.locationSource}</dt>
                <dd>{sourceLabel}</dd>
              </div>
              <div>
                <dt>{t.map.fileName}</dt>
                <dd>{location.fileName}</dd>
              </div>
              <div>
                <dt>{t.map.latitude}</dt>
                <dd>{location.latitude.toFixed(6)}</dd>
              </div>
              <div>
                <dt>{t.map.longitude}</dt>
                <dd>{location.longitude.toFixed(6)}</dd>
              </div>
              {location.takenAt ? (
                <div>
                  <dt>{t.map.takenAt}</dt>
                  <dd>{location.takenAt}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {canPickLocation ? (
            <div className="map-status" role="status">
              {t.map.clickToSetLocation}
            </div>
          ) : null}
        </section>

        <section className="map-view-panel" aria-label={t.map.mapLabel}>
          <MapContainer
            center={DEFAULT_CENTER}
            className="photo-map"
            scrollWheelZoom
            zoom={DEFAULT_ZOOM}
          >
            <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
            <MapFocus location={location} />
            <ManualLocationPicker
              disabled={!canPickLocation}
              onPickLocation={handlePickLocation}
            />
            {markerPosition ? (
              <Marker icon={markerIcon} position={markerPosition}>
                <Popup>
                  <div className="map-popup">
                    <strong>{location.fileName}</strong>
                    <span>
                      {t.map.locationSource}: {sourceLabel}
                    </span>
                    <span>
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </span>
                    {location.takenAt ? <span>{location.takenAt}</span> : null}
                  </div>
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>
        </section>
      </div>
    </section>
  )
}

export default Map
