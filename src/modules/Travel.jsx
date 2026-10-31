import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TripEditor from './travel/TripEditor.jsx'
import TripDetail from './travel/TripDetail.jsx'
import TravelEditorPanel from './travel/TravelEditorPanel.jsx'
import useTravel from './travel/useTravel.js'
import { forgetTravelDraft } from './travel/travelDrafts.js'
import {
  cloneTravelData,
  createTripData,
  exportTravelJson,
  importTravelJson,
} from './travel/travelLogic.js'
import './Travel.css'
import './travel/TravelWorkspace.css'
import MoreActions from '../components/MoreActions.jsx'

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
    const url = URL.createObjectURL(
      new Blob([exportTravelJson(record)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    const fileName = Array.from(record.trip.name)
      .map((character) =>
        character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character,
      )
      .join('')
    link.download = `${fileName.slice(0, 100) || 'travel'}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const importFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setFileError('')

    try {
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('invalidData')
      }

      const imported = importTravelJson(await file.text())
      const result = await state.add(imported)

      if (result) {
        navigate(`/travel/${result.trip.id}`)
      }
    } catch {
      setFileError('invalidData')
    }
  }

  const remove = async (record) => {
    if (!window.confirm(t.deleteTripConfirm)) {
      return
    }

    const result = await state.remove(record.trip.id)

    if (result) {
      forgetTravelDraft(`trip:${record.trip.id}`)
      record.places.forEach((place) => forgetTravelDraft(`place:${place.id}`))
      record.schedules.forEach((item) => forgetTravelDraft(`schedule:${item.id}`))
    }

    if (result && tripId === record.trip.id) {
      navigate('/travel')
    }
  }

  const duplicate = async (record) => {
    const result = await state.add(
      cloneTravelData(record, `${record.trip.name.slice(0, 180)}${t.copySuffix}`),
    )

    if (result) {
      navigate(`/travel/${result.trip.id}`)
    }
  }

  if (state.loading) {
    return (
      <section className="module-panel travel-module travel-workspace">
        <p role="status">{t.loading}</p>
      </section>
    )
  }

  return (
    <section
      className="module-panel travel-module travel-workspace"
      aria-labelledby="travel-title"
    >
      {tripId && (
        <button
          className="travel-back-link"
          type="button"
          onClick={() => navigate('/travel')}
        >
          ← {t.back}
        </button>
      )}
      <header className="module-header travel-header">
        <div>
          <p className="module-label">TRAVEL</p>
          <h2 id="travel-title">{data ? data.trip.name : t.title}</h2>
          <p className="travel-description">
            {data
              ? `${data.trip.region || t.regionUnknown} · ${data.trip.startDate || t.datesUnknown} ~ ${data.trip.endDate || t.datesUnknown}`
              : t.description}
          </p>
        </div>
        <div className="travel-header-tools">
          <span
            className="module-meta"
            role="status"
            aria-live="polite"
          >
            {state.pending
              ? t.saving
              : state.saved && !state.error
                ? t.saved
                : data
                  ? t[data.trip.status]
                  : ''}
          </span>
          {data && (
            <MoreActions label={t.moreActions}>
              <button
                type="button"
                onClick={() => download(data)}
                disabled={!!state.pending}
              >
                {t.export}
              </button>
              <button
                type="button"
                onClick={() => duplicate(data)}
                disabled={!!state.pending}
              >
                {t.duplicate}
              </button>
              <button
                type="button"
                className="travel-danger"
                onClick={() => remove(data)}
                disabled={!!state.pending}
              >
                {t.delete}
              </button>
            </MoreActions>
          )}
        </div>
      </header>
      {state.error && (
        <div
          className="travel-error"
          role="alert"
        >
          {t[state.error]}
          {(state.error === 'loadError' || state.error === 'tripMissing') && (
            <button
              type="button"
              onClick={state.refresh}
            >
              {t.retry}
            </button>
          )}
        </div>
      )}
      {fileError && (
        <p
          className="travel-error"
          role="alert"
        >
          {t[fileError]}
        </p>
      )}
      {!tripId && (
        <div className="travel-toolbar travel-library-toolbar">
          <button
            className="travel-primary"
            type="button"
            onClick={() => setEditor('new')}
            disabled={state.error === 'loadError'}
          >
            + {t.newTrip}
          </button>
          <label className="travel-file-button">
            {t.import}
            <input
              type="file"
              accept=".json,application/json"
              onChange={importFile}
              disabled={!!state.pending || state.error === 'loadError'}
            />
          </label>
          <small className="travel-import-hint">{t.importHint}</small>
        </div>
      )}
      {tripId ? (
        data ? (
          <TripDetail
            key={tripId}
            data={data}
            update={update}
            t={t}
            language={language}
          />
        ) : (
          <p>{t.tripMissing}</p>
        )
      ) : (
        <>
          {editor === 'new' && (
            <TravelEditorPanel
              title={t.newTrip}
              t={t}
              onClose={() => setEditor(null)}
            >
              <TripEditor
                t={t}
                onSave={async (draft) => {
                  const result = await state.add(createTripData(draft))

                  if (result) {
                    setEditor(null)
                    navigate(`/travel/${result.trip.id}`)
                  }

                  return result
                }}
              />
            </TravelEditorPanel>
          )}
          {!state.trips.length && !state.error && <p className="travel-empty">{t.noTrips}</p>}
          <div className="travel-card-grid">
            {state.trips.map((record) => (
              <article
                key={record.trip.id}
                className="travel-card travel-trip-card"
              >
                <div className="travel-card-heading">
                  <h2>
                    <button
                      className="travel-card-title"
                      type="button"
                      onClick={() => navigate(`/travel/${record.trip.id}`)}
                    >
                      {record.trip.name}
                    </button>
                  </h2>
                  <span className="travel-badge">{t[record.trip.status]}</span>
                </div>
                <p>{record.trip.region}</p>
                <p>
                  {record.trip.startDate || t.datesUnknown} ~{' '}
                  {record.trip.endDate || t.datesUnknown}
                </p>
                <div className="travel-trip-meta">
                  <span>{t.placeCount(record.places.length)}</span>
                  <span>{t.scheduleCount(record.schedules.length)}</span>
                </div>
                {editor === record.trip.id ? (
                  <TravelEditorPanel
                    title={t.editTrip}
                    t={t}
                    onClose={() => setEditor(null)}
                  >
                    <TripEditor
                      trip={record.trip}
                      t={t}
                      onSave={(_draft, changes) =>
                        state.update(record.trip.id, (current) => ({
                          ...current,
                          trip: { ...current.trip, ...changes },
                        }))
                      }
                    />
                  </TravelEditorPanel>
                ) : (
                  <div className="travel-actions">
                    <button
                      className="travel-primary"
                      type="button"
                      onClick={() => navigate(`/travel/${record.trip.id}`)}
                    >
                      {t.open} →
                    </button>
                    <MoreActions label={t.moreActions}>
                      <button
                        type="button"
                        onClick={() => setEditor(record.trip.id)}
                      >
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        disabled={!!state.pending}
                        onClick={() => duplicate(record)}
                      >
                        {t.duplicate}
                      </button>
                      <button
                        type="button"
                        onClick={() => download(record)}
                        disabled={!!state.pending}
                      >
                        {t.export}
                      </button>
                      <button
                        type="button"
                        disabled={!!state.pending}
                        className="travel-danger"
                        onClick={() => remove(record)}
                      >
                        {t.delete}
                      </button>
                    </MoreActions>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
      {!tripId && <p className="travel-footnote">{t.localNote}</p>}
    </section>
  )
}
