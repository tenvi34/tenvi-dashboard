import { useEffect, useRef } from 'react'

// IndexedDB Blob을 화면 수명에 맞춰 URL로 변환
function PhotoPreview({ alt, blob, className }) {
  const imageRef = useRef(null)

  useEffect(() => {
    if (!blob) {
      return undefined
    }

    // effect 재실행 시 폐기된 URL을 재사용하지 않도록 매번 새로 생성
    const objectUrl = URL.createObjectURL(blob)
    const imageElement = imageRef.current

    if (imageElement) {
      imageElement.src = objectUrl
    }

    return () => {
      if (imageElement?.src === objectUrl) {
        imageElement.removeAttribute('src')
      }

      URL.revokeObjectURL(objectUrl)
    }
  }, [blob])

  if (!blob) {
    return null
  }

  return <img ref={imageRef} alt={alt} className={className} />
}

// 클릭 가능한 사진 미리보기
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

// 원본 비율 사진 라이트박스
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
