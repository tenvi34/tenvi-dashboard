import { useRef, useState } from 'react'
import { searchPlaces } from '../../services/placeSearchService.js'
import TravelFields from './TravelFields.jsx'
import { forgetTravelDraft } from './travelDrafts.js'
import { TravelLocationPicker } from './TravelMap.jsx'
import { createTravelId, filterTravelPlaces, hasPlaceLocation, PLACE_CATEGORIES, PLACE_PRIORITIES, removeTravelPlace } from './travelLogic.js'

// 검색 provider의 분류는 보조값이며 사용자가 언제든 카테고리 수정 가능
const searchCategory = (result) => {
  if (['hotel', 'hostel', 'guest_house', 'motel', 'apartment'].includes(result.type)) return 'lodging'
  if (['restaurant', 'fast_food', 'food_court'].includes(result.type)) return 'restaurant'
  if (result.type === 'cafe') return 'cafe'
  if (result.category === 'shop') return 'shopping'
  return result.category === 'tourism' ? 'sightseeing' : 'other'
}

function PlaceLocation({ draft, change, commit, t, language }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchState, setSearchState] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const searching = useRef(false)
  const search = async () => {
    if (searching.current || !query.trim()) return
    searching.current = true
    setSearchState('searching')
    setResults([])
    try {
      const found = await searchPlaces(query, { language })
      setResults(found)
      setSearchState(found.length ? '' : 'noResults')
    } catch { setSearchState('searchError') }
    finally { searching.current = false }
  }
  return <div className="travel-location">
    <p>{t.searchHint}</p>
    <div className="travel-toolbar">
      <label>{t.searchQuery}<input value={query} maxLength={300} onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search() } }} /></label>
      <button type="button" disabled={!query.trim() || searchState === 'searching'} onClick={search}>{searchState === 'searching' ? t.searching : t.search}</button>
    </div>
    {searchState && <p role="status">{t[searchState]}</p>}
    {results.length > 0 && <ul className="travel-search-results">{results.map((result) => <li key={result.id}>
      <button type="button" onClick={() => {
        commit({ name: result.name.slice(0, 200), address: result.displayName.slice(0, 1000),
          region: result.addressSummary.slice(0, 300), category: searchCategory(result),
          latitude: result.latitude, longitude: result.longitude, provider: result.provider, providerPlaceId: result.id })
        setResults([])
        setShowPicker(false)
      }}><strong>{result.name}</strong><small>{result.displayName}</small></button>
    </li>)}</ul>}
    <small>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> · <a href="https://operations.osmfoundation.org/policies/nominatim/" target="_blank" rel="noreferrer">Nominatim</a></small>
    <div className="travel-actions">
      <span>{hasPlaceLocation(draft) ? t.locationSet : t.noLocation}</span>
      <button type="button" aria-expanded={showPicker} onClick={() => setShowPicker((value) => !value)}>{t.pickLocation}</button>
      {hasPlaceLocation(draft) && <button type="button" onClick={() => commit({ latitude: null, longitude: null, provider: '', providerPlaceId: '' })}>{t.clearLocation}</button>}
    </div>
    {showPicker && <TravelLocationPicker location={draft} onPick={(location) => { change(location); commit(location) }} t={t} />}
  </div>
}

export function TravelPlaceEditor({ place, category = 'other', data, update, onCreated, t, language }) {
  const initial = place || { name: '', region: '', address: '', memo: '', category, priority: 'prefer', onHold: false,
    latitude: null, longitude: null, provider: '', providerPlaceId: '' }
  const fields = [
    { key: 'name', label: t.name, required: true, maxLength: 200, pattern: '.*\\S.*' },
    { key: 'category', label: t.category, options: PLACE_CATEGORIES.map((key) => [key, t.categories[key]]) },
    { key: 'priority', label: t.priority, options: PLACE_PRIORITIES.map((key) => [key, t.priorities[key]]) },
    { key: 'region', label: t.region, maxLength: 300 }, { key: 'address', label: t.address, maxLength: 1000 },
    { key: 'memo', label: t.memo, type: 'textarea' },
  ]
  const save = async (draft, changes) => {
    const placeId = place?.id || createTravelId()
    const record = { ...draft, id: placeId, tripId: data.trip.id, name: draft.name.trim() }
    const result = await update((current) => {
      if (place && !current.places.some((item) => item.id === place.id)) throw new Error('invalidData')
      return { ...current,
        places: place ? current.places.map((item) => item.id === place.id ? { ...item, ...changes } : item) : [...current.places, record],
        settings: { ...current.settings, lodgingPlaceId:
          current.settings.lodgingPlaceId === placeId && changes.category && changes.category !== 'lodging' ? null
            : !place && category === 'lodging' && record.category === 'lodging' ? placeId : current.settings.lodgingPlaceId },
      }
    })
    if (result && !place) onCreated?.()
    return result
  }
  return <TravelFields initial={initial} fields={fields} onSave={save} autoSave={!!place} draftKey={place ? `place:${place.id}` : undefined} t={t}
    extraComponent={PlaceLocation} extraProps={{ t, language }} />
}

export default function TravelPlaces({ data, update, t, language }) {
  const [editor, setEditor] = useState(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const places = filterTravelPlaces(data, filter).filter((place) => `${place.name} ${place.region} ${place.memo}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const scheduledIds = new Set(data.schedules.map((item) => item.placeId))
  return <section className="travel-section">
    <div className="travel-toolbar">
      <button type="button" onClick={() => setEditor('new')}>{t.newPlace}</button>
      <label>{t.filter}<select value={filter} onChange={(event) => setFilter(event.target.value)}>
        {['all', 'scheduled', 'unscheduled', 'onHold', ...PLACE_CATEGORIES].map((key) => <option key={key} value={key}>{t.categories[key] || t[key]}</option>)}
      </select></label>
      <label>{t.placeQuery}<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
    </div>
    {editor === 'new' && <div className="travel-card"><h3>{t.newPlace}</h3>
      <TravelPlaceEditor data={data} update={update} onCreated={() => setEditor(null)} t={t} language={language} />
      <button type="button" onClick={() => setEditor(null)}>{t.cancel}</button>
    </div>}
    {!data.places.length && <p className="travel-empty">{t.noPlaces}</p>}
    {!!data.places.length && !places.length && <p>{t.noResults}</p>}
    <div className="travel-card-grid">{places.map((place) => <article className="travel-card" key={place.id}>
      <div className="travel-card-heading"><h3>{place.name}</h3><span className="travel-badge">{t.categories[place.category]}</span></div>
      <p>{place.region || place.address}</p>
      <div className="travel-actions"><span className="travel-badge">{t.priorities[place.priority]}</span>
        <span>{scheduledIds.has(place.id) ? t.scheduled : t.unscheduled}</span>{place.onHold && <span className="travel-badge">{t.onHold}</span>}</div>
      {place.memo && <p className="travel-memo">{place.memo}</p>}
      {editor === place.id ? <>
        <TravelPlaceEditor place={place} data={data} update={update} t={t} language={language} />
        <button type="button" onClick={() => setEditor(null)}>{t.cancel}</button>
      </> : <div className="travel-actions">
        <button type="button" onClick={() => setEditor(place.id)}>{t.edit}</button>
        <button type="button" onClick={() => update((current) => ({ ...current, places: current.places.map((item) => item.id === place.id ? { ...item, onHold: !item.onHold } : item) }))}>{place.onHold ? t.resume : t.onHold}</button>
        <button type="button" className="travel-danger" onClick={async () => { if (window.confirm(t.deletePlaceConfirm)) {
          const result = await update((current) => removeTravelPlace(current, place.id))
          if (result) forgetTravelDraft(`place:${place.id}`)
        } }}>{t.delete}</button>
      </div>}
    </article>)}</div>
  </section>
}
