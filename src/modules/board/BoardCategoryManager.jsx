import { DEFAULT_BOARD_CATEGORY_ID } from '../boardLogic.js'

// Board 카테고리 편집 패널
function BoardCategoryManager({
  categoryError,
  categoryNameInput,
  editingCategoryId,
  editingCategoryName,
  categories,
  onAddCategory,
  onCategoryErrorClear,
  onCategoryNameInputChange,
  onDeleteCategory,
  onEditingCategoryIdChange,
  onEditingCategoryNameChange,
  onUpdateCategory,
  t,
}) {
  return (
    <div className="board-category-manager">
      <div className="board-category-form">
        <input
          type="text"
          value={categoryNameInput}
          onChange={(event) => {
            onCategoryNameInputChange(event.target.value)
            onCategoryErrorClear()
          }}
          placeholder={t.board.categoryNamePlaceholder}
        />
        <button
          type="button"
          className="board-secondary-button"
          onClick={onAddCategory}
        >
          {t.board.categoryAdd}
        </button>
      </div>

      {categoryError ? (
        <p className="board-form-message" role="alert">
          {categoryError}
        </p>
      ) : null}

      <div className="board-category-list">
        {categories.map((category) => {
          // 기본 카테고리는 게시글 fallback 대상이라 삭제 차단
          const isEditing = editingCategoryId === category.id
          const isGeneral = category.id === DEFAULT_BOARD_CATEGORY_ID

          return (
            <div className="board-category-item" key={category.id}>
              {isEditing ? (
                <input
                  type="text"
                  value={editingCategoryName}
                  onChange={(event) =>
                    onEditingCategoryNameChange(event.target.value)
                  }
                />
              ) : (
                <span>{category.name}</span>
              )}
              <div className="board-category-actions">
                {isEditing ? (
                  <button
                    type="button"
                    className="board-secondary-button"
                    onClick={() => onUpdateCategory(category.id)}
                  >
                    {t.board.categorySave}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="board-secondary-button"
                    onClick={() => {
                      onEditingCategoryIdChange(category.id)
                      onEditingCategoryNameChange(category.name)
                      onCategoryErrorClear()
                    }}
                  >
                    {t.board.categoryEdit}
                  </button>
                )}
                <button
                  type="button"
                  className="board-delete-button"
                  onClick={() => onDeleteCategory(category.id)}
                  disabled={isGeneral}
                >
                  {t.board.categoryDelete}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BoardCategoryManager
