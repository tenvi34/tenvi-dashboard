function BoardImageLightbox({ imageViewer, onClose, t }) {
  if (!imageViewer) {
    return null
  }

  return (
    <div
      className="board-image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={t.board.imagePreviewLabel}
      onClick={onClose}
    >
      <div
        className="board-image-lightbox-body"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="board-image-lightbox-close"
          onClick={onClose}
        >
          {t.board.closeImagePreview}
        </button>
        <img
          className="board-image-lightbox-image"
          src={imageViewer.src}
          alt={imageViewer.alt}
        />
      </div>
    </div>
  )
}

export default BoardImageLightbox
