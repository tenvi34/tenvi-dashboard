import { useState } from 'react'
import TravelFields from './TravelFields.jsx'
import { forgetTravelDraft } from './travelDrafts.js'
import { createTravelId, getDaySchedules, getTravelDayCount, getTravelDayDate, MAX_TRAVEL_DAYS, moveTravelSchedule, tripDateCount } from './travelLogic.js'

function ScheduleEditor({ item, data, day, update, onCreated, t }) {
  const initial = item || { title: '', placeId: '', startTime: '', durationMinutes: '', memo: '' }
  const fields = [
    { key: 'title', label: t.scheduleTitle, maxLength: 200 },
    { key: 'placeId', label: t.place, options: [['', t.undecided], ...data.places.map((place) => [place.id, `${place.name}${place.onHold ? ` (${t.onHold})` : ''}`])] },
    { key: 'startTime', label: t.startTime, type: 'time' },
    { key: 'durationMinutes', label: t.durationMinutes, type: 'number', min: 0, max: 10080, step: 1 },
    { key: 'memo', label: t.memo, type: 'textarea' },
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
  return <TravelFields initial={initial} fields={fields} onSave={save} autoSave={!!item} draftKey={item ? `schedule:${item.id}` : undefined} t={t} />
}

export default function TravelSchedule({ data, update, t }) {
  const [day, setDay] = useState(1)
  const [editor, setEditor] = useState(null)
  const days = getTravelDayCount(data)
  const items = getDaySchedules(data, day)
  const date = getTravelDayDate(data.trip, day)
  const dayOptions = Array.from({ length: days }, (_, index) => index + 1)
  const addDay = async () => {
    const result = await update((current) => ({ ...current, settings: { ...current.settings, dayCount: Math.min(MAX_TRAVEL_DAYS, getTravelDayCount(current) + 1) } }))
    if (result) { setDay(getTravelDayCount(result)); setEditor(null) }
  }
  return <section className="travel-section">
    <div className="travel-toolbar">
      <label>{t.day}<select value={day} onChange={(event) => { setDay(Number(event.target.value)); setEditor(null) }}>
        {dayOptions.map((value) => <option key={value} value={value}>DAY {value} {getTravelDayDate(data.trip, value)}</option>)}
      </select></label>
      <button type="button" onClick={addDay} disabled={days >= MAX_TRAVEL_DAYS}>{t.addDay}</button>
      <button type="button" onClick={() => setEditor('new')}>{t.newSchedule}</button>
    </div>
    {!data.trip.startDate && <p>{t.datesHint}</p>}
    {tripDateCount(data.trip) > 0 && day > tripDateCount(data.trip) && <p role="status">{t.outsideDates}</p>}
    <h3>DAY {day} <small>{date}</small></h3>
    {editor === 'new' && <div className="travel-card">
      <ScheduleEditor data={data} day={day} update={update} onCreated={() => setEditor(null)} t={t} />
      <button type="button" onClick={() => setEditor(null)}>{t.cancel}</button>
    </div>}
    {!items.length && <p className="travel-empty">{t.noSchedules}</p>}
    <ol className="travel-timeline">{items.map((item, index) => {
      const place = data.places.find((entry) => entry.id === item.placeId)
      return <li key={item.id} className="travel-card">
        <div className="travel-card-heading"><span className="travel-time">{item.startTime || t.timeUnknown}</span>
          <span>{item.durationMinutes !== null && t.duration(item.durationMinutes)}</span></div>
        <h3>{item.title || place?.name || t.emptySlot}</h3>
        <p>{place?.name || t.undecided}{place?.onHold ? ` · ${t.onHold}` : ''}</p>
        {item.memo && <p className="travel-memo">{item.memo}</p>}
        {editor === item.id ? <>
          <ScheduleEditor item={item} data={data} day={day} update={update} t={t} />
          <button type="button" onClick={() => setEditor(null)}>{t.cancel}</button>
        </> : <div className="travel-actions">
          <button type="button" onClick={() => setEditor(item.id)}>{t.edit}</button>
          <button type="button" aria-label={t.up} disabled={index === 0} onClick={() => update((current) => moveTravelSchedule(current, item.id, day, -1))}>↑</button>
          <button type="button" aria-label={t.down} disabled={index === items.length - 1} onClick={() => update((current) => moveTravelSchedule(current, item.id, day, 1))}>↓</button>
          <label>{t.moveDay}<select value={day} onChange={(event) => { const nextDay = Number(event.target.value); update((current) => moveTravelSchedule(current, item.id, nextDay)) }}>
            {dayOptions.map((value) => <option key={value} value={value}>DAY {value}</option>)}
          </select></label>
          <button type="button" className="travel-danger" onClick={async () => { if (window.confirm(t.deleteScheduleConfirm)) {
            const result = await update((current) => ({ ...current, schedules: current.schedules.filter((entry) => entry.id !== item.id) }))
            if (result) forgetTravelDraft(`schedule:${item.id}`)
          } }}>{t.delete}</button>
        </div>}
      </li>
    })}</ol>
  </section>
}
