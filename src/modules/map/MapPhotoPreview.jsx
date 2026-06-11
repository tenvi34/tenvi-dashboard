import { useEffect, useState } from 'react'

function PhotoPreview({ alt, blob, className }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (!blob) {
      setSrc('')
      return undefined
    }

    // Blob URL 정리
    const objectUrl = URL.createObjectURL(blob)

    setSrc(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])

  if (!src) {
    return null
  }

  return <img alt={alt} className={className} src={src} />
}

function PhotoPreviewButton({ alt, blob, className, onOpen, t }) {
  if (!blob) {
    return <PhotoPreview alt={alt} blob={blob} className={className} />
  }

  return (
    <button
      className="map-photo-preview-button"
      type="button"
      aria-label={t.map.openPhotoPreview}
      onClick={() => onOpen({ alt, blob })}
    >
      <PhotoPreview alt={alt} blob={blob} className={className} />
    </button>
  )
}

function PhotoLightbox({ photo, onClose, t }) {
  if (!photo) {
    return null
  }

  return (
    <div
      className="map-photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t.map.photoPreviewLabel}
      onClick={onClose}
    >
      <div className="map-photo-lightbox-body" onClick={(event) => event.stopPropagation()}>
        <button
          className="map-photo-lightbox-close"
          type="button"
          onClick={onClose}
        >
          {t.map.closePhotoPreview}
        </button>
        <PhotoPreview
          alt={photo.alt}
          blob={photo.blob}
          className="map-photo-lightbox-image"
        />
      </div>
    </div>
  )
}

export { PhotoLightbox, PhotoPreview, PhotoPreviewButton }
