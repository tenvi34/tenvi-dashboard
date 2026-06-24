// Board 이미지 확대 모달
function BoardImageLightbox({ imageViewer, onClose, t }) {
  // 선택 이미지가 없으면 모달 DOM 자체를 만들지 않음
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
