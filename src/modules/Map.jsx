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
  createBulkPhotoAnalysisItem,
  createBulkPhotoRecordInputs,
  createBulkPhotoSaveResult,
  createBulkUploadSummary,
  applyLocationToBulkItems,
  clearBulkMissingLocationSelection,
  getBulkPhotoSaveCandidates,
  getBulkMissingLocationItems,
  selectAllBulkMissingLocationItems,
  toggleBulkMissingLocationSelection,
} from './bulkPhotoUploadLogic.js'
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
  filterPhotoRecordsBySearchAndLocation,
  isPhotoCollectionInputValid,
  isEditDraftReadyToSave,
  isPhotoDraftReadyToSave,
  LOCATION_SOURCE_FILTER_ALL,
  LOCATION_SOURCE_FILTER_UNKNOWN,
  normalizePhotoCollectionInput,
  normalizePhotoRecordCollectionId,
  normalizeLocationSource,
  readPhotoLocation,
} from './mapLogic.js'
import {
  createPhotoRecord,
  createPhotoRecords,
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

const createBulkUploadId = (file, index) =>
  `${file.name}-${file.lastModified}-${file.size}-${index}`

const getBulkItemStatusLabel = (status, t) => {
  if (status === 'located') {
    return t.map.bulkLocated
  }

  if (status === 'missing-location') {
    return t.map.bulkMissingLocation
  }

  return t.map.bulkFailed
}

const getMapSummaryLocationSource = (source) =>
  ['exif', 'manual', 'search'].includes(source) ? source : 'unknown'

const LOCATION_SOURCE_FILTER_OPTIONS = [
  LOCATION_SOURCE_FILTER_ALL,
  'exif',
  'manual',
  'search',
  LOCATION_SOURCE_FILTER_UNKNOWN,
]

const createMapFilterSummary = (records, selectedFilter, collections, t) => {
  const collection = collections.find((item) => item.id === selectedFilter)
  const filterName =
    selectedFilter === COLLECTION_FILTER_ALL
      ? t.map.allCollections
      : selectedFilter === COLLECTION_FILTER_UNASSIGNED
        ? t.map.unassignedCollection
        : collection?.name ?? t.map.unassignedCollection
  const sourceCounts = records.reduce(
    (counts, record) => {
      const source = getMapSummaryLocationSource(record.locationSource)

      return {
        ...counts,
        [source]: counts[source] + 1,
      }
    },
    {
      exif: 0,
      manual: 0,
      search: 0,
      unknown: 0,
    },
  )

  return {
    filterName,
    photoCount: records.length,
    sourceCounts,
  }
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

    const isFitAllAuto = request?.type === 'fit-all' && shouldFitBounds
    // fit-all-forced: 선택·편집 상태에서도 강제로 전체 마커 범위 표시
    const isFitAllForced = request?.type === 'fit-all-forced'

    if (isFitAllAuto || isFitAllForced) {
      if (records.length > 1) {
        const bounds = L.latLngBounds(
          records.map((record) => [record.latitude, record.longitude]),
        )
        map.fitBounds(bounds, { maxZoom: FIT_BOUNDS_MAX_ZOOM, padding: [36, 36] })
      } else if (records.length === 1) {
        map.setView([records[0].latitude, records[0].longitude], RECORD_FOCUS_ZOOM)
      }
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

// 컬렉션 생성/수정 폼과 카드 목록 — 컬렉션 관리 패널이 열렸을 때만 렌더
function PhotoCollectionPanel({
  collectionDraft,
  collections,
  editingCollectionId,
  getCollectionRecordCount,
  onCancelCollectionEdit,
  onChangeCollectionDraft,
  onDeleteCollection,
  onSaveCollection,
  onStartCollectionEdit,
  t,
}) {
  const isEditing = Boolean(editingCollectionId)

  return (
    <section className="map-collection-panel" aria-label={t.map.collectionsLabel}>
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
function BulkUploadList({
  emptyMessage,
  items,
  onToggleItem,
  selectable = false,
  selectedIds = [],
  t,
  title,
}) {
  return (
    <div className="map-bulk-list-section">
      <p className="recent-notes-title">{title}</p>
      {items.length > 0 ? (
        <ul className="map-bulk-file-list">
          {items.slice(0, 20).map((item) => (
            <li
              className={selectedIds.includes(item.id) ? 'is-selected' : ''}
              key={item.id}
            >
              {selectable ? (
                <label className="map-bulk-check-row">
                  <input
                    checked={selectedIds.includes(item.id)}
                    type="checkbox"
                    onChange={() => onToggleItem(item.id)}
                  />
                  <span>
                    <strong>{item.fileName}</strong>
                    <small>{getBulkItemStatusLabel(item.status, t)}</small>
                  </span>
                </label>
              ) : (
                <>
                  <strong>{item.fileName}</strong>
                  <span>{getBulkItemStatusLabel(item.status, t)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state compact-empty" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{emptyMessage}</p>
        </div>
      )}
      {items.length > 20 ? (
        <p className="map-bulk-note">{t.map.bulkMoreItems(items.length - 20)}</p>
      ) : null}
    </div>
  )
}

function BulkUploadPanel({
  bulkAssignedLocation,
  bulkUpload,
  collections,
  onCancelAnalysis,
  onChangeCollection,
  onClearSelection,
  onSelectAllMissing,
  onSelectBulkPlace,
  onReset,
  onSave,
  onToggleMissingItem,
  selectedMissingLocationItemIds,
  t,
}) {
  const summary = createBulkUploadSummary(bulkUpload.items)
  const saveCandidates = getBulkPhotoSaveCandidates(bulkUpload.items)
  const locatedItems = bulkUpload.items.filter((item) => item.status === 'located')
  const missingItems = getBulkMissingLocationItems(bulkUpload.items)
  const failedItems = bulkUpload.items.filter((item) => item.status === 'failed')
  const progressValue =
    bulkUpload.total > 0
      ? Math.round((bulkUpload.processed / bulkUpload.total) * 100)
      : 0

  return (
    <section className="map-bulk-panel" aria-label={t.map.bulkUploadTitle}>
      <div className="map-section-header">
        <div>
          <p className="module-label">{t.map.bulkUploadLabel}</p>
          <strong>{t.map.bulkUploadTitle}</strong>
        </div>
        {bulkUpload.status === 'analyzing' ? (
          <button
            className="map-secondary-button"
            type="button"
            onClick={onCancelAnalysis}
          >
            {t.map.bulkCancelAnalysis}
          </button>
        ) : null}
      </div>

      {bulkUpload.status === 'analyzing' ? (
        <>
          <div className="map-status" role="status">
            {t.map.bulkAnalyzingProgress(bulkUpload.processed, bulkUpload.total)}
          </div>
          <div className="map-bulk-progress" aria-hidden="true">
            <span style={{ width: `${progressValue}%` }} />
          </div>
        </>
      ) : null}

      {bulkUpload.status === 'cancelled' ? (
        <div className="map-status" role="status">
          {t.map.bulkAnalysisCancelled}
        </div>
      ) : null}

      {['completed', 'cancelled', 'saving'].includes(bulkUpload.status) ? (
        <>
          <div className="map-bulk-summary-grid">
            <div className="summary-metric">
              <span>{t.map.bulkTotalFiles}</span>
              <strong>{summary.total}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.map.bulkLocated}</span>
              <strong>{summary.located}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.map.bulkMissingLocation}</span>
              <strong>{summary.missingLocation}</strong>
            </div>
            <div className="summary-metric">
              <span>{t.map.bulkFailed}</span>
              <strong>{summary.failed}</strong>
            </div>
          </div>

          <div className="map-status" role="status">
            {t.map.bulkMissingLocationPolicy}
          </div>

          {missingItems.length > 0 ? (
            <div className="map-bulk-assignment-panel">
              <div className="map-section-header">
                <div>
                  <p className="module-label">{t.map.bulkLocationAssignment}</p>
                  <strong>
                    {t.map.bulkSelectedCount(
                      selectedMissingLocationItemIds.length,
                    )}
                  </strong>
                </div>
              </div>
              <div className="map-bulk-actions">
                <button
                  className="map-secondary-button"
                  type="button"
                  onClick={onSelectAllMissing}
                >
                  {t.map.bulkSelectAllMissing}
                </button>
                <button
                  className="map-secondary-button"
                  type="button"
                  onClick={onClearSelection}
                >
                  {t.map.bulkClearSelection}
                </button>
              </div>
              <div className="map-status" role="status">
                {selectedMissingLocationItemIds.length > 0
                  ? t.map.bulkMapClickReady
                  : t.map.bulkSelectMissingFirst}
              </div>
              {bulkAssignedLocation ? (
                <div className="map-status" role="status">
                  {t.map.bulkLastAssignedLocation(
                    bulkAssignedLocation.locationSource,
                  )}
                </div>
              ) : null}
              <PlaceSearchPanel
                disabled={selectedMissingLocationItemIds.length === 0}
                language={t.map.searchLanguage}
                onSelectPlace={onSelectBulkPlace}
                t={t}
              />
            </div>
          ) : null}

          <PhotoCollectionSelect
            collections={collections}
            onChange={onChangeCollection}
            t={t}
            value={bulkUpload.collectionId}
          />

          <div className="map-bulk-actions">
            <button
              className="map-primary-button"
              type="button"
              disabled={saveCandidates.length === 0 || bulkUpload.status === 'saving'}
              onClick={onSave}
            >
              {bulkUpload.status === 'saving'
                ? t.map.bulkSaving
                : t.map.bulkSaveLocated(saveCandidates.length)}
            </button>
            <button
              className="map-secondary-button"
              type="button"
              disabled={bulkUpload.status === 'saving'}
              onClick={onReset}
            >
              {t.map.bulkClearResults}
            </button>
          </div>

          {bulkUpload.saveResult ? (
            <div className="map-status" role="status">
              {t.map.bulkSaveComplete(
                bulkUpload.saveResult.successCount,
                bulkUpload.saveResult.failedCount,
              )}
            </div>
          ) : null}

          <BulkUploadList
            emptyMessage={t.map.bulkNoLocatedItems}
            items={locatedItems}
            t={t}
            title={t.map.bulkSaveCandidates}
          />
          <BulkUploadList
            emptyMessage={t.map.bulkNoMissingItems}
            items={missingItems}
            onToggleItem={onToggleMissingItem}
            selectable
            selectedIds={selectedMissingLocationItemIds}
            t={t}
            title={t.map.bulkMissingLocationList}
          />
          <BulkUploadList
            emptyMessage={t.map.bulkNoFailedItems}
            items={failedItems}
            t={t}
            title={t.map.bulkFailedList}
          />
        </>
      ) : null}
    </section>
  )
}

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
  filterSummary,
  onDeleteRecord,
  onStartEdit,
  record,
  t,
}) {
  if (!record) {
    return (
      <section className="map-detail-panel map-filter-summary-panel">
        <div className="map-detail-copy">
          <p className="module-label">{t.map.filterSummaryLabel}</p>
          <h3>{filterSummary.filterName}</h3>
          <p>{t.map.noSelectedRecord}</p>
        </div>

        <div className="summary-metric summary-metric-wide">
          <span>{t.map.visiblePhotoCount}</span>
          <strong>{filterSummary.photoCount}</strong>
        </div>

        <dl className="map-coordinate-panel map-filter-summary-grid">
          <div>
            <dt>{t.map.sourceExif}</dt>
            <dd>{filterSummary.sourceCounts.exif}</dd>
          </div>
          <div>
            <dt>{t.map.sourceManual}</dt>
            <dd>{filterSummary.sourceCounts.manual}</dd>
          </div>
          <div>
            <dt>{t.map.sourceSearch}</dt>
            <dd>{filterSummary.sourceCounts.search}</dd>
          </div>
          <div>
            <dt>{t.map.sourceUnknown}</dt>
            <dd>{filterSummary.sourceCounts.unknown}</dd>
          </div>
        </dl>

        <div className="empty-state compact-empty" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{t.map.selectRecordHint}</p>
        </div>
      </section>
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

// 모드 전환 탭 — 탐색/업로드/컬렉션 관리 모드를 선택하는 탭 바
function MapModeTabs({ activeMode, onChangeMode, t }) {
  return (
    <div className="map-mode-tabs" role="tablist" aria-label={t.map.modeTabs}>
      <button
        className={`map-mode-tab${activeMode === 'explore' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={activeMode === 'explore'}
        type="button"
        onClick={() => onChangeMode('explore')}
      >
        {t.map.modeExplore}
      </button>
      <button
        className={`map-mode-tab${activeMode === 'upload' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={activeMode === 'upload'}
        type="button"
        onClick={() => onChangeMode('upload')}
      >
        {t.map.modeUpload}
      </button>
      <button
        className={`map-mode-tab${activeMode === 'collections' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={activeMode === 'collections'}
        type="button"
        onClick={() => onChangeMode('collections')}
      >
        {t.map.modeCollections}
      </button>
    </div>
  )
}

// 탐색 모드 왼쪽 패널 — 컬렉션 필터, 기록 검색, 사진 목록
function MapExplorePanel({
  activeRecordId,
  collections,
  filteredEmptyMessage,
  filteredRecords,
  mapSearchQuery,
  onSelectRecord,
  onSetCollectionFilter,
  onSetLocationSourceFilter,
  onSetSearchQuery,
  selectedCollectionFilter,
  selectedLocationSourceFilter,
  t,
}) {
  return (
    <>
      <div className="map-left-fixed">
        {/* 컬렉션 필터: 컬렉션 관리는 전용 탭에서, 탐색 모드에서는 필터 선택만 제공 */}
        <div className="map-section-header">
          <p className="module-label">{t.map.collectionsLabel}</p>
          <strong>{collections.length}</strong>
        </div>
        <div className="map-filter-options" aria-label={t.map.collectionFilter}>
          <button
            className={`map-filter-button ${
              selectedCollectionFilter === COLLECTION_FILTER_ALL ? 'is-active' : ''
            }`}
            type="button"
            onClick={() => onSetCollectionFilter(COLLECTION_FILTER_ALL)}
          >
            {t.map.allCollections}
          </button>
          <button
            className={`map-filter-button ${
              selectedCollectionFilter === COLLECTION_FILTER_UNASSIGNED ? 'is-active' : ''
            }`}
            type="button"
            onClick={() => onSetCollectionFilter(COLLECTION_FILTER_UNASSIGNED)}
          >
            {t.map.unassignedCollection}
          </button>
          {collections.map((collection) => (
            <button
              className={`map-filter-button ${
                selectedCollectionFilter === collection.id ? 'is-active' : ''
              }`}
              key={collection.id}
              type="button"
              onClick={() => onSetCollectionFilter(collection.id)}
            >
              {collection.name}
            </button>
          ))}
        </div>

        <div className="map-record-search-panel">
          <label className="map-field">
            <span>{t.map.recordSearchLabel}</span>
            <input
              type="search"
              value={mapSearchQuery}
              onChange={(event) => onSetSearchQuery(event.target.value)}
              placeholder={t.map.recordSearchPlaceholder}
            />
          </label>
          <div className="map-search-controls">
            <label className="map-field">
              <span>{t.map.locationSourceFilter}</span>
              <select
                value={selectedLocationSourceFilter}
                onChange={(event) => onSetLocationSourceFilter(event.target.value)}
              >
                {LOCATION_SOURCE_FILTER_OPTIONS.map((sourceFilter) => (
                  <option key={sourceFilter} value={sourceFilter}>
                    {t.map.locationSourceFilterOptions[sourceFilter]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="map-secondary-button"
              type="button"
              disabled={!mapSearchQuery}
              onClick={() => onSetSearchQuery('')}
            >
              {t.map.clearSearch}
            </button>
          </div>
          <p className="map-filter-result-count">
            {t.map.filteredRecordCount(filteredRecords.length)}
          </p>
        </div>
      </div>

      <div className="map-left-scroll">
        <PhotoRecordList
          activeRecordId={activeRecordId}
          emptyMessage={filteredEmptyMessage}
          onSelectRecord={onSelectRecord}
          records={filteredRecords}
          t={t}
        />
      </div>
    </>
  )
}

// 사진 업로드 모드 왼쪽 패널 — 단일/다중 업로드, EXIF 분석, 위치정보 없는 사진 후처리
function MapUploadPanel({
  bulkAssignedLocation,
  bulkSaveReport,
  bulkUpload,
  collections,
  draft,
  isAddingPhoto,
  isSaving,
  onCancelBulkAnalysis,
  onChangeBulkCollection,
  onChangeDraft,
  onClearMissingLocationSelection,
  onPhotoChange,
  onResetBulkUpload,
  onSaveBulkLocatedPhotos,
  onSaveDraft,
  onSelectAllMissingLocationItems,
  onSelectBulkPlace,
  onSelectPlace,
  onToggleAddPhoto,
  onToggleMissingLocationItem,
  photoInputRef,
  selectedMissingLocationItemIds,
  t,
}) {
  const isBulkActive = bulkUpload.status !== 'idle'

  return (
    <>
      <div className="map-left-fixed">
        {/* 사진 파일 선택 버튼 — bulk 분석/저장 중에는 비활성 */}
        <button
          className={`map-add-toggle-button${isAddingPhoto ? ' is-open' : ''}`}
          type="button"
          disabled={
            bulkUpload.status === 'analyzing' || bulkUpload.status === 'saving'
          }
          onClick={onToggleAddPhoto}
        >
          {isAddingPhoto ? t.map.cancelAddPhoto : t.map.addPhotoRecord}
        </button>
        <input
          id="map-photo-input"
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={onPhotoChange}
        />

        {/* bulk 저장 후 일부 실패 항목 표시 */}
        {bulkSaveReport?.failedItems.length > 0 ? (
          <div className="map-status is-error" role="alert">
            <strong>{t.map.bulkFailedList}</strong>
            <ul className="map-bulk-failed-report">
              {bulkSaveReport.failedItems.map((item, index) => (
                <li key={`${item.fileName}-${index}`}>{item.fileName}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* 단일 업로드 draft 패널 — bulk 분석 중이 아닐 때만 표시 */}
        {isAddingPhoto && !isBulkActive ? (
          <>
            {draft ? (
              <div className="map-status" role="status">
                {t.map.clickToSetLocation}
              </div>
            ) : null}
            <PhotoDraftPanel
              collections={collections}
              draft={draft}
              isSaving={isSaving}
              language={t.map.searchLanguage}
              onChangeDraft={onChangeDraft}
              onSaveDraft={onSaveDraft}
              onSelectPlace={onSelectPlace}
              t={t}
            />
          </>
        ) : null}
      </div>

      {/* bulk 분석 결과 스크롤 영역 */}
      {isBulkActive ? (
        <div className="map-left-scroll">
          <BulkUploadPanel
            bulkAssignedLocation={bulkAssignedLocation}
            bulkUpload={bulkUpload}
            collections={collections}
            onCancelAnalysis={onCancelBulkAnalysis}
            onChangeCollection={onChangeBulkCollection}
            onClearSelection={onClearMissingLocationSelection}
            onSelectAllMissing={onSelectAllMissingLocationItems}
            onSelectBulkPlace={onSelectBulkPlace}
            onReset={onResetBulkUpload}
            onSave={onSaveBulkLocatedPhotos}
            onToggleMissingItem={onToggleMissingLocationItem}
            selectedMissingLocationItemIds={selectedMissingLocationItemIds}
            t={t}
          />
        </div>
      ) : null}
    </>
  )
}

// 컬렉션 관리 모드 패널 — 컬렉션 생성/수정/삭제, 연결 사진 수 표시
function MapCollectionManagerPanel({
  collectionDraft,
  collections,
  editingCollectionId,
  getCollectionRecordCount,
  onCancelCollectionEdit,
  onChangeCollectionDraft,
  onDeleteCollection,
  onSaveCollection,
  onStartCollectionEdit,
  t,
}) {
  return (
    <>
      <div className="map-left-fixed">
        {/* 컬렉션 삭제 정책 안내: 삭제해도 연결 사진은 미분류로 이동 */}
        <div className="map-status" role="note">
          {t.map.collectionDeletePolicy}
        </div>
      </div>

      <div className="map-left-scroll">
        <PhotoCollectionPanel
          collectionDraft={collectionDraft}
          collections={collections}
          editingCollectionId={editingCollectionId}
          getCollectionRecordCount={getCollectionRecordCount}
          onCancelCollectionEdit={onCancelCollectionEdit}
          onChangeCollectionDraft={onChangeCollectionDraft}
          onDeleteCollection={onDeleteCollection}
          onSaveCollection={onSaveCollection}
          onStartCollectionEdit={onStartCollectionEdit}
          t={t}
        />
      </div>
    </>
  )
}

// TENVI Map 모듈의 로컬 사진 지도 아카이브 화면
function Map({ t }) {
  const photoInputRef = useRef(null)
  const bulkCancelRef = useRef(false)
  const [records, setRecords] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState(
    COLLECTION_FILTER_ALL,
  )
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [selectedLocationSourceFilter, setSelectedLocationSourceFilter] =
    useState(LOCATION_SOURCE_FILTER_ALL)
  const [collectionDraft, setCollectionDraft] = useState(() =>
    normalizePhotoCollectionInput(),
  )
  const [editingCollectionId, setEditingCollectionId] = useState('')
  const [draft, setDraft] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [activeRecordId, setActiveRecordId] = useState('')
  // 사진 등록 폼 표시 여부 — 기본 접힘
  const [isAddingPhoto, setIsAddingPhoto] = useState(false)
  // 컬렉션 생성/수정 폼 표시 여부 — 기본 접힘
  const [isCollectionFormOpen, setIsCollectionFormOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [viewportRequest, setViewportRequest] = useState(() =>
    createViewportRequest('fit-all'),
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [bulkUpload, setBulkUpload] = useState({
    collectionId: null,
    items: [],
    processed: 0,
    saveResult: null,
    status: 'idle',
    total: 0,
  })
  const [selectedMissingLocationItemIds, setSelectedMissingLocationItemIds] =
    useState([])
  const [bulkAssignedLocation, setBulkAssignedLocation] = useState(null)
  const [bulkSaveReport, setBulkSaveReport] = useState(null)
  // 현재 지도 모드 — 탐색/업로드/컬렉션 관리 전환 상태
  // 모드 전환 시 진행 중인 draft나 bulk 결과를 강제 초기화하지 않고 화면만 분기
  const [activeMapMode, setActiveMapMode] = useState('explore')
  const normalizedRecords = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        collectionId: normalizePhotoRecordCollectionId(record, collections),
      })),
    [collections, records],
  )
  const collectionFilteredRecords = useMemo(
    () =>
      filterPhotoRecordsByCollection(
        normalizedRecords,
        collections,
        selectedCollectionFilter,
      ),
    [collections, normalizedRecords, selectedCollectionFilter],
  )
  const filteredRecords = useMemo(
    () =>
      // 컬렉션 필터와 검색/위치 필터 조합: 컬렉션 결과에 추가 조건을 순서대로 적용
      filterPhotoRecordsBySearchAndLocation(collectionFilteredRecords, {
        locationSourceFilter: selectedLocationSourceFilter,
        searchQuery: mapSearchQuery,
      }),
    [collectionFilteredRecords, mapSearchQuery, selectedLocationSourceFilter],
  )
  const filterSummary = useMemo(
    () =>
      // 오른쪽 빈 상태 요약: 저장소 재조회 없이 현재 필터 결과만 집계
      createMapFilterSummary(
        filteredRecords,
        selectedCollectionFilter,
        collections,
        t,
      ),
    [collections, filteredRecords, selectedCollectionFilter, t],
  )
  const activeRecord = normalizedRecords.find((record) => record.id === activeRecordId)
  const focusTarget =
    editDraft?.status === 'located'
      ? editDraft
      : activeRecord ?? (draft?.status === 'located' ? draft : null)
  const canPickLocation = Boolean(
    draft ||
      editDraft ||
      (['completed', 'cancelled'].includes(bulkUpload.status) &&
        selectedMissingLocationItemIds.length > 0),
  )
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
    mapSearchQuery.trim() ||
    selectedLocationSourceFilter !== LOCATION_SOURCE_FILTER_ALL
      ? t.map.noMatchingRecords
      : selectedCollectionFilter === COLLECTION_FILTER_ALL
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
  const bulkMarkerIcon = useMemo(
    () =>
      L.divIcon({
        className: 'map-marker-icon map-marker-icon-bulk',
        html: '<span></span>',
        iconAnchor: [12, 12],
        iconSize: [24, 24],
        popupAnchor: [0, -14],
      }),
    [],
  )
  const hasBulkAssignedLocation =
    Number.isFinite(Number(bulkAssignedLocation?.latitude)) &&
    Number.isFinite(Number(bulkAssignedLocation?.longitude))

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

  const resetBulkUpload = () => {
    bulkCancelRef.current = false
    // 임시 File 참조와 preview Blob 정리: bulk 상태를 비워 다음 업로드와 섞이지 않게 함
    setBulkAssignedLocation(null)
    setBulkSaveReport(null)
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
    setBulkUpload({
      collectionId: null,
      items: [],
      processed: 0,
      saveResult: null,
      status: 'idle',
      total: 0,
    })
  }

  const analyzeBulkPhotoFiles = async (files) => {
    bulkCancelRef.current = false
    setDraft(null)
    setEditDraft(null)
    setActiveRecordId('')
    setIsAddingPhoto(false)
    setError('')
    setStatusMessage('')
    setBulkAssignedLocation(null)
    setBulkSaveReport(null)
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
    setBulkUpload({
      collectionId: null,
      items: [],
      processed: 0,
      saveResult: null,
      status: 'analyzing',
      total: files.length,
    })

    // 대량 업로드 분석 큐 처리: 500장 이상에서도 메모리 급증을 피하도록 파일을 순차 분석
    for (const [index, file] of files.entries()) {
      // 진행률 업데이트와 취소 확인: 취소 이후의 미처리 파일은 분석하지 않음
      if (bulkCancelRef.current) {
        setBulkUpload((currentUpload) => ({
          ...currentUpload,
          status: 'cancelled',
        }))
        return
      }

      const id = createBulkUploadId(file, index)

      try {
        const location = await readPhotoLocation(file)
        const previewImage =
          location.status === 'located' ? await createPreviewImageBlob(file) : null

        setBulkUpload((currentUpload) => ({
          ...currentUpload,
          items: [
            ...currentUpload.items,
            createBulkPhotoAnalysisItem({
              file,
              fileName: file.name,
              fileType: file.type,
              id,
              location,
              previewImage,
              status: location.status,
            }),
          ],
          processed: currentUpload.processed + 1,
        }))
      } catch {
        setBulkUpload((currentUpload) => ({
          ...currentUpload,
          items: [
            ...currentUpload.items,
            createBulkPhotoAnalysisItem({
              errorMessage: t.map.readError,
              file,
              fileName: file.name,
              fileType: file.type,
              id,
              status: 'failed',
            }),
          ],
          processed: currentUpload.processed + 1,
        }))
      }
    }

    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      status: bulkCancelRef.current ? 'cancelled' : 'completed',
    }))
  }

  const handlePhotoChange = async (event) => {
    const files = Array.from(event.target.files ?? [])
    const [file] = files

    setError('')
    setStatusMessage('')

    if (!file) {
      return
    }

    if (files.length > 1) {
      event.target.value = ''
      await analyzeBulkPhotoFiles(files)
      return
    }

    setIsReading(true)
    resetBulkUpload()

    try {
      // 원본 저장 없이 EXIF 위치와 리사이즈 미리보기 Blob만 draft에 보관
      const [location, previewImage] = await Promise.all([
        readPhotoLocation(file),
        createPreviewImageBlob(file),
      ])

      setDraft(createPhotoDraft(file, location, previewImage))
      setEditDraft(null)
      setActiveRecordId('')
      setIsAddingPhoto(true)
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

    if (draft) {
      setDraft((currentDraft) => applyManualLocationToDraft(currentDraft, lat, lng))
      setActiveRecordId('')
      setViewportRequest(
        createViewportRequest('manual-click', {
          latitude: lat,
          longitude: lng,
        }),
      )
      return
    }

    if (
      ['completed', 'cancelled'].includes(bulkUpload.status) &&
      selectedMissingLocationItemIds.length > 0
    ) {
      const location = {
        latitude: lat,
        locationSource: 'manual',
        longitude: lng,
      }

      // 지도 클릭 bulk 위치 적용: 단일 draft/edit 흐름이 없을 때만 현재 zoom 유지하며 일괄 반영
      applyBulkLocationToSelection(location)
      setViewportRequest(createViewportRequest('manual-click', location))
    }
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
    setIsCollectionFormOpen(true)
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
      setIsAddingPhoto(false)
      setActiveRecordId(savedRecord.id)
      setViewportRequest(createViewportRequest('record-select', savedRecord))
      setStatusMessage(t.map.saveComplete)
    } catch {
      setError(t.map.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelBulkAnalysis = () => {
    bulkCancelRef.current = true
  }

  const handleChangeBulkCollection = (collectionId) => {
    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      collectionId,
      saveResult: null,
    }))
  }

  const handleToggleMissingLocationItem = (itemId) => {
    // bulk missing-location 선택 처리: 저장 후보 전환 전 항목만 사용자가 명시적으로 고름
    setSelectedMissingLocationItemIds((currentIds) =>
      toggleBulkMissingLocationSelection(currentIds, itemId),
    )
  }

  const handleSelectAllMissingLocationItems = () => {
    // 전체 선택 / 선택 해제: 원래 위치정보가 없었던 후처리 대상만 선택
    setSelectedMissingLocationItemIds(
      selectAllBulkMissingLocationItems(bulkUpload.items),
    )
  }

  const handleClearMissingLocationSelection = () => {
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
  }

  const applyBulkLocationToSelection = async (location) => {
    if (selectedMissingLocationItemIds.length === 0) {
      setError(t.map.bulkSelectMissingFirst)
      return
    }

    setError('')
    const selectedIdSet = new Set(selectedMissingLocationItemIds)
    const successfulIds = []

    const itemsWithPreview = []

    for (const item of bulkUpload.items) {
      if (!selectedIdSet.has(item.id) || item.status === 'failed') {
        itemsWithPreview.push(item)
        continue
      }

      try {
        const previewImage =
          item.previewImage?.blob || !item.file
            ? item.previewImage
            : await createPreviewImageBlob(item.file)

        if (!previewImage?.blob) {
          throw new Error('Missing preview image.')
        }

        successfulIds.push(item.id)
        itemsWithPreview.push({
          ...item,
          previewImage,
        })
      } catch {
        // 일부 항목 처리 실패 fallback: 실패한 사진만 제외하고 나머지 위치 적용은 계속 진행
        itemsWithPreview.push({
          ...item,
          errorMessage: t.map.bulkPreviewCreateError,
          status: 'failed',
        })
      }
    }

    // 위치 적용 후 저장 후보 전환: 좌표와 preview Blob이 있는 항목만 기존 저장 후보 계산에 합류
    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      items: applyLocationToBulkItems(itemsWithPreview, successfulIds, location),
      saveResult: null,
    }))
    setBulkAssignedLocation({
      ...location,
      appliedCount: successfulIds.length,
    })
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
  }

  const handleSelectBulkPlace = (place) => {
    // 장소 검색 결과 bulk 위치 적용: 선택 항목에 같은 검색 좌표를 반영
    applyBulkLocationToSelection({
      latitude: place.latitude,
      locationSource: 'search',
      longitude: place.longitude,
    })
    setViewportRequest(createViewportRequest('search-select', place))
  }

  const handleSaveBulkLocatedPhotos = async () => {
    const recordInputs = createBulkPhotoRecordInputs(
      bulkUpload.items,
      bulkUpload.collectionId,
    )

    if (recordInputs.length === 0) {
      setError(t.map.bulkNoSaveCandidates)
      return
    }

    setError('')
    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      status: 'saving',
    }))

    try {
      const results = await createPhotoRecords(recordInputs)
      const saveResult = createBulkPhotoSaveResult(results)
      const savedRecords = await getPhotoRecords()

      setRecords(savedRecords)
      setBulkSaveReport(saveResult)
      setBulkAssignedLocation(null)
      setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
      setActiveRecordId(saveResult.savedRecords[0]?.id ?? '')
      setViewportRequest(createViewportRequest('fit-all'))
      setBulkUpload({
        collectionId: null,
        items: [],
        processed: 0,
        saveResult: null,
        status: 'idle',
        total: 0,
      })
      setStatusMessage(
        t.map.bulkSaveComplete(saveResult.successCount, saveResult.failedCount),
      )
    } catch {
      setError(t.map.bulkSaveError)
      setBulkUpload((currentUpload) => ({
        ...currentUpload,
        status: 'completed',
      }))
    }
  }

  const handleStartEdit = () => {
    setDraft(null)
    setIsAddingPhoto(false)
    resetBulkUpload()
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
    setIsAddingPhoto(false)
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

  // 사진 등록 폼 펼치기/접기 — 닫을 때 미저장 draft만 초기화, 저장 기록에는 영향 없음
  const handleToggleAddPhoto = () => {
    if (isAddingPhoto) {
      setIsAddingPhoto(false)
      setDraft(null)
      setError('')
    } else {
      photoInputRef.current?.click()
    }
  }

  // 컬렉션 생성/수정 폼 펼치기/접기 — 닫을 때 입력 draft만 초기화, 기존 컬렉션 데이터에는 영향 없음
  const handleToggleCollectionForm = () => {
    if (isCollectionFormOpen) {
      setIsCollectionFormOpen(false)
      resetCollectionDraft()
    } else {
      setIsCollectionFormOpen(true)
    }
  }

  // 현재 필터의 전체 마커가 보이도록 지도 범위 조정 — 선택 상태는 유지
  const handleFitAllMarkers = () => {
    setViewportRequest(createViewportRequest('fit-all-forced'))
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

      {/* 모드 전환 탭 — 탐색/업로드/컬렉션 관리 */}
      <MapModeTabs activeMode={activeMapMode} onChangeMode={setActiveMapMode} t={t} />

      {/* 공통 상태 메시지 — 모드 전환과 무관하게 항상 표시 */}
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

      {/* 3패널 레이아웃: upload/collections 모드에서는 오른쪽 패널 없이 2열로 전환 */}
      <div className="map-archive-layout" data-mode={activeMapMode}>
        <aside className="map-control-panel">
          {/* 탐색 모드: 컬렉션 필터, 기록 검색, 사진 목록 */}
          {activeMapMode === 'explore' ? (
            <MapExplorePanel
              activeRecordId={activeRecordId}
              collections={collections}
              filteredEmptyMessage={filteredEmptyMessage}
              filteredRecords={filteredRecords}
              mapSearchQuery={mapSearchQuery}
              onSelectRecord={handleSelectRecord}
              onSetCollectionFilter={setSelectedCollectionFilter}
              onSetLocationSourceFilter={setSelectedLocationSourceFilter}
              onSetSearchQuery={setMapSearchQuery}
              selectedCollectionFilter={selectedCollectionFilter}
              selectedLocationSourceFilter={selectedLocationSourceFilter}
              t={t}
            />
          ) : null}

          {/* 업로드 모드: 단일/다중 업로드, EXIF 분석, 위치정보 없는 사진 후처리 */}
          {activeMapMode === 'upload' ? (
            <MapUploadPanel
              bulkAssignedLocation={bulkAssignedLocation}
              bulkSaveReport={bulkSaveReport}
              bulkUpload={bulkUpload}
              collections={collections}
              draft={draft}
              isAddingPhoto={isAddingPhoto}
              isSaving={isSaving}
              onCancelBulkAnalysis={handleCancelBulkAnalysis}
              onChangeBulkCollection={handleChangeBulkCollection}
              onChangeDraft={handleChangeDraft}
              onClearMissingLocationSelection={handleClearMissingLocationSelection}
              onPhotoChange={handlePhotoChange}
              onResetBulkUpload={resetBulkUpload}
              onSaveBulkLocatedPhotos={handleSaveBulkLocatedPhotos}
              onSaveDraft={handleSaveDraft}
              onSelectAllMissingLocationItems={handleSelectAllMissingLocationItems}
              onSelectBulkPlace={handleSelectBulkPlace}
              onSelectPlace={handleSelectPlace}
              onToggleAddPhoto={handleToggleAddPhoto}
              onToggleMissingLocationItem={handleToggleMissingLocationItem}
              photoInputRef={photoInputRef}
              selectedMissingLocationItemIds={selectedMissingLocationItemIds}
              t={t}
            />
          ) : null}

          {/* 컬렉션 관리 모드: 컬렉션 생성/수정/삭제 */}
          {activeMapMode === 'collections' ? (
            <MapCollectionManagerPanel
              collectionDraft={collectionDraft}
              collections={collections}
              editingCollectionId={editingCollectionId}
              getCollectionRecordCount={getCollectionRecordCount}
              onCancelCollectionEdit={resetCollectionDraft}
              onChangeCollectionDraft={handleChangeCollectionDraft}
              onDeleteCollection={handleDeleteCollection}
              onSaveCollection={handleSaveCollection}
              onStartCollectionEdit={handleStartCollectionEdit}
              t={t}
            />
          ) : null}
        </aside>

        <section className="map-view-panel" aria-label={t.map.mapLabel}>
          {/* 전체 위치 보기: 등록·편집 중이 아닐 때, 마커가 하나 이상일 때 표시 */}
          {filteredRecords.length > 0 && !draft && !editDraft ? (
            <button
              className="map-fit-all-button"
              type="button"
              onClick={handleFitAllMarkers}
            >
              {t.map.fitAllMarkers}
            </button>
          ) : null}
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

            {hasBulkAssignedLocation ? (
              // bulk 임시 위치는 아직 저장 record가 아니므로 저장 마커와 별도로 표시
              <Marker
                icon={bulkMarkerIcon}
                position={[
                  Number(bulkAssignedLocation.latitude),
                  Number(bulkAssignedLocation.longitude),
                ]}
              >
                <Popup>
                  <div className="map-popup">
                    <strong>{t.map.bulkPendingLocation}</strong>
                    <span>
                      {t.map.bulkAssignedPhotoCount(
                        bulkAssignedLocation.appliedCount ?? 0,
                      )}
                    </span>
                    <span>
                      {Number(bulkAssignedLocation.latitude).toFixed(6)},{' '}
                      {Number(bulkAssignedLocation.longitude).toFixed(6)}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>
        </section>

        {/* 오른쪽 상세 패널 — 탐색 모드에서만 표시 */}
        {activeMapMode === 'explore' ? (
          <aside className="map-detail-column">
            {editDraft ? (
              <div className="map-status" role="status">
                {t.map.clickToSetLocation}
              </div>
            ) : null}
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
                filterSummary={filterSummary}
                onDeleteRecord={handleDeleteRecord}
                onStartEdit={handleStartEdit}
                record={activeRecord}
                t={t}
              />
            )}
          </aside>
        ) : null}
      </div>
    </section>
  )
}

export default Map
