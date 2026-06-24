import { PhotoPreview } from './MapPhotoPreview.jsx'

// Map 사진 기록 목록
function PhotoRecordList({ activeRecordId, emptyMessage, onSelectRecord, records, t }) {
  return (
    <section className="map-list-panel" aria-label={t.map.recordListLabel}>
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

export default PhotoRecordList
