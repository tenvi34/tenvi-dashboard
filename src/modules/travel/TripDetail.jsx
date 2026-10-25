import { useRef, useState } from 'react'
import TravelPlaces, { TravelPlaceEditor } from './TravelPlaces.jsx'
import TravelSchedule from './TravelSchedule.jsx'
import TravelMap from './TravelMap.jsx'
import TripEditor from './TripEditor.jsx'
import TravelEditorPanel from './TravelEditorPanel.jsx'
import { getDaySchedules, getTravelDayCount, getTravelDayDate } from './travelLogic.js'

// 탭을 오가도 선택 DAY 유지. 등록 버튼은 해당 작업 탭과 편집기를 함께 열기
export default function TripDetail({ data, update, t, language }) {
  const [tab, setTab] = useState('schedule')
  const [day, setDay] = useState(1)
  const [action, setAction] = useState(null)
  const requestId = useRef(0)
  const [newLodging, setNewLodging] = useState(false)
  const lodging = data.places.find((place) => place.id === data.settings.lodgingPlaceId)
  const days = getTravelDayCount(data)
  const switchTab = (next) => { setTab(next); setAction(null) }
  const start = (kind, placeId = '') => {
    setTab(kind === 'place' ? 'places' : 'schedule')
    setAction({ kind, placeId, token: ++requestId.current })
  }
  return <div className="travel-detail">
    <div className="travel-commandbar">
      <nav className="travel-tabs" aria-label={t.title}>
        {['schedule', 'places', 'map', 'overview', 'info'].map((id) => <button key={id} type="button"
          className={tab === id ? 'is-active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => switchTab(id)}>{t.tabs[id]}</button>)}
      </nav>
      <div className="travel-quick-create">
        <button type="button" onClick={() => start('place')}>+ {t.newPlace}</button>
        <button className="travel-primary" type="button" onClick={() => start('schedule')}>+ {t.newSchedule}</button>
      </div>
    </div>
    {tab === 'schedule' && <TravelSchedule key={action?.token || 'schedule'} data={data} day={day} onDayChange={setDay}
      startCreating={action?.kind === 'schedule'} initialPlaceId={action?.placeId} update={update} t={t} />}
    {tab === 'places' && <TravelPlaces key={action?.token || 'places'} data={data} startCreating={action?.kind === 'place'}
      update={update} t={t} language={language} onSchedulePlace={(id) => start('schedule', id)} />}
    {tab === 'map' && <TravelMap data={data} t={t} />}
    {tab === 'overview' && <section className="travel-section">
      <div className="travel-overview-stats">
        {[[t.overviewPlaces, data.places.length, 'places'], [t.overviewSchedules, data.schedules.length, 'schedule'], [t.overviewDays, days, 'schedule']].map(([label, count, target]) =>
          <button type="button" key={label} onClick={() => switchTab(target)}><strong>{count}</strong><span>{label}</span></button>)}
      </div>
      <div className="travel-overview-grid">
        <section className="travel-surface"><h3>{t.dayOverview}</h3><div className="travel-day-overview">
          {Array.from({ length: Math.min(days, 7) }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => { setDay(value); switchTab('schedule') }}>
            <strong>DAY {value}</strong><span>{getTravelDayDate(data.trip, value) || t.datesUnknown}</span><small>{t.scheduleCount(getDaySchedules(data, value).length)} →</small>
          </button>)}
          {days > 7 && <button type="button" onClick={() => switchTab('schedule')}>{t.allDays} →</button>}
        </div></section>
        <section className="travel-surface"><h3>{t.lodging}</h3><p>{lodging?.name || t.noLodging}</p><small>{lodging?.address}</small>
          <button type="button" onClick={() => switchTab('info')}>{t.editLodging}</button>
          {data.trip.memo && <details className="travel-disclosure"><summary>{t.memo}</summary><p className="travel-memo">{data.trip.memo}</p></details>}
        </section>
      </div>
    </section>}
    {tab === 'info' && <section className="travel-overview-grid">
      <section className="travel-surface"><h3>{t.editTrip}</h3>
        <TripEditor trip={data.trip} t={t} onSave={(_draft, changes) => update((current) => ({ ...current, trip: { ...current.trip, ...changes } }))} />
      </section>
      <section className="travel-surface"><h3>{t.lodging}</h3><p>{t.lodgingHint}</p>
        <label>{t.lodgingSelect}<select value={data.settings.lodgingPlaceId || ''} onChange={(event) => {
          const lodgingPlaceId = event.target.value || null
          update((current) => ({ ...current, settings: { ...current.settings, lodgingPlaceId } }))
        }}><option value="">{t.noLodging}</option>{data.places.filter((place) => place.category === 'lodging').map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <p>{lodging?.address}</p><button type="button" onClick={() => setNewLodging(true)}>+ {t.registerLodging}</button>
      </section>
      {newLodging && <TravelEditorPanel title={t.registerLodging} t={t} onClose={() => setNewLodging(false)}>
        <TravelPlaceEditor data={data} update={update} category="lodging" onCreated={() => setNewLodging(false)} t={t} language={language} />
      </TravelEditorPanel>}
    </section>}
  </div>
}
