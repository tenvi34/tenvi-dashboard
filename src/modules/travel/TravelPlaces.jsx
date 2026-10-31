import { useRef, useState } from 'react'
import { searchPlaces } from '../../services/placeSearchService.js'
import MoreActions from '../../components/MoreActions.jsx'
import TravelEditorPanel from './TravelEditorPanel.jsx'
import { paginateTravelPlaces } from './travelViewLogic.js'
import TravelFields from './TravelFields.jsx'
import TravelAddressPaste from './TravelAddressPaste.jsx'
import TravelGoogleMapsLink from './TravelGoogleMapsLink.jsx'
import { forgetTravelDraft } from './travelDrafts.js'
import { TravelLocationPicker } from './TravelMap.jsx'
import {
  createTravelId,
  hasPlaceLocation,
  PLACE_CATEGORIES,
  PLACE_PRIORITIES,
  removeTravelPlace,
} from './travelLogic.js'

// 검색 provider의 분류는 보조값이며 사용자가 언제든 카테고리 수정 가능
const searchCategory = (result) => {
  if (['hotel', 'hostel', 'guest_house', 'motel', 'apartment'].includes(result.type)) {
    return 'lodging'
  }

  if (['restaurant', 'fast_food', 'food_court'].includes(result.type)) {
    return 'restaurant'
  }

  if (result.type === 'cafe') {
    return 'cafe'
  }

  if (result.category === 'shop') {
    return 'shopping'
  }

  return result.category === 'tourism' ? 'sightseeing' : 'other'
}

function PlaceLocation({ draft, change, commit, t, language, region }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchState, setSearchState] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const searching = useRef(false)

  const search = async () => {
    if (searching.current || !query.trim()) {
      return
    }

    searching.current = true
    setSearchState('searching')
    setResults([])

    try {
      const found = await searchPlaces(query, { language })
      setResults(found)
      setSearchState(found.length ? '' : 'noResults')
    } catch {
      setSearchState('searchError')
    } finally {
      searching.current = false
    }
  }

  return (
    <div className="travel-location">
      <p>{t.searchHint}</p>
      <div className="travel-toolbar">
        <label>
          {t.searchQuery}
          <input
            value={query}
            maxLength={300}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                search()
              }
            }}
          />
        </label>
        <TravelGoogleMapsLink
          query={query.trim() ? [query.trim(), region].filter(Boolean).join(' ') : ''}
          place={draft}
          region={region}
          t={t}
          search
        />
        <button
          type="button"
          disabled={!query.trim() || searchState === 'searching'}
          onClick={search}
        >
          {searchState === 'searching' ? t.searching : t.search}
        </button>
      </div>
      <small>{t.googleMapsHint}</small>
      {searchState && <p role="status">{t[searchState]}</p>}
      {results.length > 0 && (
        <ul className="travel-search-results">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => {
                  commit({
                    name: result.name.slice(0, 200),
                    address: result.displayName.slice(0, 1000),
                    region: result.addressSummary.slice(0, 300),
                    category: searchCategory(result),
                    latitude: result.latitude,
                    longitude: result.longitude,
                    provider: result.provider,
                    providerPlaceId: result.id,
                  })
                  setResults([])
                  setShowPicker(false)
                }}
              >
                <strong>{result.name}</strong>
                <small>{result.displayName}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <small>
        ©{' '}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap
        </a>{' '}
        ·{' '}
        <a
          href="https://operations.osmfoundation.org/policies/nominatim/"
          target="_blank"
          rel="noreferrer"
        >
          Nominatim
        </a>
      </small>
      <div className="travel-actions">
        <span>{hasPlaceLocation(draft) ? t.locationSet : t.noLocation}</span>
        <button
          type="button"
          aria-expanded={showPicker}
          onClick={() => setShowPicker((value) => !value)}
        >
          {t.pickLocation}
        </button>
        {hasPlaceLocation(draft) && (
          <button
            type="button"
            onClick={() =>
              commit({ latitude: null, longitude: null, provider: '', providerPlaceId: '' })
            }
          >
            {t.clearLocation}
          </button>
        )}
      </div>
      {showPicker && (
        <TravelLocationPicker
          location={draft}
          onPick={(location) => {
            change(location)
            commit(location)
          }}
          t={t}
        />
      )}
    </div>
  )
}

export function TravelPlaceEditor({
  place,
  category = 'other',
  data,
  update,
  onCreated,
  t,
  language,
}) {
  const initial = place || {
    name: '',
    region: '',
    address: '',
    memo: '',
    category,
    priority: 'prefer',
    onHold: false,
    latitude: null,
    longitude: null,
    provider: '',
    providerPlaceId: '',
  }
  const fields = [
    { key: 'name', label: t.name, required: true, maxLength: 200, pattern: '.*\\S.*' },
    {
      key: 'category',
      label: t.category,
      options: PLACE_CATEGORIES.map((key) => [key, t.categories[key]]),
    },
    {
      key: 'priority',
      label: t.priority,
      options: PLACE_PRIORITIES.map((key) => [key, t.priorities[key]]),
    },
    { key: 'region', label: t.region, maxLength: 300 },
    { key: 'address', label: t.address, maxLength: 1000 },
    { key: 'memo', label: t.memo, type: 'textarea' },
  ]

  const save = async (draft, changes) => {
    const placeId = place?.id || createTravelId()
    const record = { ...draft, id: placeId, tripId: data.trip.id, name: draft.name.trim() }
    const result = await update((current) => {
      if (place && !current.places.some((item) => item.id === place.id)) {
        throw new Error('invalidData')
      }

      return {
        ...current,
        places: place
          ? current.places.map((item) => (item.id === place.id ? { ...item, ...changes } : item))
          : [...current.places, record],
        settings: {
          ...current.settings,
          lodgingPlaceId:
            current.settings.lodgingPlaceId === placeId &&
            changes.category &&
            changes.category !== 'lodging'
              ? null
              : !place && category === 'lodging' && record.category === 'lodging'
                ? placeId
                : current.settings.lodgingPlaceId,
        },
      }
    })

    if (result && !place) {
      onCreated?.()
    }

    return result
  }

  return (
    <TravelFields
      initial={initial}
      fields={fields}
      onSave={save}
      autoSave={!!place}
      draftKey={place ? `place:${place.id}` : undefined}
      t={t}
      submitLabel={place ? t.saveChanges : t.newPlace}
      beforeComponent={TravelAddressPaste}
      extraComponent={PlaceLocation}
      extraProps={{ t, language, region: data.trip.region }}
    />
  )
}

// 컴팩트 목록과 선택 상세를 분리하여 필터/페이지를 바꿔도 긴 카드 반복 방지
export default function TravelPlaces({
  data,
  update,
  t,
  language,
  startCreating = false,
  onSchedulePlace,
}) {
  const [editor, setEditor] = useState(startCreating ? 'new' : null)
  const [selectedId, setSelectedId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  const showDetails = (id) => {
    setSelectedId(id)

    if (window.matchMedia('(max-width: 860px)').matches) {
      setPreviewOpen(true)
    }
  }

  const editSelected = (id) => {
    setPreviewOpen(false)
    setEditor(id)
  }

  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [requestedPage, setPage] = useState(1)
  const { items, total, page, pages } = paginateTravelPlaces(data, {
    filter,
    query,
    page: requestedPage,
  })
  const selected = items.find((place) => place.id === selectedId) || items[0]
  const editingPlace = data.places.find((place) => place.id === editor)
  const scheduledIds = new Set(data.schedules.map((item) => item.placeId))

  const closeEditor = () => setEditor(null)

  // 같은 상세 내용을 데스크톱은 우측 패널, 모바일은 접근성 dialog로 제공
  const details = (
    <>
      {selected ? (
        <>
          <div className="travel-inspector-heading">
            <div>
              <p className="travel-eyebrow">{t.placeDetails}</p>
              <h3>{selected.name}</h3>
            </div>
            <span className="travel-badge">{t.categories[selected.category]}</span>
          </div>
          <div className="travel-actions">
            <span className="travel-badge">{t.priorities[selected.priority]}</span>
            <small>{hasPlaceLocation(selected) ? t.locationSet : t.noLocation}</small>
          </div>
          <dl className="travel-detail-list">
            <div>
              <dt>{t.region}</dt>
              <dd>{selected.region || '—'}</dd>
            </div>
            <div>
              <dt>{t.address}</dt>
              <dd>{selected.address || '—'}</dd>
            </div>
          </dl>
          {selected.memo && <p className="travel-memo travel-inspector-memo">{selected.memo}</p>}
          <div className="travel-inspector-actions">
            <button
              className="travel-primary"
              type="button"
              onClick={() => editSelected(selected.id)}
            >
              {t.editPlace}
            </button>
            <button
              type="button"
              onClick={() => onSchedulePlace(selected.id)}
            >
              {t.addToItinerary}
            </button>
          </div>
          <TravelGoogleMapsLink
            place={selected}
            region={data.trip.region}
            t={t}
          />
          <MoreActions label={t.moreActions}>
            <button
              type="button"
              onClick={() =>
                update((current) => ({
                  ...current,
                  places: current.places.map((item) =>
                    item.id === selected.id ? { ...item, onHold: !item.onHold } : item,
                  ),
                }))
              }
            >
              {selected.onHold ? t.resume : t.onHold}
            </button>
            <button
              type="button"
              className="travel-danger"
              onClick={async () => {
                if (window.confirm(t.deletePlaceConfirm)) {
                  const result = await update((current) => removeTravelPlace(current, selected.id))

                  if (result) {
                    forgetTravelDraft(`place:${selected.id}`)
                  }
                }
              }}
            >
              {t.delete}
            </button>
          </MoreActions>
        </>
      ) : (
        <p className="travel-inspector-empty">{t.selectPlaceHint}</p>
      )}
    </>
  )

  return (
    <section className="travel-section">
      <div className="travel-list-toolbar">
        <label className="travel-search-field">
          {t.placeQuery}
          <input
            type="search"
            value={query}
            placeholder={t.placeSearchHint}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
        </label>
        <label>
          {t.filter}
          <select
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value)
              setPage(1)
            }}
          >
            {['all', 'scheduled', 'unscheduled', 'onHold', ...PLACE_CATEGORIES].map((key) => (
              <option
                key={key}
                value={key}
              >
                {t.categories[key] || t[key]}
              </option>
            ))}
          </select>
        </label>
        <span className="travel-result-count">{t.placeCount(total)}</span>
      </div>
      <div className="travel-split-view">
        <div className="travel-list-surface">
          <div className="travel-list-caption">
            <strong>{t.placeLibrary}</strong>
            <span>{t.listEditHint}</span>
          </div>
          {!total && (
            <p className="travel-empty">{data.places.length ? t.noResults : t.noPlaces}</p>
          )}
          <ul className="travel-compact-list">
            {items.map((place) => (
              <li
                key={place.id}
                className={`travel-compact-row ${selected?.id === place.id ? 'is-selected' : ''}`}
              >
                <button
                  className="travel-row-main"
                  type="button"
                  aria-pressed={selected?.id === place.id}
                  onClick={() => showDetails(place.id)}
                >
                  <strong>{place.name}</strong>
                  <span>
                    {t.categories[place.category]} ·{' '}
                    {place.region || place.address || t.regionUnknown}
                  </span>
                  <small>
                    {scheduledIds.has(place.id) ? t.scheduled : t.unscheduled}
                    {place.onHold ? ` · ${t.onHold}` : ''}
                  </small>
                </button>
                <button
                  className="travel-row-edit"
                  type="button"
                  aria-label={t.editNamed(place.name)}
                  onClick={() => {
                    setSelectedId(place.id)
                    editSelected(place.id)
                  }}
                >
                  {t.edit}
                </button>
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav
              className="travel-pagination"
              aria-label={t.pagination}
            >
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                {t.previous}
              </button>
              <span>{t.pageOf(page, pages)}</span>
              <button
                type="button"
                disabled={page === pages}
                onClick={() => setPage(page + 1)}
              >
                {t.next}
              </button>
            </nav>
          )}
        </div>
        <aside
          className="travel-inspector travel-surface"
          aria-label={t.placeDetails}
        >
          {details}
        </aside>
      </div>
      {(editor === 'new' || editingPlace) && (
        <TravelEditorPanel
          title={editingPlace ? t.editPlace : t.newPlace}
          t={t}
          onClose={closeEditor}
        >
          <TravelPlaceEditor
            key={editor}
            place={editingPlace}
            data={data}
            update={update}
            onCreated={closeEditor}
            t={t}
            language={language}
          />
        </TravelEditorPanel>
      )}
      {previewOpen && (
        <TravelEditorPanel
          description={t.previewHint}
          title={t.placeDetails}
          t={t}
          onClose={() => setPreviewOpen(false)}
        >
          {details}
        </TravelEditorPanel>
      )}
    </section>
  )
}
