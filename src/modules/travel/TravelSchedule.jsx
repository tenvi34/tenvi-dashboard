import { useState } from 'react'
import TravelGoogleMapsLink from './TravelGoogleMapsLink.jsx'
import TravelEditorPanel from './TravelEditorPanel.jsx'
import { visibleTravelDays } from './travelViewLogic.js'
import TravelFields from './TravelFields.jsx'
import { forgetTravelDraft } from './travelDrafts.js'
import { createTravelId, getDaySchedules, getTravelDayCount, getTravelDayDate, MAX_TRAVEL_DAYS, moveTravelSchedule, tripDateCount } from './travelLogic.js'

function ScheduleEditor({ item, data, day, update, onCreated, initialPlaceId = '', t }) {
  const initial = item || { title: '', placeId: initialPlaceId, startTime: '', durationMinutes: '', memo: '' }
  const fields = [
    { key: 'title', label: t.scheduleTitle, maxLength: 200 },
    { key: 'placeId', label: t.place, options: [['', t.undecided], ...data.places.map((place) => [place.id, `${place.name}${place.onHold ? ` (${t.onHold})` : ''}`])] },
    { key: 'startTime', label: t.startTime, type: 'time' },
    { key: 'durationMinutes', label: t.durationMinutes, type: 'number', min: 0, max: 10080, step: 1 },
    { key: 'memo', label: t.memo, type: 'textarea', rows: 7 },
  ]
  const save = async (draft, changes) => {
    const patch = { title: draft.title, placeId: draft.placeId || null, startTime: draft.startTime,
      durationMinutes: draft.durationMinutes === '' || draft.durationMinutes === null ? null : Number(draft.durationMinutes), memo: draft.memo }
    const result = await update((current) => {
      if (item && !current.schedules.some((entry) => entry.id === item.id)) throw new Error('invalidData')
      const changedPatch = Object.fromEntries(Object.entries(patch).filter(([key]) => Object.hasOwn(changes, key)))
      return { ...current, schedules: item ? current.schedules.map((entry) => entry.id === item.id ? { ...entry, ...changedPatch } : entry)
        : [...current.schedules, { ...patch, id: createTravelId(), tripId: current.trip.id, day,
          order: Math.max(-1, ...getDaySchedules(current, day).map((entry) => entry.order)) + 1, candidateGroupId: null }] }
    })
    if (result && !item) onCreated()
    return result
  }
  return <TravelFields initial={initial} fields={fields} onSave={save} autoSave={!!item} draftKey={item ? `schedule:${item.id}` : undefined} t={t} submitLabel={item ? t.saveChanges : t.newSchedule} />
}

// 시간표와 수정 작업을 분리. DAY 선택은 TripDetail이 보존
export default function TravelSchedule({ data, update, t, day, onDayChange, startCreating = false, initialPlaceId = '' }) {
  const [editor, setEditor] = useState(startCreating ? 'new' : null)
  const [selectedId, setSelectedId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const showDetails = (id) => {
    setSelectedId(id)
    if (window.matchMedia('(max-width: 860px)').matches) setPreviewOpen(true)
  }
  const editSelected = (id) => { setPreviewOpen(false); setEditor(id) }
  const days = getTravelDayCount(data)
  const items = getDaySchedules(data, day)
  const selected = items.find((item) => item.id === selectedId) || items[0]
  const selectedIndex = items.findIndex((item) => item.id === selected?.id)
  const selectedPlace = data.places.find((place) => place.id === selected?.placeId)
  const editingItem = data.schedules.find((item) => item.id === editor)
  const date = getTravelDayDate(data.trip, day)
  const dayOptions = Array.from({ length: days }, (_, index) => index + 1)
  const counts = {}
  data.schedules.forEach((item) => { counts[item.day] = (counts[item.day] || 0) + 1 })
  const addDay = async () => {
    const result = await update((current) => ({ ...current, settings: { ...current.settings, dayCount: Math.min(MAX_TRAVEL_DAYS, getTravelDayCount(current) + 1) } }))
    if (result) { onDayChange(getTravelDayCount(result)); setSelectedId(null) }
  }
  // 같은 상세 내용을 데스크톱은 우측 패널, 모바일은 접근성 dialog로 제공
  const details = <>
        {selected ? <>
          <div className="travel-inspector-heading"><div><p className="travel-eyebrow">{t.scheduleDetails}</p><h3>{selected.title || selectedPlace?.name || t.emptySlot}</h3></div></div>
          <dl className="travel-detail-list"><div><dt>{t.timeLabel}</dt><dd>{selected.startTime || t.timeUnknown}</dd></div><div><dt>{t.durationLabel}</dt><dd>{selected.durationMinutes === null ? '—' : t.duration(selected.durationMinutes)}</dd></div><div><dt>{t.place}</dt><dd>{selectedPlace?.name || t.undecided}</dd></div></dl>
          {selected.memo && <p className="travel-memo travel-inspector-memo">{selected.memo}</p>}
          <button className="travel-primary" type="button" onClick={() => editSelected(selected.id)}>{t.editSchedule}</button>
          {selectedPlace && <TravelGoogleMapsLink place={selectedPlace} region={data.trip.region} t={t} />}
          <details className="travel-disclosure"><summary>{t.reorderSchedule}</summary>
            <div className="travel-actions"><button type="button" disabled={selectedIndex === 0} onClick={() => update((current) => moveTravelSchedule(current, selected.id, day, -1))}>↑ {t.up}</button>
              <button type="button" disabled={selectedIndex === items.length - 1} onClick={() => update((current) => moveTravelSchedule(current, selected.id, day, 1))}>↓ {t.down}</button></div>
            <label>{t.moveDay}<select value={day} onChange={(event) => { const next = Number(event.target.value); update((current) => moveTravelSchedule(current, selected.id, next)) }}>
              {dayOptions.map((value) => <option key={value} value={value}>DAY {value}</option>)}
            </select></label>
          </details>
          <button type="button" className="travel-danger travel-schedule-delete" onClick={async () => { if (window.confirm(t.deleteScheduleConfirm)) {
            const result = await update((current) => ({ ...current, schedules: current.schedules.filter((entry) => entry.id !== selected.id) }))
            if (result) forgetTravelDraft(`schedule:${selected.id}`)
          } }}>{t.delete}</button>
        </> : <p className="travel-inspector-empty">{t.selectScheduleHint}</p>}
  </>
  return <section className="travel-section">
    <nav className="travel-day-strip" aria-label={t.daySelection}>
      {visibleTravelDays(days, day).map((value) => <button key={value} type="button" className={day === value ? 'is-active' : ''}
        aria-current={day === value ? 'date' : undefined} onClick={() => { onDayChange(value); setSelectedId(null) }}>
        <strong>DAY {value}</strong><span>{getTravelDayDate(data.trip, value) || t.datesUnknown}</span><small>{t.scheduleCount(counts[value] || 0)}</small>
      </button>)}
    </nav>
    <div className="travel-day-toolbar"><div><h3>DAY {day} <small>{date}</small></h3><span>{t.scheduleCount(items.length)} · {t.scheduleListHint}</span></div>
      <div className="travel-actions"><label className="travel-day-jump"><span>{t.allDays}</span><select value={day} onChange={(event) => { onDayChange(Number(event.target.value)); setSelectedId(null) }}>
        {dayOptions.map((value) => <option key={value} value={value}>DAY {value}</option>)}
      </select></label><button type="button" onClick={addDay} disabled={days >= MAX_TRAVEL_DAYS}>+ {t.addDay}</button></div>
    </div>
    {!data.trip.startDate && <p className="travel-context-hint">{t.datesHint}</p>}
    {tripDateCount(data.trip) > 0 && day > tripDateCount(data.trip) && <p className="travel-context-hint" role="status">{t.outsideDates}</p>}
    <div className="travel-split-view">
      <div className="travel-list-surface">
        <div className="travel-list-caption"><strong>{t.dayItinerary}</strong><span>{t.listEditHint}</span></div>
        {!items.length && <div className="travel-empty"><p>{t.noSchedules}</p><button className="travel-primary" type="button" onClick={() => setEditor('new')}>+ {t.newSchedule}</button></div>}
        <ol className="travel-compact-list travel-schedule-list">{items.map((item, index) => {
          const place = data.places.find((entry) => entry.id === item.placeId)
          const title = item.title || place?.name || t.emptySlot
          return <li key={item.id} className={`travel-compact-row ${selected?.id === item.id ? 'is-selected' : ''}`}>
            <span className="travel-slot-time"><strong>{item.startTime || '—'}</strong><small>{item.durationMinutes !== null ? t.duration(item.durationMinutes) : String(index + 1).padStart(2, '0')}</small></span>
            <button className="travel-row-main" type="button" aria-pressed={selected?.id === item.id} onClick={() => showDetails(item.id)}>
              <strong>{title}</strong><span>{place && (!item.title || item.title === place.name) ? t.categories[place.category] : place?.name || t.undecided}{place?.onHold ? ` · ${t.onHold}` : ''}</span>
            </button><button className="travel-row-edit" type="button" aria-label={t.editNamed(title)} onClick={() => { setSelectedId(item.id); editSelected(item.id) }}>{t.edit}</button>
          </li>
        })}</ol>
      </div>
      <aside className="travel-inspector travel-surface" aria-label={t.scheduleDetails}>{details}</aside>
    </div>
    {(editor === 'new' || editingItem) && <TravelEditorPanel title={editingItem ? t.editSchedule : t.newSchedule} t={t} onClose={() => setEditor(null)}>
      <p className="travel-editor-day">DAY {day} · {date || t.datesUnknown}</p>
      <ScheduleEditor key={editor} item={editingItem} data={data} day={day} initialPlaceId={initialPlaceId} update={update} onCreated={() => setEditor(null)} t={t} />
    </TravelEditorPanel>}
    {previewOpen && <TravelEditorPanel description={t.previewHint} title={t.scheduleDetails} t={t} onClose={() => setPreviewOpen(false)}>{details}</TravelEditorPanel>}
  </section>
}
