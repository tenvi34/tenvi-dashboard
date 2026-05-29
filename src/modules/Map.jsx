import { useEffect, useMemo, useRef, useState } from 'react'
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
  applySearchLocationToDraft,
  COLLECTION_FILTER_ALL,
  COLLECTION_FILTER_UNASSIGNED,
  createEditDraft,
  createPhotoDraft,
  createPhotoRecordInput,
  createPhotoRecordUpdatePatch,
  filterPhotoRecordsByCollection,
  isPhotoCollectionInputValid,
  isEditDraftReadyToSave,
  isPhotoDraftReadyToSave,
  normalizePhotoCollectionInput,
  normalizePhotoRecordCollectionId,
  normalizeLocationSource,
  readPhotoLocation,
} from './mapLogic.js'
import {
  createPhotoRecord,
  deletePhotoRecord,
  getPhotoRecords,
  updatePhotoRecord,
} from '../services/photoArchiveRepository.js'
import {
  createPhotoCollection,
  deletePhotoCollection,
  getPhotoCollections,
  updatePhotoCollection,
} from '../services/photoCollectionRepository.js'
import { searchPlaces } from '../services/placeSearchService.js'
import { createPreviewImageBlob } from '../utils/imageUtils.js'

const DEFAULT_CENTER = [37.5665, 126.978]
const DEFAULT_ZOOM = 2
const FIT_BOUNDS_MAX_ZOOM = 15
const RECORD_FOCUS_ZOOM = 17
const MARKER_MIN_ZOOM = 17
const EXIF_FOCUS_ZOOM = 16
const SEARCH_FOCUS_ZOOM = 17
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const createViewportRequest = (type, target) => ({
  latitude: target?.latitude,
  longitude: target?.longitude,
  recordId: target?.id ?? '',
  requestId: `${Date.now()}-${Math.random()}`,
  type,
})

const getLocationSourceLabel = (source, t) => {
  const normalizedSource = normalizeLocationSource(source)

  if (normalizedSource === 'search') {
    return t.map.sourceSearch
  }

  return normalizedSource === 'manual' ? t.map.sourceManual : t.map.sourceExif
}

const getCollectionName = (collectionId, collections, t) => {
  const collection = collections.find((item) => item.id === collectionId)

  return collection?.name ?? t.map.unassignedCollection
}

// 선택 기록, draft, 전체 기록 상태와 이동 요청을 기준으로 지도 화면 제어
function MapViewportController({
  records,
  request,
  shouldFitBounds,
  target,
}) {
  const map = useMap()

  useEffect(() => {
    const requestLatitude = Number(request?.latitude)
    const requestLongitude = Number(request?.longitude)
    const targetLatitude = Number(target?.latitude)
    const targetLongitude = Number(target?.longitude)
    const hasRequestLocation =
      Number.isFinite(requestLatitude) && Number.isFinite(requestLongitude)
    const hasTargetLocation =
      Number.isFinite(targetLatitude) && Number.isFinite(targetLongitude)

    if (hasRequestLocation || hasTargetLocation) {
      // 저장 record에는 status가 없으므로 이동 요청 좌표를 우선 사용
      const nextCenter = hasRequestLocation
        ? [requestLatitude, requestLongitude]
        : [targetLatitude, targetLongitude]
      const requestType = request?.type

      // intent별 zoom 정책: 선택/검색/EXIF는 확대, 수동 클릭은 현재 zoom 유지
      if (requestType === 'manual-click') {
        map.setView(nextCenter, map.getZoom())
        return
      }

      if (requestType === 'marker-select') {
        map.flyTo(nextCenter, Math.max(map.getZoom(), MARKER_MIN_ZOOM), {
          duration: 0.65,
        })
        return
      }

      const focusZoom =
        requestType === 'search-select'
          ? SEARCH_FOCUS_ZOOM
          : requestType === 'exif-detect'
            ? EXIF_FOCUS_ZOOM
            : RECORD_FOCUS_ZOOM

      map.flyTo(nextCenter, focusZoom, { duration: 0.65 })
      return
    }

    if (request?.type === 'fit-all' && shouldFitBounds && records.length > 1) {
      // 선택/등록/편집 중이 아닐 때만 전체 저장 마커 범위 표시
      const bounds = L.latLngBounds(
        records.map((record) => [record.latitude, record.longitude]),
      )

      map.fitBounds(bounds, { maxZoom: FIT_BOUNDS_MAX_ZOOM, padding: [36, 36] })
    } else if (
      request?.type === 'fit-all' &&
      shouldFitBounds &&
      records.length === 1
    ) {
      map.setView([records[0].latitude, records[0].longitude], RECORD_FOCUS_ZOOM)
    }
  }, [map, records, request, shouldFitBounds, target])

  return null
}

// 사진 등록 또는 편집 중 지도 클릭 좌표 전달
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

// 저장 기록 마커와 선택 시 팝업 열기 제어
function PhotoRecordMarker({ icon, isActive, onSelectRecord, record, t }) {
  const markerRef = useRef(null)

  useEffect(() => {
    if (isActive) {
      // 목록 선택과 마커 선택 상태를 같은 팝업 표시로 연결
      markerRef.current?.openPopup()
    }
  }, [isActive])

  return (
    <Marker
      eventHandlers={{ click: () => onSelectRecord(record.id) }}
      icon={icon}
      position={[record.latitude, record.longitude]}
      ref={markerRef}
    >
      <Popup>
        <div className="map-popup">
          <strong>{record.title}</strong>
          <span>
            {t.map.locationSource}: {getLocationSourceLabel(record.locationSource, t)}
          </span>
          <span>
            {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
          </span>
        </div>
      </Popup>
    </Marker>
  )
}

// 명시적 버튼/Enter 검색만 수행하는 장소 검색 패널
function PlaceSearchPanel({ disabled, language, onSelectPlace, t }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [scope, setScope] = useState('all')
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  const handleSearch = async () => {
    const trimmedQuery = query.trim()

    if (!trimmedQuery || disabled) {
      return
    }

    setIsSearching(true)
    setSearchError('')
    setHasSearched(true)

    try {
      // 사용자가 입력한 장소명만 전송하는 명시적 검색 요청
      setResults(await searchPlaces(trimmedQuery, { language, scope }))
    } catch {
      setResults([])
      setSearchError(t.map.searchError)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    handleSearch()
  }

  return (
    <section className="map-search-panel" aria-label={t.map.placeSearchLabel}>
      <form className="map-search-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="map-place-search">
          {t.map.placeSearchLabel}
        </label>
        <input
          id="map-place-search"
          type="search"
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.map.placeSearchPlaceholder}
        />
        <select
          aria-label={t.map.searchScopeLabel}
          value={scope}
          disabled={disabled}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="all">{t.map.searchScopeAll}</option>
          <option value="japan">{t.map.searchScopeJapan}</option>
          <option value="korea">{t.map.searchScopeKorea}</option>
        </select>
        <button type="submit" disabled={disabled || isSearching}>
          {isSearching ? t.map.searching : t.map.searchPlace}
        </button>
      </form>

      <p className="map-search-attribution">{t.map.searchAttribution}</p>

      {searchError ? (
        <div className="map-status is-error" role="alert">
          {searchError}
        </div>
      ) : null}

      {results.length > 0 ? (
        <ul className="map-search-results">
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => onSelectPlace(result)}>
                <strong>{result.name}</strong>
                {result.category || result.type ? (
                  <small>
                    {[result.category, result.type].filter(Boolean).join(' / ')}
                  </small>
                ) : null}
                {result.addressSummary ? <em>{result.addressSummary}</em> : null}
                <span>{result.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {hasSearched && !isSearching && !searchError && results.length === 0 ? (
        <div className="empty-state compact-empty" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{t.map.searchNoResults}</p>
          <p>{t.map.searchRetryHint}</p>
        </div>
      ) : null}
    </section>
  )
}

// 사진 기록 목록에서 선택 진입점을 제공하는 패널
function PhotoRecordList({ activeRecordId, emptyMessage, onSelectRecord, records, t }) {
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
          <p>{emptyMessage}</p>
        </div>
      )}
    </section>
  )
}

// 컬렉션 필터와 생성/수정/삭제 흐름 관리 패널
function PhotoCollectionPanel({
  collectionDraft,
  collections,
  editingCollectionId,
  filterValue,
  getCollectionRecordCount,
  onCancelCollectionEdit,
  onChangeCollectionDraft,
  onDeleteCollection,
  onSaveCollection,
  onSelectFilter,
  onStartCollectionEdit,
  t,
}) {
  const isEditing = Boolean(editingCollectionId)

  return (
    <section className="map-collection-panel" aria-label={t.map.collectionsLabel}>
      <div className="map-section-header">
        <p className="module-label">{t.map.collectionsLabel}</p>
        <strong>{collections.length}</strong>
      </div>

      <div className="map-filter-options" aria-label={t.map.collectionFilter}>
        <button
          className={`map-filter-button ${
            filterValue === COLLECTION_FILTER_ALL ? 'is-active' : ''
          }`}
          type="button"
          onClick={() => onSelectFilter(COLLECTION_FILTER_ALL)}
        >
          {t.map.allCollections}
        </button>
        <button
          className={`map-filter-button ${
            filterValue === COLLECTION_FILTER_UNASSIGNED ? 'is-active' : ''
          }`}
          type="button"
          onClick={() => onSelectFilter(COLLECTION_FILTER_UNASSIGNED)}
        >
          {t.map.unassignedCollection}
        </button>
        {collections.map((collection) => (
          <button
            className={`map-filter-button ${
              filterValue === collection.id ? 'is-active' : ''
            }`}
            key={collection.id}
            type="button"
            onClick={() => onSelectFilter(collection.id)}
          >
            {collection.name}
          </button>
        ))}
      </div>

      <div className="map-collection-form">
        <label className="map-field">
          <span>{t.map.collectionName}</span>
          <input
            type="text"
            value={collectionDraft.name}
            onChange={(event) =>
              onChangeCollectionDraft({ name: event.target.value })
            }
            placeholder={t.map.collectionNamePlaceholder}
          />
        </label>
        <label className="map-field">
          <span>{t.map.collectionDescription}</span>
          <textarea
            rows="3"
            value={collectionDraft.description}
            onChange={(event) =>
              onChangeCollectionDraft({ description: event.target.value })
            }
            placeholder={t.map.collectionDescriptionPlaceholder}
          />
        </label>
        <div className="map-date-row">
          <label className="map-field">
            <span>{t.map.collectionStartDate}</span>
            <input
              type="date"
              value={collectionDraft.startDate}
              onChange={(event) =>
                onChangeCollectionDraft({ startDate: event.target.value })
              }
            />
          </label>
          <label className="map-field">
            <span>{t.map.collectionEndDate}</span>
            <input
              type="date"
              value={collectionDraft.endDate}
              onChange={(event) =>
                onChangeCollectionDraft({ endDate: event.target.value })
              }
            />
          </label>
        </div>
        <div className="map-edit-actions">
          <button
            className="map-primary-button"
            type="button"
            onClick={onSaveCollection}
          >
            {isEditing ? t.map.saveCollection : t.map.createCollection}
          </button>
          {isEditing ? (
            <button
              className="map-secondary-button"
              type="button"
              onClick={onCancelCollectionEdit}
            >
              {t.map.cancelEdit}
            </button>
          ) : null}
        </div>
      </div>

      {collections.length > 0 ? (
        <ul className="map-collection-list">
          {collections.map((collection) => (
            <li key={collection.id}>
              <div className="map-collection-item">
                <strong>{collection.name}</strong>
                <span>
                  {getCollectionRecordCount(collection.id)}{' '}
                  {t.map.collectionRecordCount}
                </span>
                {collection.description ? <p>{collection.description}</p> : null}
                <div className="map-collection-actions">
                  <button
                    className="map-secondary-button"
                    type="button"
                    onClick={() => onStartCollectionEdit(collection)}
                  >
                    {t.map.editCollection}
                  </button>
                  <button
                    className="delete-button map-delete-button"
                    type="button"
                    onClick={() => onDeleteCollection(collection)}
                  >
                    {t.map.deleteCollection}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

// 사진 저장/편집 시 컬렉션 연결 선택
function PhotoCollectionSelect({ collections, onChange, t, value }) {
  return (
    <label className="map-field">
      <span>{t.map.collectionField}</span>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">{t.map.unassignedCollection}</option>
        {collections.map((collection) => (
          <option key={collection.id} value={collection.id}>
            {collection.name}
          </option>
        ))}
      </select>
    </label>
  )
}

// 저장 전 사진 draft의 제목/메모와 좌표 상태 편집 패널
function PhotoDraftPanel({
  collections,
  draft,
  isSaving,
  language,
  onChangeDraft,
  onSaveDraft,
  onSelectPlace,
  t,
}) {
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

      <PhotoCollectionSelect
        collections={collections}
        onChange={(collectionId) => onChangeDraft({ collectionId })}
        t={t}
        value={draft.collectionId}
      />

      <PlaceSearchPanel
        disabled={false}
        language={language}
        onSelectPlace={onSelectPlace}
        t={t}
      />

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

// 저장 기록 편집용 제목/메모/위치 draft 패널
function PhotoEditPanel({
  collections,
  editDraft,
  isUpdating,
  language,
  onCancelEdit,
  onChangeEditDraft,
  onSaveEdit,
  onSelectPlace,
  record,
  t,
}) {
  const isReadyToSave = isEditDraftReadyToSave(editDraft)

  return (
    <section className="map-detail-panel" aria-label={t.map.editLabel}>
      <PhotoPreview
        alt={record.title}
        blob={record.previewImageBlob}
        className="map-detail-preview"
      />

      <label className="map-field">
        <span>{t.map.titleField}</span>
        <input
          type="text"
          value={editDraft.title}
          onChange={(event) => onChangeEditDraft({ title: event.target.value })}
          placeholder={t.map.titlePlaceholder}
        />
      </label>

      <label className="map-field">
        <span>{t.map.memoField}</span>
        <textarea
          rows="5"
          value={editDraft.memo}
          onChange={(event) => onChangeEditDraft({ memo: event.target.value })}
          placeholder={t.map.memoPlaceholder}
        />
      </label>

      <PhotoCollectionSelect
        collections={collections}
        onChange={(collectionId) => onChangeEditDraft({ collectionId })}
        t={t}
        value={editDraft.collectionId}
      />

      <PlaceSearchPanel
        disabled={false}
        language={language}
        onSelectPlace={onSelectPlace}
        t={t}
      />

      <dl className="map-coordinate-panel">
        <div>
          <dt>{t.map.locationSource}</dt>
          <dd>{getLocationSourceLabel(editDraft.locationSource, t)}</dd>
        </div>
        <div>
          <dt>{t.map.latitude}</dt>
          <dd>{editDraft.latitude.toFixed(6)}</dd>
        </div>
        <div>
          <dt>{t.map.longitude}</dt>
          <dd>{editDraft.longitude.toFixed(6)}</dd>
        </div>
      </dl>

      <div className="map-edit-actions">
        <button
          className="map-primary-button"
          type="button"
          disabled={!isReadyToSave || isUpdating}
          onClick={onSaveEdit}
        >
          {isUpdating ? t.map.saving : t.map.saveChanges}
        </button>
        <button
          className="map-secondary-button"
          type="button"
          disabled={isUpdating}
          onClick={onCancelEdit}
        >
          {t.map.cancelEdit}
        </button>
      </div>
    </section>
  )
}

// 선택된 저장 기록의 미리보기, 메타데이터, 삭제 동작 상세 패널
function PhotoRecordDetail({
  collections,
  onDeleteRecord,
  onStartEdit,
  record,
  t,
}) {
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
          <dt>{t.map.collectionField}</dt>
          <dd>{getCollectionName(record.collectionId, collections, t)}</dd>
        </div>
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

      <div className="map-edit-actions">
        <button className="map-primary-button" type="button" onClick={onStartEdit}>
          {t.map.editRecord}
        </button>
        <button
          className="delete-button map-delete-button"
          type="button"
          onClick={() => onDeleteRecord(record.id)}
        >
          {t.map.deleteRecord}
        </button>
      </div>
    </section>
  )
}

// TENVI Map 모듈의 로컬 사진 지도 아카이브 화면
function Map({ t }) {
  const [records, setRecords] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState(
    COLLECTION_FILTER_ALL,
  )
  const [collectionDraft, setCollectionDraft] = useState(() =>
    normalizePhotoCollectionInput(),
  )
  const [editingCollectionId, setEditingCollectionId] = useState('')
  const [draft, setDraft] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [activeRecordId, setActiveRecordId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [viewportRequest, setViewportRequest] = useState(() =>
    createViewportRequest('fit-all'),
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const normalizedRecords = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        collectionId: normalizePhotoRecordCollectionId(record, collections),
      })),
    [collections, records],
  )
  const filteredRecords = useMemo(
    () =>
      filterPhotoRecordsByCollection(
        normalizedRecords,
        collections,
        selectedCollectionFilter,
      ),
    [collections, normalizedRecords, selectedCollectionFilter],
  )
  const activeRecord = normalizedRecords.find((record) => record.id === activeRecordId)
  const focusTarget =
    editDraft?.status === 'located'
      ? editDraft
      : activeRecord ?? (draft?.status === 'located' ? draft : null)
  const canPickLocation = Boolean(draft || editDraft)
  const shouldFitBounds = !activeRecordId && !draft && !editDraft && !isLoading
  const getCollectionRecordCount = (collectionId) =>
    normalizedRecords.filter((record) => record.collectionId === collectionId).length
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
  const filteredEmptyMessage =
    selectedCollectionFilter === COLLECTION_FILTER_ALL
      ? t.map.noRecords
      : t.map.noFilteredRecords
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

    // 새로고침 후 IndexedDB 사진 기록과 컬렉션 복원용 초기 조회
    Promise.all([getPhotoRecords(), getPhotoCollections()])
      .then(([savedRecords, savedCollections]) => {
        if (isMounted) {
          setRecords(savedRecords)
          setCollections(savedCollections)
          setViewportRequest(createViewportRequest('fit-all'))
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

  useEffect(() => {
    if (
      activeRecordId &&
      !filteredRecords.some((record) => record.id === activeRecordId)
    ) {
      // 필터 변경으로 선택 record가 화면 밖으로 나가면 상세/팝업 선택 해제
      setActiveRecordId('')
    }
  }, [activeRecordId, filteredRecords])

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
      setEditDraft(null)
      setActiveRecordId('')
      setViewportRequest(
        createViewportRequest(
          location.status === 'located' ? 'exif-detect' : 'fit-all',
          location,
        ),
      )
    } catch {
      setDraft(null)
      setError(t.map.readError)
    } finally {
      setIsReading(false)
      event.target.value = ''
    }
  }

  const handlePickLocation = ({ lat, lng }) => {
    if (editDraft) {
      setEditDraft((currentDraft) =>
        applyManualLocationToDraft(currentDraft, lat, lng),
      )
      setViewportRequest(
        createViewportRequest('manual-click', {
          latitude: lat,
          longitude: lng,
        }),
      )
      return
    }

    setDraft((currentDraft) => applyManualLocationToDraft(currentDraft, lat, lng))
    setActiveRecordId('')
    setViewportRequest(
      createViewportRequest('manual-click', {
        latitude: lat,
        longitude: lng,
      }),
    )
  }

  const handleSelectPlace = (place) => {
    if (editDraft) {
      setEditDraft((currentDraft) => applySearchLocationToDraft(currentDraft, place))
      setViewportRequest(createViewportRequest('search-select', place))
      return
    }

    setDraft((currentDraft) => applySearchLocationToDraft(currentDraft, place))
    setActiveRecordId('')
    setViewportRequest(createViewportRequest('search-select', place))
  }

  const handleChangeDraft = (patch) => {
    setDraft((currentDraft) => ({ ...currentDraft, ...patch }))
  }

  const handleChangeEditDraft = (patch) => {
    setEditDraft((currentDraft) => ({ ...currentDraft, ...patch }))
  }

  const handleChangeCollectionDraft = (patch) => {
    setCollectionDraft((currentDraft) => ({ ...currentDraft, ...patch }))
  }

  const resetCollectionDraft = () => {
    setCollectionDraft(normalizePhotoCollectionInput())
    setEditingCollectionId('')
  }

  const handleStartCollectionEdit = (collection) => {
    setCollectionDraft(normalizePhotoCollectionInput(collection))
    setEditingCollectionId(collection.id)
  }

  const handleSaveCollection = async () => {
    const normalizedInput = normalizePhotoCollectionInput(collectionDraft)

    if (!isPhotoCollectionInputValid(normalizedInput)) {
      setError(t.map.collectionNameRequired)
      return
    }

    setError('')

    try {
      if (editingCollectionId) {
        const updatedCollection = await updatePhotoCollection(
          editingCollectionId,
          normalizedInput,
        )

        if (!updatedCollection) {
          throw new Error('Missing collection.')
        }

        setCollections((currentCollections) =>
          currentCollections.map((collection) =>
            collection.id === updatedCollection.id ? updatedCollection : collection,
          ),
        )
        setStatusMessage(t.map.collectionUpdated)
      } else {
        const createdCollection = await createPhotoCollection(normalizedInput)

        setCollections((currentCollections) => [
          createdCollection,
          ...currentCollections,
        ])
        setStatusMessage(t.map.collectionCreated)
      }

      resetCollectionDraft()
    } catch {
      setError(t.map.collectionSaveError)
    }
  }

  const handleDeleteCollection = async (collection) => {
    const affectedRecordCount = getCollectionRecordCount(collection.id)
    const confirmed = window.confirm(
      t.map.deleteCollectionConfirm(collection.name, affectedRecordCount),
    )

    if (!confirmed) {
      return
    }

    setError('')

    try {
      // 컬렉션 삭제와 사진 연결 해제는 repository의 단일 transaction에서 처리
      await deletePhotoCollection(collection.id)
      setCollections((currentCollections) =>
        currentCollections.filter((item) => item.id !== collection.id),
      )
      setRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.collectionId === collection.id
            ? { ...record, collectionId: null }
            : record,
        ),
      )
      setSelectedCollectionFilter((currentFilter) =>
        currentFilter === collection.id ? COLLECTION_FILTER_UNASSIGNED : currentFilter,
      )
      if (editingCollectionId === collection.id) {
        resetCollectionDraft()
      }
      setStatusMessage(t.map.collectionDeleted)
    } catch {
      setError(t.map.collectionDeleteError)
    }
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
      setViewportRequest(createViewportRequest('record-select', savedRecord))
      setStatusMessage(t.map.saveComplete)
    } catch {
      setError(t.map.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = () => {
    setDraft(null)
    setEditDraft(createEditDraft(activeRecord))
    setViewportRequest(createViewportRequest('record-select', activeRecord))
    setStatusMessage('')
    setError('')
  }

  const handleCancelEdit = () => {
    setEditDraft(null)
    setStatusMessage(t.map.editCancelled)
  }

  const handleSaveEdit = async () => {
    const updatePatch = createPhotoRecordUpdatePatch(editDraft)

    if (!updatePatch) {
      setError(t.map.saveNeedsLocation)
      return
    }

    setIsUpdating(true)
    setError('')

    try {
      // 저장 버튼 이후에만 IndexedDB 기록 업데이트
      const updatedRecord = await updatePhotoRecord(editDraft.id, updatePatch)

      if (!updatedRecord) {
        throw new Error('Missing photo record.')
      }

      setRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.id === updatedRecord.id ? updatedRecord : record,
        ),
      )
      setEditDraft(null)
      setActiveRecordId(updatedRecord.id)
      setViewportRequest(createViewportRequest('record-select', updatedRecord))
      setStatusMessage(t.map.updateComplete)
    } catch {
      setError(t.map.updateError)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSelectRecord = (recordId, requestType = 'record-select') => {
    const selectedRecord = normalizedRecords.find((record) => record.id === recordId)

    setDraft(null)
    setEditDraft(null)
    setActiveRecordId(recordId)
    // 같은 기록 재클릭도 지도 이동을 다시 실행하기 위한 요청 객체
    setViewportRequest(createViewportRequest(requestType, selectedRecord))
  }

  const handleSelectMarker = (recordId) => {
    handleSelectRecord(recordId, 'marker-select')
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
      setEditDraft((currentDraft) =>
        currentDraft?.id === recordId ? null : currentDraft,
      )
      setViewportRequest(createViewportRequest('fit-all'))
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

          {draft || editDraft ? (
            <div className="map-status" role="status">
              {t.map.clickToSetLocation}
            </div>
          ) : null}

          <PhotoDraftPanel
            collections={collections}
            draft={draft}
            isSaving={isSaving}
            language={t.map.searchLanguage}
            onChangeDraft={handleChangeDraft}
            onSaveDraft={handleSaveDraft}
            onSelectPlace={handleSelectPlace}
            t={t}
          />

          <PhotoCollectionPanel
            collectionDraft={collectionDraft}
            collections={collections}
            editingCollectionId={editingCollectionId}
            filterValue={selectedCollectionFilter}
            getCollectionRecordCount={getCollectionRecordCount}
            onCancelCollectionEdit={resetCollectionDraft}
            onChangeCollectionDraft={handleChangeCollectionDraft}
            onDeleteCollection={handleDeleteCollection}
            onSaveCollection={handleSaveCollection}
            onSelectFilter={setSelectedCollectionFilter}
            onStartCollectionEdit={handleStartCollectionEdit}
            t={t}
          />

          <PhotoRecordList
            activeRecordId={activeRecordId}
            emptyMessage={filteredEmptyMessage}
            onSelectRecord={handleSelectRecord}
            records={filteredRecords}
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
            <MapViewportController
              request={viewportRequest}
              records={filteredRecords}
              shouldFitBounds={shouldFitBounds}
              target={focusTarget}
            />
            <ManualLocationPicker
              disabled={!canPickLocation}
              onPickLocation={handlePickLocation}
            />

            {filteredRecords.map((record) => (
              <PhotoRecordMarker
                icon={markerIcon}
                isActive={activeRecordId === record.id}
                key={record.id}
                onSelectRecord={handleSelectMarker}
                record={record}
                t={t}
              />
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

            {editDraft?.status === 'located' ? (
              <Marker
                icon={draftMarkerIcon}
                position={[editDraft.latitude, editDraft.longitude]}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{editDraft.title || editDraft.originalFileName}</strong>
                    <span>
                      {t.map.locationSource}:{' '}
                      {getLocationSourceLabel(editDraft.locationSource, t)}
                    </span>
                    <span>
                      {editDraft.latitude.toFixed(6)},{' '}
                      {editDraft.longitude.toFixed(6)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>
        </section>

        <aside className="map-detail-column">
          {editDraft && activeRecord ? (
            <PhotoEditPanel
              collections={collections}
              editDraft={editDraft}
              isUpdating={isUpdating}
              language={t.map.searchLanguage}
              onCancelEdit={handleCancelEdit}
              onChangeEditDraft={handleChangeEditDraft}
              onSaveEdit={handleSaveEdit}
              onSelectPlace={handleSelectPlace}
              record={activeRecord}
              t={t}
            />
          ) : (
            <PhotoRecordDetail
              collections={collections}
              onDeleteRecord={handleDeleteRecord}
              onStartEdit={handleStartEdit}
              record={activeRecord}
              t={t}
            />
          )}
        </aside>
      </div>
    </section>
  )
}

export default Map
