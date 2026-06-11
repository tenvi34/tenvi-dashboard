import { PhotoPreview } from './MapPhotoPreview.jsx'

// Map 상위 모드 전환 탭
function MapModeTabs({ activeMode, onChangeMode, t }) {
  return (
    <div className="map-mode-tabs" role="tablist" aria-label={t.map.modeTabs}>
      <button
        className={`map-mode-tab${activeMode === 'explore' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={activeMode === 'explore'}
        type="button"
        onClick={() => onChangeMode('explore')}
      >
        {t.map.modeExplore}
      </button>
      <button
        className={`map-mode-tab${activeMode === 'upload' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={activeMode === 'upload'}
        type="button"
        onClick={() => onChangeMode('upload')}
      >
        {t.map.modeUpload}
      </button>
      <button
        className={`map-mode-tab${activeMode === 'collections' ? ' is-active' : ''}`}
        role="tab"
        aria-selected={activeMode === 'collections'}
        type="button"
        onClick={() => onChangeMode('collections')}
      >
        {t.map.modeCollections}
      </button>
    </div>
  )
}

// 모바일 단일 보기 전환 탭
function MobileMapViewTabs({ activeView, onChangeView, t }) {
  const views = [
    { id: 'map', label: t.map.mobileMapViewMap },
    { id: 'list', label: t.map.mobileMapViewList },
    { id: 'detail', label: t.map.mobileMapViewDetail },
  ]

  return (
    <div
      className="mobile-map-view-tabs"
      role="tablist"
      aria-label={t.map.mobileMapViewsLabel}
    >
      {views.map((view) => (
        <button
          className={`mobile-map-view-tab ${
            activeView === view.id ? 'is-active' : ''
          }`}
          key={view.id}
          type="button"
          role="tab"
          aria-selected={activeView === view.id}
          onClick={() => onChangeView(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}

// 모바일 지도 선택 기록 미리보기
function MobileMapPreviewCard({ collectionName, onOpenDetail, record, t }) {
  if (!record) {
    return null
  }

  return (
    <button className="mobile-map-preview-card" type="button" onClick={onOpenDetail}>
      <PhotoPreview
        alt={record.title}
        blob={record.previewImageBlob}
        className="mobile-map-preview-thumb"
      />
      <span>
        <strong>{record.title}</strong>
        <small>{collectionName}</small>
      </span>
      <em>{t.map.openMapDetail}</em>
    </button>
  )
}

// 모바일 지도 빈 상태 안내
function MobileMapEmptyCard({ onOpenList, t }) {
  return (
    <div className="mobile-map-empty-card" role="note">
      <strong>{t.map.mobileMapEmptyTitle}</strong>
      <p>{t.map.mobileMapEmptyDescription}</p>
      <button className="map-secondary-button" type="button" onClick={onOpenList}>
        {t.map.backToList}
      </button>
    </div>
  )
}

export {
  MapModeTabs,
  MobileMapEmptyCard,
  MobileMapPreviewCard,
  MobileMapViewTabs,
}
