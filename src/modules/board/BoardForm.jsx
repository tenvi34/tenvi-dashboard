import BoardEditor from './BoardEditor.jsx'
import { getBoardImageIds } from '../boardLogic.js'

// 게시글 작성/수정 공용 폼
function BoardForm({
  activeDraft,
  activeDraftId,
  author,
  blocks,
  categories,
  categoryId,
  draftList,
  draftPickerOpen,
  draftSaved,
  formError,
  formatDraftSavedAt,
  getDraftPreviewText,
  mode,
  onAuthorChange,
  onBlocksChange,
  onCancel,
  onCategoryChange,
  onDeleteAllDrafts,
  onDeleteDraft,
  onDraftPickerToggle,
  onLoadDraft,
  onSubmit,
  onTitleChange,
  t,
  title,
}) {
  // mode에 따라 draft 기능 노출 범위 분리
  const isEditMode = mode === 'edit'
  const boardFormId = isEditMode ? 'board-edit-form' : 'board-write-form'

  return (
    <section className="board-section board-compose-panel board-screen">
      <form
        id={boardFormId}
        className="board-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <div className="board-compose-fixed">
          <div className="board-section-header board-compose-header">
            <div>
              <p className="module-label">
                {isEditMode ? t.board.editLabel : t.board.composeLabel}
              </p>
              <h3>{isEditMode ? t.board.editTitle : t.board.composeTitle}</h3>
            </div>
            <div className="board-compose-header-actions">
              {!isEditMode ? (
                <span className="board-status-chip">
                  {draftSaved && formatDraftSavedAt(activeDraft.savedAt)
                    ? t.board.draftSavedAt(formatDraftSavedAt(activeDraft.savedAt))
                    : draftSaved
                      ? t.board.draftSaved
                      : t.board.draft}
                </span>
              ) : null}
              {!isEditMode ? (
                <button
                  type="button"
                  className="board-secondary-button"
                  onClick={onDraftPickerToggle}
                  disabled={draftList.length === 0}
                >
                  {t.board.loadDraft}
                </button>
              ) : null}
              {!isEditMode ? (
                <button
                  type="button"
                  className="board-secondary-button"
                  onClick={() => onDeleteDraft()}
                  disabled={!draftSaved}
                >
                  {t.board.deleteDraft}
                </button>
              ) : null}
              <button
                type="submit"
                className="board-primary-button board-submit-button"
              >
                {isEditMode ? t.board.saveEdit : t.board.submit}
              </button>
              <button
                type="button"
                className="board-secondary-button"
                onClick={onCancel}
              >
                {t.board.cancel}
              </button>
            </div>
          </div>

          {!isEditMode && draftPickerOpen ? (
            <div className="board-draft-picker" aria-label={t.board.draftPickerLabel}>
              <div className="board-draft-picker-header">
                <p className="module-label">{t.board.draftPickerLabel}</p>
                <div className="board-draft-picker-actions">
                  <span className="board-count">
                    {t.board.draftCount(draftList.length)}
                  </span>
                  <button
                    type="button"
                    className="board-secondary-button"
                    onClick={onDeleteAllDrafts}
                  >
                    {t.board.clearDrafts}
                  </button>
                </div>
              </div>
              {draftList.length > 0 ? (
                <div className="board-draft-list">
                  {draftList.map((draft) => {
                    // draft 목록은 텍스트/이미지 존재 여부만 요약
                    const previewText = getDraftPreviewText(draft)
                    const hasImages = getBoardImageIds(draft.blocks).length > 0
                    const savedAt = formatDraftSavedAt(draft.savedAt)

                    return (
                      <div className="board-draft-item" key={draft.id}>
                        <button
                          type="button"
                          className={`board-draft-load-button ${
                            draft.id === activeDraftId ? 'is-active' : ''
                          }`}
                          onClick={() => onLoadDraft(draft)}
                        >
                          <strong>{draft.title.trim() || t.board.untitledDraft}</strong>
                          <span>
                            {previewText
                              ? t.board.draftPreview(previewText)
                              : hasImages
                                ? t.board.imageDraftPreview
                                : t.board.emptyDraftPreview}
                          </span>
                          <div className="board-draft-item-meta">
                            {hasImages ? (
                              <em className="board-draft-image-badge">
                                {t.board.imageDraftBadge}
                              </em>
                            ) : null}
                            {savedAt ? <small>{t.board.draftSavedAt(savedAt)}</small> : null}
                          </div>
                        </button>
                        <button
                          type="button"
                          className="board-delete-button"
                          onClick={() => onDeleteDraft(draft)}
                        >
                          {t.board.deleteDraft}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="board-draft-empty">{t.board.noDrafts}</p>
              )}
            </div>
          ) : null}

          <div className="board-compose-meta">
            <label className="board-field">
              <span>{t.board.categoryField}</span>
              <select
                value={categoryId}
                onChange={(event) => onCategoryChange(event.target.value, !isEditMode)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="board-field">
              <span>{t.board.authorField}</span>
              <input
                type="text"
                value={author}
                onChange={(event) => onAuthorChange(event.target.value, !isEditMode)}
                placeholder={t.board.authorPlaceholder}
              />
            </label>

            <label className="board-field">
              <span>{t.board.titleField}</span>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value, !isEditMode)}
                placeholder={t.board.titlePlaceholder}
              />
            </label>
          </div>
        </div>

        <div className="board-compose-scroll">
          <div className="board-field">
            <span>{t.board.contentField}</span>
            <BoardEditor
              blocks={blocks}
              onChange={(nextBlocks) => onBlocksChange(nextBlocks, !isEditMode)}
              t={t}
            />
          </div>

          {formError ? (
            <p className="board-form-message" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  )
}

export default BoardForm
