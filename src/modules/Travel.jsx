import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TravelFields from './travel/TravelFields.jsx'
import TravelPlaces, { TravelPlaceEditor } from './travel/TravelPlaces.jsx'
import TravelSchedule from './travel/TravelSchedule.jsx'
import TravelMap from './travel/TravelMap.jsx'
import useTravel from './travel/useTravel.js'
import { forgetTravelDraft } from './travel/travelDrafts.js'
import { cloneTravelData, createTripData, exportTravelJson, getTravelDayCount, importTravelJson, tripDateError } from './travel/travelLogic.js'
import './Travel.css'

function TripEditor({ trip, onSave, t }) {
  const fields = [
    { key: 'name', label: t.name, required: true, maxLength: 200, pattern: '.*\\S.*' },
    { key: 'region', label: t.region, maxLength: 300 },
    { key: 'startDate', label: t.startDate, type: 'date', min: '0001-01-01', max: '9999-12-31' },
    { key: 'endDate', label: t.endDate, type: 'date', min: '0001-01-01', max: '9999-12-31' },
    ...(trip ? [{ key: 'status', label: t.status, options: [['planning', t.planning], ['completed', t.completed]] }, { key: 'memo', label: t.memo, type: 'textarea' }] : []),
  ]
  return <TravelFields initial={trip || { name: '', region: '', startDate: '', endDate: '' }} fields={fields}
    t={t} autoSave={!!trip} draftKey={trip ? `trip:${trip.id}` : undefined} validate={tripDateError} onSave={onSave} />
}

function TripDetail({ data, update, t, language }) {
  const [tab, setTab] = useState('overview')
  const [newLodging, setNewLodging] = useState(false)
  const lodging = data.places.find((place) => place.id === data.settings.lodgingPlaceId)
  const dates = data.trip.startDate || data.trip.endDate
    ? `${data.trip.startDate || t.datesUnknown} ~ ${data.trip.endDate || t.datesUnknown}` : t.datesUnknown
  return <>
    <div className="travel-card-heading"><div><h2>{data.trip.name}</h2><p>{data.trip.region} · {dates}</p></div><span className="travel-badge">{t[data.trip.status]}</span></div>
    <nav className="travel-tabs" aria-label={t.title}>{Object.entries(t.tabs).map(([key, label]) =>
      <button key={key} type="button" aria-current={tab === key ? 'page' : undefined} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav>
    {tab === 'overview' && <section className="travel-section">
      <div className="travel-metrics">{[[t.overviewPlaces, data.places.length, 'places'], [t.overviewSchedules, data.schedules.length, 'schedule'], [t.overviewDays, getTravelDayCount(data), 'schedule']].map(([label, count, target]) =>
        <button type="button" key={label} onClick={() => setTab(target)}><strong>{count}</strong><span>{label}</span></button>)}</div>
      <div className="travel-card"><h3>{t.lodging}</h3><p>{lodging?.name || t.noLodging}</p><p>{lodging?.address}</p><button type="button" onClick={() => setTab('info')}>{t.edit}</button></div>
      {data.trip.memo && <p className="travel-memo">{data.trip.memo}</p>}
      <div className="travel-actions"><button type="button" onClick={() => setTab('places')}>{t.newPlace}</button><button type="button" onClick={() => setTab('schedule')}>{t.newSchedule}</button></div>
    </section>}
    {tab === 'places' && <TravelPlaces data={data} update={update} t={t} language={language} />}
    {tab === 'schedule' && <TravelSchedule data={data} update={update} t={t} />}
    {tab === 'map' && <TravelMap data={data} t={t} />}
    {tab === 'info' && <section className="travel-section">
      <TripEditor trip={data.trip} t={t} onSave={(_draft, changes) => update((current) => ({ ...current, trip: { ...current.trip, ...changes } }))} />
      <div className="travel-card"><h3>{t.lodging}</h3><p>{t.lodgingHint}</p>
        <label>{t.lodgingSelect}<select value={data.settings.lodgingPlaceId || ''} onChange={(event) => {
          const lodgingPlaceId = event.target.value || null
          update((current) => ({ ...current, settings: { ...current.settings, lodgingPlaceId } }))
        }}><option value="">{t.noLodging}</option>{data.places.filter((place) => place.category === 'lodging').map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <p>{lodging?.address}</p>
        <button type="button" onClick={() => setNewLodging((value) => !value)}>{newLodging ? t.cancel : t.registerLodging}</button>
        {newLodging && <TravelPlaceEditor data={data} update={update} category="lodging" onCreated={() => setNewLodging(false)} t={t} language={language} />}
      </div>
    </section>}
  </>
}

export default function Travel({ t: translations, language }) {
  const t = translations.travel
  const { tripId } = useParams()
  const navigate = useNavigate()
  const state = useTravel()
  const [editor, setEditor] = useState(null)
  const [fileError, setFileError] = useState('')
  const data = state.trips.find((entry) => entry.trip.id === tripId)
  const update = (updater) => state.update(tripId, updater)

  // 단일 여행 백업. 내보낸 파일을 가져와도 기존 여행 덮어쓰기 없음
  const download = (record) => {
    const url = URL.createObjectURL(new Blob([exportTravelJson(record)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    const fileName = Array.from(record.trip.name).map((character) => character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character).join('')
    link.download = `${fileName.slice(0, 100) || 'travel'}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const importFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileError('')
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('invalidData')
      const imported = importTravelJson(await file.text())
      const result = await state.add(imported)
      if (result) navigate(`/travel/${result.trip.id}`)
    } catch { setFileError('invalidData') }
  }
  const remove = async (record) => {
    if (!window.confirm(t.deleteTripConfirm)) return
    const result = await state.remove(record.trip.id)
    if (result) {
      forgetTravelDraft(`trip:${record.trip.id}`)
      record.places.forEach((place) => forgetTravelDraft(`place:${place.id}`))
      record.schedules.forEach((item) => forgetTravelDraft(`schedule:${item.id}`))
    }
    if (result && tripId === record.trip.id) navigate('/travel')
  }
  const duplicate = async (record) => {
    const result = await state.add(cloneTravelData(record, `${record.trip.name.slice(0, 180)}${t.copySuffix}`))
    if (result) navigate(`/travel/${result.trip.id}`)
  }
  if (state.loading) return <section className="travel-module"><p role="status">{t.loading}</p></section>
  return <section className="travel-module" aria-label={t.title}>
    <header className="travel-header"><div><p className="module-label">TRAVEL</p><h1>{t.title}</h1><p>{t.description}</p></div>
      <span role="status" aria-live="polite">{state.pending ? t.saving : state.saved && !state.error ? t.saved : ''}</span>
    </header>
    {state.error && <div className="travel-error" role="alert">{t[state.error]}
      {(state.error === 'loadError' || state.error === 'tripMissing') && <button type="button" onClick={state.refresh}>{t.retry}</button>}</div>}
    {fileError && <p className="travel-error" role="alert">{t[fileError]}</p>}
    <div className="travel-toolbar">
      {tripId ? <button type="button" onClick={() => navigate('/travel')}>← {t.back}</button> : <button type="button" onClick={() => setEditor('new')} disabled={state.error === 'loadError'}>{t.newTrip}</button>}
      <label className="travel-file-button">{t.import}<input type="file" accept=".json,application/json" onChange={importFile} disabled={!!state.pending || state.error === 'loadError'} /></label>
      {data && <><button type="button" onClick={() => download(data)} disabled={!!state.pending}>{t.export}</button>
        <button type="button" onClick={() => duplicate(data)} disabled={!!state.pending}>{t.duplicate}</button>
        <button type="button" className="travel-danger" onClick={() => remove(data)} disabled={!!state.pending}>{t.delete}</button></>}
    </div>
    <small>{t.importHint}</small>
    {tripId ? data ? <TripDetail key={tripId} data={data} update={update} t={t} language={language} /> : <p>{t.tripMissing}</p> : <>
      {editor === 'new' && <div className="travel-card"><h2>{t.newTrip}</h2><TripEditor t={t} onSave={async (draft) => {
        const result = await state.add(createTripData(draft))
        if (result) { setEditor(null); navigate(`/travel/${result.trip.id}`) }
        return result
      }} /><button type="button" onClick={() => setEditor(null)}>{t.cancel}</button></div>}
      {!state.trips.length && !state.error && <p className="travel-empty">{t.noTrips}</p>}
      <div className="travel-card-grid">{state.trips.map((record) => <article key={record.trip.id} className="travel-card">
        <div className="travel-card-heading"><h2>{record.trip.name}</h2><span className="travel-badge">{t[record.trip.status]}</span></div>
        <p>{record.trip.region}</p><p>{record.trip.startDate || t.datesUnknown} ~ {record.trip.endDate || t.datesUnknown}</p>
        {editor === record.trip.id ? <><TripEditor trip={record.trip} t={t} onSave={(_draft, changes) => state.update(record.trip.id, (current) => ({ ...current, trip: { ...current.trip, ...changes } }))} />
          <button type="button" onClick={() => setEditor(null)}>{t.cancel}</button></> : <div className="travel-actions">
          <button type="button" onClick={() => navigate(`/travel/${record.trip.id}`)}>{t.open}</button>
          <button type="button" onClick={() => setEditor(record.trip.id)}>{t.edit}</button>
          <button type="button" disabled={!!state.pending} onClick={() => duplicate(record)}>{t.duplicate}</button>
          <button type="button" onClick={() => download(record)} disabled={!!state.pending}>{t.export}</button>
          <button type="button" disabled={!!state.pending} className="travel-danger" onClick={() => remove(record)}>{t.delete}</button>
        </div>}
      </article>)}</div>
    </>}
    <p className="travel-footnote">{t.localNote}</p>
  </section>
}
