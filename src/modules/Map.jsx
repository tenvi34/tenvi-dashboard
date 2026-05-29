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
import {
  applyManualLocationToDraft,
  createPhotoDraft,
  createPhotoRecordInput,
  isPhotoDraftReadyToSave,
  readPhotoLocation,
} from './mapLogic.js'
import {
  createPhotoRecord,
  deletePhotoRecord,
  getPhotoRecords,
} from '../services/photoArchiveRepository.js'
import { createPreviewImageBlob } from '../utils/imageUtils.js'

const DEFAULT_CENTER = [37.5665, 126.978]
const DEFAULT_ZOOM = 2
const MARKER_ZOOM = 15
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const getLocationSourceLabel = (source, t) =>
  source === 'manual' ? t.map.sourceManual : t.map.sourceExif

// 선택 기록이나 draft 위치로 지도 중심을 이동시키는 보조 컴포넌트
function MapFocus({ target }) {
  const map = useMap()

  useEffect(() => {
    if (target?.status === 'located') {
      // 목록/마커 선택과 수동 위치 지정 결과를 지도 중심에 즉시 반영
      map.setView([target.latitude, target.longitude], MARKER_ZOOM)
    }
  }, [target, map])

  return null
}

// 사진 등록 중 지도 클릭 좌표를 draft 위치로 전달하는 컴포넌트
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

// IndexedDB Blob을 임시 object URL로 바꾸는 이미지 컴포넌트
function PhotoPreview({ alt, blob, className }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!blob) {
      setSrc('')
      return undefined
    }

    // 컴포넌트 해제 시 Blob URL 메모리 정리
    const objectUrl = URL.createObjectURL(blob)

    setSrc(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!src) {
    return null
  }

  return <img alt={alt} className={className} src={src} />
}

// 사진 기록 목록에서 선택 진입점을 제공하는 패널
function PhotoRecordList({ activeRecordId, onSelectRecord, records, t }) {
  return (
    <section className="map-list-panel" aria-label={t.map.recordListLabel}>
      <div className="map-section-header">
        <p className="module-label">{t.map.recordListLabel}</p>
        <strong>{records.length}</strong>
      </div>

      {records.length > 0 ? (
        <ul className="map-record-list">
          {records.map((record) => (
            <li key={record.id}>
              <button
                className={`map-record-button ${
                  activeRecordId === record.id ? 'is-active' : ''
                }`}
                type="button"
                onClick={() => onSelectRecord(record.id)}
              >
                <PhotoPreview
                  alt={record.title}
                  blob={record.previewImageBlob}
                  className="map-record-thumb"
                />
                <span>
                  <strong>{record.title}</strong>
                  <small>
                    {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state compact-empty" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{t.map.noRecords}</p>
        </div>
      )}
    </section>
  )
}

// 저장 전 사진 draft의 제목/메모와 좌표 상태 편집 패널
function PhotoDraftPanel({ draft, isSaving, onChangeDraft, onSaveDraft, t }) {
  if (!draft) {
    return (
      <div className="empty-state compact-empty" role="status">
        <span>{t.common.systemMessage}</span>
        <p>{t.map.selectPhotoPrompt}</p>
      </div>
    )
  }

  const isReadyToSave = isPhotoDraftReadyToSave(draft)

  return (
    <section className="map-draft-panel" aria-label={t.map.draftLabel}>
      <PhotoPreview
        alt={draft.title || draft.originalFileName}
        blob={draft.previewImageBlob}
        className="map-draft-preview"
      />

      {draft.status === 'missing-location' ? (
        <div className="empty-state compact-empty" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{t.map.noLocation}</p>
          <p>{t.map.manualPrompt}</p>
        </div>
      ) : null}

      <label className="map-field">
        <span>{t.map.titleField}</span>
        <input
          type="text"
          value={draft.title}
          onChange={(event) => onChangeDraft({ title: event.target.value })}
          placeholder={t.map.titlePlaceholder}
        />
      </label>

      <label className="map-field">
        <span>{t.map.memoField}</span>
        <textarea
          rows="4"
          value={draft.memo}
          onChange={(event) => onChangeDraft({ memo: event.target.value })}
          placeholder={t.map.memoPlaceholder}
        />
      </label>

      {draft.status === 'located' ? (
        <dl className="map-coordinate-panel">
          <div>
            <dt>{t.map.locationSource}</dt>
            <dd>{getLocationSourceLabel(draft.locationSource, t)}</dd>
          </div>
          <div>
            <dt>{t.map.latitude}</dt>
            <dd>{draft.latitude.toFixed(6)}</dd>
          </div>
          <div>
            <dt>{t.map.longitude}</dt>
            <dd>{draft.longitude.toFixed(6)}</dd>
          </div>
        </dl>
      ) : null}

      <button
        className="map-primary-button"
        type="button"
        disabled={!isReadyToSave || isSaving}
        onClick={onSaveDraft}
      >
        {isSaving ? t.map.saving : t.map.saveRecord}
      </button>
    </section>
  )
}

// 선택된 저장 기록의 미리보기, 메타데이터, 삭제 동작 상세 패널
function PhotoRecordDetail({ onDeleteRecord, record, t }) {
  if (!record) {
    return (
      <div className="empty-state compact-empty" role="status">
        <span>{t.common.systemMessage}</span>
        <p>{t.map.noSelectedRecord}</p>
      </div>
    )
  }

  return (
    <section className="map-detail-panel" aria-label={t.map.detailLabel}>
      <PhotoPreview
        alt={record.title}
        blob={record.previewImageBlob}
        className="map-detail-preview"
      />
      <div className="map-detail-copy">
        <h3>{record.title}</h3>
        {record.memo ? <p>{record.memo}</p> : null}
      </div>

      <dl className="map-coordinate-panel">
        <div>
          <dt>{t.map.fileName}</dt>
          <dd>{record.originalFileName}</dd>
        </div>
        <div>
          <dt>{t.map.locationSource}</dt>
          <dd>{getLocationSourceLabel(record.locationSource, t)}</dd>
        </div>
        <div>
          <dt>{t.map.latitude}</dt>
          <dd>{record.latitude.toFixed(6)}</dd>
        </div>
        <div>
          <dt>{t.map.longitude}</dt>
          <dd>{record.longitude.toFixed(6)}</dd>
        </div>
        {record.takenAt ? (
          <div>
            <dt>{t.map.takenAt}</dt>
            <dd>{record.takenAt}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t.map.createdAt}</dt>
          <dd>{new Date(record.createdAt).toLocaleString()}</dd>
        </div>
      </dl>

      <button
        className="delete-button map-delete-button"
        type="button"
        onClick={() => onDeleteRecord(record.id)}
      >
        {t.map.deleteRecord}
      </button>
    </section>
  )
}

// TENVI Map 모듈의 로컬 사진 지도 아카이브 화면
function Map({ t }) {
  const [records, setRecords] = useState([])
  const [draft, setDraft] = useState(null)
  const [activeRecordId, setActiveRecordId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const activeRecord = records.find((record) => record.id === activeRecordId)
  const focusTarget = activeRecord ?? (draft?.status === 'located' ? draft : null)
  const canPickLocation = Boolean(draft)
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
  const draftMarkerIcon = useMemo(
    () =>
      L.divIcon({
        className: 'map-marker-icon map-marker-icon-draft',
        html: '<span></span>',
        iconAnchor: [12, 12],
        iconSize: [24, 24],
        popupAnchor: [0, -14],
      }),
    [],
  )

  useEffect(() => {
    let isMounted = true

    // 새로고침 후 IndexedDB 사진 기록 복원용 초기 조회
    getPhotoRecords()
      .then((savedRecords) => {
        if (isMounted) {
          setRecords(savedRecords)
          setActiveRecordId(savedRecords[0]?.id ?? '')
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(t.map.loadError)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [t.map.loadError])

  const handlePhotoChange = async (event) => {
    const [file] = event.target.files

    setError('')
    setStatusMessage('')

    if (!file) {
      return
    }

    setIsReading(true)

    try {
      // 원본 저장 없이 EXIF 위치와 리사이즈 미리보기 Blob만 draft에 보관
      const [location, previewImage] = await Promise.all([
        readPhotoLocation(file),
        createPreviewImageBlob(file),
      ])

      setDraft(createPhotoDraft(file, location, previewImage))
      setActiveRecordId('')
    } catch {
      setDraft(null)
      setError(t.map.readError)
    } finally {
      setIsReading(false)
      event.target.value = ''
    }
  }

  const handlePickLocation = ({ lat, lng }) => {
    setDraft((currentDraft) => applyManualLocationToDraft(currentDraft, lat, lng))
    setActiveRecordId('')
  }

  const handleChangeDraft = (patch) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }))
  }

  const handleSaveDraft = async () => {
    const recordInput = createPhotoRecordInput(draft)

    if (!recordInput) {
      setError(t.map.saveNeedsLocation)
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const savedRecord = await createPhotoRecord(recordInput)

      setRecords((currentRecords) => [savedRecord, ...currentRecords])
      setDraft(null)
      setActiveRecordId(savedRecord.id)
      setStatusMessage(t.map.saveComplete)
    } catch {
      setError(t.map.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectRecord = (recordId) => {
    setDraft(null)
    setActiveRecordId(recordId)
  }

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm(t.map.deleteConfirm)) {
      return
    }

    setError('')

    try {
      // IndexedDB 기록과 화면 목록을 함께 갱신하는 삭제 처리
      await deletePhotoRecord(recordId)
      setRecords((currentRecords) =>
        currentRecords.filter((record) => record.id !== recordId),
      )
      setActiveRecordId((currentId) => (currentId === recordId ? '' : currentId))
      setStatusMessage(t.map.deleteComplete)
    } catch {
      setError(t.map.deleteError)
    }
  }

  return (
    <section className="module-panel map-module" aria-labelledby="map-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.map.label}</p>
          <h2 id="map-title">{t.map.title}</h2>
        </div>
        <p className="module-meta">{t.map.archiveBadge}</p>
      </div>

      <div className="map-archive-layout">
        <aside className="map-control-panel">
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

          {isLoading ? (
            <div className="map-status" role="status">
              {t.map.loadingRecords}
            </div>
          ) : null}

          {isReading ? (
            <div className="map-status" role="status">
              {t.map.reading}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="map-status" role="status">
              {statusMessage}
            </div>
          ) : null}

          {error ? (
            <div className="map-status is-error" role="alert">
              {error}
            </div>
          ) : null}

          {draft ? (
            <div className="map-status" role="status">
              {t.map.clickToSetLocation}
            </div>
          ) : null}

          <PhotoDraftPanel
            draft={draft}
            isSaving={isSaving}
            onChangeDraft={handleChangeDraft}
            onSaveDraft={handleSaveDraft}
            t={t}
          />

          <PhotoRecordList
            activeRecordId={activeRecordId}
            onSelectRecord={handleSelectRecord}
            records={records}
            t={t}
          />
        </aside>

        <section className="map-view-panel" aria-label={t.map.mapLabel}>
          <MapContainer
            center={DEFAULT_CENTER}
            className="photo-map"
            scrollWheelZoom
            zoom={DEFAULT_ZOOM}
          >
            <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />
            <MapFocus target={focusTarget} />
            <ManualLocationPicker
              disabled={!canPickLocation}
              onPickLocation={handlePickLocation}
            />

            {records.map((record) => (
              <Marker
                eventHandlers={{ click: () => setActiveRecordId(record.id) }}
                icon={markerIcon}
                key={record.id}
                position={[record.latitude, record.longitude]}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{record.title}</strong>
                    <span>
                      {t.map.locationSource}:{' '}
                      {getLocationSourceLabel(record.locationSource, t)}
                    </span>
                    <span>
                      {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {draft?.status === 'located' ? (
              <Marker
                icon={draftMarkerIcon}
                position={[draft.latitude, draft.longitude]}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{draft.title || draft.originalFileName}</strong>
                    <span>
                      {t.map.locationSource}:{' '}
                      {getLocationSourceLabel(draft.locationSource, t)}
                    </span>
                    <span>
                      {draft.latitude.toFixed(6)}, {draft.longitude.toFixed(6)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>
        </section>

        <aside className="map-detail-column">
          <PhotoRecordDetail
            onDeleteRecord={handleDeleteRecord}
            record={activeRecord}
            t={t}
          />
        </aside>
      </div>
    </section>
  )
}

export default Map
