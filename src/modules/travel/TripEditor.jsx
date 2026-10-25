import TravelFields from './TravelFields.jsx'
import { tripDateError } from './travelLogic.js'

export default function TripEditor({ trip, onSave, t }) {
  const fields = [
    { key: 'name', label: t.name, required: true, maxLength: 200, pattern: '.*\\S.*' },
    { key: 'region', label: t.region, maxLength: 300 },
    { key: 'startDate', label: t.startDate, type: 'date', min: '0001-01-01', max: '9999-12-31' },
    { key: 'endDate', label: t.endDate, type: 'date', min: '0001-01-01', max: '9999-12-31' },
    ...(trip ? [{ key: 'status', label: t.status, options: [['planning', t.planning], ['completed', t.completed]] }, { key: 'memo', label: t.memo, type: 'textarea', style: { height: '250px' } }] : []),
  ]
  return <TravelFields initial={trip || { name: '', region: '', startDate: '', endDate: '' }} fields={fields}
    t={t} submitLabel={trip ? t.saveChanges : t.newTrip} autoSave={!!trip} draftKey={trip ? `trip:${trip.id}` : undefined} validate={tripDateError} onSave={onSave} />
}

