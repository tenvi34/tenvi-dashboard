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
import './Map.css'
import {
  createBulkUploadSummary,
  getBulkLocationAssignableItems,
  getBulkPhotoSaveCandidates,
  getBulkMissingLocationItems,
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
  isEditDraftReadyToSave,
  isPhotoDraftReadyToSave,
  LOCATION_SOURCE_FILTER_ALL,
  LOCATION_SOURCE_FILTER_UNKNOWN,
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
  getPhotoCollections,
} from '../services/photoCollectionRepository.js'
import { searchPlaces } from '../services/placeSearchService.js'
import { createPreviewImageBlob } from '../utils/imageUtils.js'
import PhotoCollectionSelect from './map/MapCollectionSelect.jsx'
import {
  MapModeTabs,
  MobileMapEmptyCard,
  MobileMapPreviewCard,
  MobileMapViewTabs,
} from './map/MapNavigation.jsx'
import {
  PhotoLightbox,
  PhotoPreviewButton,
} from './map/MapPhotoPreview.jsx'
import PhotoRecordList from './map/MapRecordList.jsx'
import useMapBulkUploadController from './map/useMapBulkUploadController.js'
import useMapCollectionController from './map/useMapCollectionController.js'

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
const MAP_NAVIGATION_REQUEST_TYPES = new Set([
  'exif-detect',
  'manual-click',
  'marker-select',
  'record-select',
  'search-select',
])

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

// 지도 화면 제어
function MapViewportController({
  layoutKey,
  records,
  request,
  shouldFitBounds,
  target,
}) {
  const map = useMap()
  const handledNavigationRequestIdRef = useRef('')

  useEffect(() => {
    const requestLatitude = Number(request?.latitude)
    const requestLongitude = Number(request?.longitude)
    const targetLatitude = Number(target?.latitude)
    const targetLongitude = Number(target?.longitude)
    const hasRequestLocation =
      Number.isFinite(requestLatitude) && Number.isFinite(requestLongitude)
    const hasTargetLocation =
      Number.isFinite(targetLatitude) && Number.isFinite(targetLongitude)
    const requestType = request?.type
    const isNavigationRequest = MAP_NAVIGATION_REQUEST_TYPES.has(requestType)
    const isFitAllAuto = requestType === 'fit-all' && shouldFitBounds
    // 강제 전체 마커 범위
    const isFitAllForced = requestType === 'fit-all-forced'
    const container = map.getContainer()
    const mapSize = map.getSize()
    const canMeasureMap =
      container.offsetWidth > 0 &&
      container.offsetHeight > 0 &&
      mapSize.x > 0 &&
      mapSize.y > 0

    // 숨김 지도 방어
    if (!canMeasureMap) {
      return
    }

    if (isFitAllAuto || isFitAllForced) {
      handledNavigationRequestIdRef.current = ''

      const visibleRecords = records
        .map((record) => ({
          ...record,
          latitude: Number(record.latitude),
          longitude: Number(record.longitude),
        }))
        .filter((record) => Number.isFinite(record.latitude) && Number.isFinite(record.longitude))

      if (visibleRecords.length > 1) {
        const bounds = L.latLngBounds(
          visibleRecords.map((record) => [record.latitude, record.longitude]),
        )
        map.fitBounds(bounds, { maxZoom: FIT_BOUNDS_MAX_ZOOM, padding: [36, 36] })
      } else if (visibleRecords.length === 1) {
        map.setView(
          [visibleRecords[0].latitude, visibleRecords[0].longitude],
          RECORD_FOCUS_ZOOM,
        )
      }

      return
    }

    if (isNavigationRequest && (hasRequestLocation || hasTargetLocation)) {
      const requestId = request?.requestId ?? ''

      // 중복 이동 방지
      if (requestId && handledNavigationRequestIdRef.current === requestId) {
        return
      }

      handledNavigationRequestIdRef.current = requestId
      // 이동 요청 좌표 우선
      const nextCenter = hasRequestLocation
        ? [requestLatitude, requestLongitude]
        : [targetLatitude, targetLongitude]
      const currentCenter = map.getCenter()

      if (
        Math.abs(currentCenter.lat - nextCenter[0]) < 0.000001 &&
        Math.abs(currentCenter.lng - nextCenter[1]) < 0.000001
      ) {
        return
      }

      // 요청 유형별 줌 정책
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
  }, [layoutKey, map, records, request, shouldFitBounds, target])

  return null
}

// 지도 클릭 좌표 전달
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

// Leaflet 크기 재계산
function MapResizeController({ watchValue }) {
  const map = useMap()

  useEffect(() => {
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize()
    }, 120)

    return () => window.clearTimeout(resizeTimer)
  }, [map, watchValue])

  return null
}

function PhotoRecordMarker({ icon, isActive, onSelectRecord, record, t }) {
  const markerRef = useRef(null)

  useEffect(() => {
    if (isActive) {
      // 선택 팝업 연결
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

// 장소 검색 패널
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
      // 명시적 장소 검색
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
  onSelectAllLocationTargets,
  onSelectBulkPlace,
  onReset,
  onSave,
  onToggleLocationTarget,
  selectedMissingLocationItemIds,
  t,
}) {
  const summary = createBulkUploadSummary(bulkUpload.items)
  const saveCandidates = getBulkPhotoSaveCandidates(bulkUpload.items)
  const locatedItems = bulkUpload.items.filter((item) => item.status === 'located')
  const missingItems = getBulkMissingLocationItems(bulkUpload.items)
  const assignableItems = getBulkLocationAssignableItems(bulkUpload.items)
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

          {assignableItems.length > 0 ? (
            <div className="map-bulk-assignment-panel">
              <div className="map-section-header">
                <div>
                  <p className="module-label">{t.map.bulkSharedLocationAssignment}</p>
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
                  onClick={onSelectAllLocationTargets}
                >
                  {t.map.bulkSelectAllLocationTargets}
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
                  : t.map.bulkSelectLocationTargetsFirst}
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
            emptyMessage={t.map.bulkNoLocationTargetItems}
            items={assignableItems}
            onToggleItem={onToggleLocationTarget}
            selectable
            selectedIds={selectedMissingLocationItemIds}
            t={t}
            title={t.map.bulkSameLocationTargets}
          />
          {missingItems.length > 0 ? (
            <BulkUploadList
              emptyMessage={t.map.bulkNoMissingItems}
              items={missingItems}
              t={t}
              title={t.map.bulkMissingLocationList}
            />
          ) : null}
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
  onOpenPhoto,
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
      <PhotoPreviewButton
        alt={draft.title || draft.originalFileName}
        blob={draft.previewImageBlob}
        className="map-draft-preview"
        onOpen={onOpenPhoto}
        t={t}
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

// 기록 편집 패널
function PhotoEditPanel({
  collections,
  editDraft,
  isUpdating,
  language,
  onCancelEdit,
  onChangeEditDraft,
  onOpenPhoto,
  onSaveEdit,
  onSelectPlace,
  record,
  t,
}) {
  const isReadyToSave = isEditDraftReadyToSave(editDraft)

  return (
    <section className="map-detail-panel" aria-label={t.map.editLabel}>
      <PhotoPreviewButton
        alt={record.title}
        blob={record.previewImageBlob}
        className="map-detail-preview"
        onOpen={onOpenPhoto}
        t={t}
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

// 기록 상세 패널
function PhotoRecordDetail({
  collections,
  filterSummary,
  onDeleteRecord,
  onOpenPhoto,
  onStartEdit,
  record,
  t,
}) {
  if (!record) {
    return (
      <section className="map-detail-panel map-filter-summary-panel">
        <div className="map-filter-summary-card">
          <p className="module-label">{t.map.filterSummaryLabel}</p>
          <h3>{filterSummary.filterName}</h3>
          <div className="map-filter-summary-count">
            <span>{t.map.visiblePhotoCount}</span>
            <strong>{filterSummary.photoCount}</strong>
          </div>
          {/* 필터 결과 요약 */}
          <dl className="map-filter-summary-grid">
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
          <p>{t.map.selectRecordHint}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="map-detail-panel" aria-label={t.map.detailLabel}>
      <PhotoPreviewButton
        alt={record.title}
        blob={record.previewImageBlob}
        className="map-detail-preview"
        onOpen={onOpenPhoto}
        t={t}
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
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const hasSearchFilter = mapSearchQuery.trim().length > 0
  const hasLocationSourceFilter =
    selectedLocationSourceFilter !== LOCATION_SOURCE_FILTER_ALL
  const hasActiveFilter = hasSearchFilter || hasLocationSourceFilter

  const handleResetFilters = () => {
    onSetSearchQuery('')
    onSetLocationSourceFilter(LOCATION_SOURCE_FILTER_ALL)
  }

  return (
    <>
      <div className="map-left-fixed">
        <label className="map-field map-collection-select-field">
          <span>{t.map.collectionFilter}</span>
          {/* 컬렉션 select 압축 */}
          <select
            value={selectedCollectionFilter}
            onChange={(event) => onSetCollectionFilter(event.target.value)}
          >
            <option value={COLLECTION_FILTER_ALL}>{t.map.allCollections}</option>
            <option value={COLLECTION_FILTER_UNASSIGNED}>
              {t.map.unassignedCollection}
            </option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        </label>

        <div className="map-record-filter-bar">
          <div className="map-record-filter-heading">
            <p className="module-label">{t.map.recordListLabel}</p>
            <strong>{filteredRecords.length}</strong>
          </div>
          <div className="map-record-filter-actions">
            {hasActiveFilter ? (
              <button
                className="map-filter-badge"
                type="button"
                onClick={() => setIsFilterOpen(true)}
              >
                {t.map.filtersActive}
              </button>
            ) : null}
            <button
              className="map-secondary-button map-filter-toggle-button"
              type="button"
              aria-expanded={isFilterOpen}
              onClick={() => setIsFilterOpen((currentValue) => !currentValue)}
            >
              {isFilterOpen ? t.map.closeFilters : t.map.openFilters}
            </button>
          </div>
          <p className="map-filter-result-count">
            {t.map.filteredRecordCount(filteredRecords.length)}
          </p>
        </div>

        {isFilterOpen ? (
          <div className="map-record-search-panel">
            {/* 접이식 필터 */}
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
                disabled={!hasActiveFilter}
                onClick={handleResetFilters}
              >
                {t.map.resetFilters}
              </button>
              <button
                className="map-secondary-button"
                type="button"
                onClick={() => setIsFilterOpen(false)}
              >
                {t.map.closeFilters}
              </button>
            </div>
          </div>
        ) : null}
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

// 사진 업로드 패널
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
  onOpenPhoto,
  onPhotoChange,
  onResetBulkUpload,
  onSaveBulkLocatedPhotos,
  onSaveDraft,
  onSelectAllBulkLocationTargets,
  onSelectBulkPlace,
  onSelectPlace,
  onToggleAddPhoto,
  onToggleBulkLocationTarget,
  photoInputRef,
  selectedMissingLocationItemIds,
  t,
}) {
  const isBulkActive = bulkUpload.status !== 'idle'

  return (
    <>
      <div className="map-left-fixed">
        {/* 사진 선택 버튼 */}
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

        {/* bulk 저장 실패 */}
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

        {/* 단일 업로드 draft */}
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
                onOpenPhoto={onOpenPhoto}
                onSaveDraft={onSaveDraft}
                onSelectPlace={onSelectPlace}
                t={t}
            />
          </>
        ) : null}
      </div>

      {/* bulk 결과 영역 */}
      {isBulkActive ? (
        <div className="map-left-scroll">
          <BulkUploadPanel
            bulkAssignedLocation={bulkAssignedLocation}
            bulkUpload={bulkUpload}
            collections={collections}
              onCancelAnalysis={onCancelBulkAnalysis}
              onChangeCollection={onChangeBulkCollection}
              onClearSelection={onClearMissingLocationSelection}
              onSelectAllLocationTargets={onSelectAllBulkLocationTargets}
              onSelectBulkPlace={onSelectBulkPlace}
              onReset={onResetBulkUpload}
              onSave={onSaveBulkLocatedPhotos}
              onToggleLocationTarget={onToggleBulkLocationTarget}
              selectedMissingLocationItemIds={selectedMissingLocationItemIds}
              t={t}
            />
        </div>
      ) : null}
    </>
  )
}

// 컬렉션 관리 모드
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
        {/* 컬렉션 삭제 정책 */}
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

// TENVI Map 모듈
function Map({ t }) {
  const photoInputRef = useRef(null)
  const [records, setRecords] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedCollectionFilter, setSelectedCollectionFilter] = useState(
    COLLECTION_FILTER_ALL,
  )
  const [mapSearchQuery, setMapSearchQuery] = useState('')
  const [selectedLocationSourceFilter, setSelectedLocationSourceFilter] =
    useState(LOCATION_SOURCE_FILTER_ALL)
  const [draft, setDraft] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [activeRecordId, setActiveRecordId] = useState('')
  // 사진 등록 폼 상태
  const [isAddingPhoto, setIsAddingPhoto] = useState(false)
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(true)
  const [isReading, setIsReading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [viewportRequest, setViewportRequest] = useState(() =>
    createViewportRequest('fit-all'),
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [photoViewer, setPhotoViewer] = useState(null)
  // 지도 모드 상태
  // 모드 전환 화면 분기
  const [activeMapMode, setActiveMapMode] = useState('explore')
  // 모바일 Map 보기 상태
  const [activeMobileMapView, setActiveMobileMapView] = useState('map')
  const [hasMobileMapViewInteraction, setHasMobileMapViewInteraction] = useState(false)
  const {
    analyzeBulkPhotoFiles,
    applyBulkLocationToSelection,
    bulkAssignedLocation,
    bulkSaveReport,
    bulkUpload,
    handleCancelBulkAnalysis,
    handleChangeBulkCollection,
    handleClearMissingLocationSelection,
    handleSaveBulkLocatedPhotos,
    handleSelectAllBulkLocationTargets,
    handleSelectBulkPlace,
    handleToggleBulkLocationTarget,
    resetBulkUpload,
    selectedMissingLocationItemIds,
  } = useMapBulkUploadController({
    createViewportRequest,
    setActiveRecordId,
    setError,
    setRecords,
    setStatusMessage,
    setViewportRequest,
    t,
  })
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
      // 컬렉션/검색 필터 조합
      filterPhotoRecordsBySearchAndLocation(collectionFilteredRecords, {
        locationSourceFilter: selectedLocationSourceFilter,
        searchQuery: mapSearchQuery,
      }),
    [collectionFilteredRecords, mapSearchQuery, selectedLocationSourceFilter],
  )
  const filterSummary = useMemo(
    () =>
      // 필터 결과 집계
      createMapFilterSummary(
        filteredRecords,
        selectedCollectionFilter,
        collections,
        t,
      ),
    [collections, filteredRecords, selectedCollectionFilter, t],
  )
  const visibleActiveRecordId =
    activeRecordId && filteredRecords.some((record) => record.id === activeRecordId)
      ? activeRecordId
      : ''
  const activeRecord = normalizedRecords.find((record) => record.id === visibleActiveRecordId)
  // 모바일 빈 상태 보정용 표시 값
  const mobileMapView =
    !isLoading &&
    normalizedRecords.length === 0 &&
    activeMobileMapView === 'map' &&
    !hasMobileMapViewInteraction
      ? 'list'
      : activeMobileMapView
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
  const shouldFitBounds = !visibleActiveRecordId && !draft && !editDraft && !isLoading
  const getCollectionRecordCount = (collectionId) =>
    normalizedRecords.filter((record) => record.collectionId === collectionId).length
  const {
    collectionDraft,
    editingCollectionId,
    handleChangeCollectionDraft,
    handleDeleteCollection,
    handleSaveCollection,
    handleStartCollectionEdit,
    resetCollectionDraft,
  } = useMapCollectionController({
    getCollectionRecordCount,
    setCollections,
    setError,
    setRecords,
    setSelectedCollectionFilter,
    setStatusMessage,
    t,
  })
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
    if (!photoViewer) {
      return undefined
    }

    document.body.classList.add('tenvi-modal-open')

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setPhotoViewer(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('tenvi-modal-open')
    }
  }, [photoViewer])

  useEffect(() => {
    let isMounted = true

    // IndexedDB 초기 조회
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
      setDraft(null)
      setEditDraft(null)
      setActiveRecordId('')
      setIsAddingPhoto(false)
      await analyzeBulkPhotoFiles(files)
      return
    }

    setIsReading(true)
    resetBulkUpload()

    try {
      // EXIF와 미리보기 보관
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

      // bulk 지도 클릭 위치
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
      // 저장 버튼 후 IndexedDB 업데이트
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
    // 재클릭 이동 요청
    setViewportRequest(createViewportRequest(requestType, selectedRecord))
  }

  const handleSelectMarker = (recordId) => {
    handleSelectRecord(recordId, 'marker-select')
  }

  const handleChangeMobileMapView = (nextView) => {
    setHasMobileMapViewInteraction(true)
    setActiveMobileMapView(nextView)
  }

  const handleSelectRecordFromList = (recordId) => {
    // 목록 선택 후 상세 이동
    handleSelectRecord(recordId)
    handleChangeMobileMapView('detail')
  }

  const handleShowActiveRecordOnMap = () => {
    handleChangeMobileMapView('map')

    if (activeRecord) {
      // 선택 기록 지도 포커스
      setViewportRequest(createViewportRequest('record-select', activeRecord))
    }
  }

  const handleSelectMobileMapView = (nextView) => {
    if (nextView === 'map' && activeRecord) {
      handleShowActiveRecordOnMap()
      return
    }

    handleChangeMobileMapView(nextView)
  }

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm(t.map.deleteConfirm)) {
      return
    }

    setError('')

    try {
      // IndexedDB 삭제 반영
      await deletePhotoRecord(recordId)
      setRecords((currentRecords) =>
        currentRecords.filter((record) => record.id !== recordId),
      )
      setActiveRecordId((currentId) => (currentId === recordId ? '' : currentId))
      setEditDraft((currentDraft) =>
        currentDraft?.id === recordId ? null : currentDraft,
      )
      if (activeRecordId === recordId) {
        handleChangeMobileMapView('list')
      }
      setViewportRequest(createViewportRequest('fit-all'))
      setStatusMessage(t.map.deleteComplete)
    } catch {
      setError(t.map.deleteError)
    }
  }

  // 사진 등록 폼 토글
  const handleToggleAddPhoto = () => {
    if (isAddingPhoto) {
      setIsAddingPhoto(false)
      setDraft(null)
      setError('')
    } else {
      photoInputRef.current?.click()
    }
  }

  // 전체 마커 범위
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

      {/* 모드 전환 탭 */}
      <MapModeTabs activeMode={activeMapMode} onChangeMode={setActiveMapMode} t={t} />
      {activeMapMode === 'explore' ? (
        <MobileMapViewTabs
          activeView={mobileMapView}
          onChangeView={handleSelectMobileMapView}
          t={t}
        />
      ) : null}

      {/* 공통 상태 메시지 */}
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

      {/* Map 패널 레이아웃 */}
      <div className="map-mode-body">
        <div
          className="map-archive-layout"
          data-mobile-view={mobileMapView}
          data-mode={activeMapMode}
        >
        <aside className="map-control-panel">
          {/* 탐색 모드 */}
          {activeMapMode === 'explore' ? (
            <MapExplorePanel
              activeRecordId={visibleActiveRecordId}
              collections={collections}
              filteredEmptyMessage={filteredEmptyMessage}
              filteredRecords={filteredRecords}
              mapSearchQuery={mapSearchQuery}
              onSelectRecord={handleSelectRecordFromList}
              onSetCollectionFilter={setSelectedCollectionFilter}
              onSetLocationSourceFilter={setSelectedLocationSourceFilter}
              onSetSearchQuery={setMapSearchQuery}
              selectedCollectionFilter={selectedCollectionFilter}
              selectedLocationSourceFilter={selectedLocationSourceFilter}
              t={t}
            />
          ) : null}

          {/* 업로드 모드 */}
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
              onOpenPhoto={setPhotoViewer}
              onPhotoChange={handlePhotoChange}
              onResetBulkUpload={resetBulkUpload}
              onSaveBulkLocatedPhotos={handleSaveBulkLocatedPhotos}
              onSaveDraft={handleSaveDraft}
              onSelectAllBulkLocationTargets={handleSelectAllBulkLocationTargets}
              onSelectBulkPlace={handleSelectBulkPlace}
              onSelectPlace={handleSelectPlace}
              onToggleAddPhoto={handleToggleAddPhoto}
              onToggleBulkLocationTarget={handleToggleBulkLocationTarget}
              photoInputRef={photoInputRef}
              selectedMissingLocationItemIds={selectedMissingLocationItemIds}
              t={t}
            />
          ) : null}

          {/* 컬렉션 관리 모드 */}
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

        <section
          className={`map-view-panel ${
            activeMapMode === 'explore' && activeRecord && !editDraft
              ? 'has-mobile-preview'
              : ''
          }`}
          aria-label={t.map.mapLabel}
        >
          {/* 전체 위치 보기 */}
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
              layoutKey={mobileMapView}
              request={viewportRequest}
              records={filteredRecords}
              shouldFitBounds={shouldFitBounds}
              target={focusTarget}
            />
            <MapResizeController watchValue={`${activeMapMode}-${mobileMapView}`} />
            <ManualLocationPicker
              disabled={!canPickLocation}
              onPickLocation={handlePickLocation}
            />

            {filteredRecords.map((record) => (
              <PhotoRecordMarker
                icon={markerIcon}
                isActive={visibleActiveRecordId === record.id}
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
              // bulk 임시 위치
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
          {activeMapMode === 'explore' && !editDraft ? (
            <MobileMapPreviewCard
              collectionName={
                activeRecord
                  ? getCollectionName(activeRecord.collectionId, collections, t)
                  : ''
              }
              onOpenDetail={() => handleChangeMobileMapView('detail')}
              record={activeRecord}
              t={t}
            />
          ) : null}
          {activeMapMode === 'explore' &&
          filteredRecords.length === 0 &&
          !activeRecord &&
          !draft &&
          !editDraft ? (
            <MobileMapEmptyCard
              onOpenList={() => handleChangeMobileMapView('list')}
              t={t}
            />
          ) : null}
        </section>

        {/* 상세 패널 */}
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
                onOpenPhoto={setPhotoViewer}
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
                onOpenPhoto={setPhotoViewer}
                onStartEdit={handleStartEdit}
                record={activeRecord}
                t={t}
              />
            )}
          </aside>
        ) : null}
        </div>
      </div>
      <PhotoLightbox
        photo={photoViewer}
        onClose={() => setPhotoViewer(null)}
        t={t}
      />
    </section>
  )
}

export default Map
