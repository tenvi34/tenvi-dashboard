import UserAvatar from '../../components/UserAvatar.jsx'
import BoardCategoryManager from './BoardCategoryManager.jsx'
import BoardTrash from './BoardTrash.jsx'
import {
  BOARD_SORT_OPTIONS,
  getBoardCategoryName,
  getPostCategoryId,
} from '../boardLogic.js'

// Board 목록/검색/분류 컨트롤
function BoardList({
  activePosts,
  avatarImageId,
  categories,
  categoryError,
  categoryFilter,
  categoryManagerOpen,
  categoryNameInput,
  editingCategoryId,
  editingCategoryName,
  formatPostDate,
  hasSearchQuery,
  onAddCategory,
  onCategoryErrorClear,
  onCategoryFilterChange,
  onCategoryManagerToggle,
  onCategoryNameInputChange,
  onDeleteCategory,
  onEditingCategoryIdChange,
  onEditingCategoryNameChange,
  onOpenDetail,
  onOpenWrite,
  onPermanentDeletePost,
  onRestorePost,
  onSearchQueryChange,
  onSearchScopeChange,
  onSortModeChange,
  onTrashToggle,
  onUpdateCategory,
  searchQuery,
  searchScope,
  searchScopes,
  sortMode,
  sortedPosts,
  trashedPosts,
  trashOpen,
  t,
  categoryFilterAll,
}) {
  return (
    <>
      <div className="board-toolbar">
        <div>
          <p className="module-label">{t.board.archiveLabel}</p>
          <h3>{t.board.listTitle}</h3>
        </div>
        <div className="board-toolbar-actions">
          <button
            type="button"
            className="board-secondary-button"
            onClick={onTrashToggle}
          >
            {t.board.trash} {trashedPosts.length}
          </button>
          <button
            type="button"
            className="board-primary-button board-write-button"
            onClick={onOpenWrite}
          >
            {t.board.write}
          </button>
        </div>
      </div>

      {trashOpen ? (
        <BoardTrash
          formatPostDate={formatPostDate}
          onPermanentDeletePost={onPermanentDeletePost}
          onRestorePost={onRestorePost}
          posts={trashedPosts}
          t={t}
        />
      ) : null}

      <section className="board-section board-list-panel">
        <div className="board-list-controls">
          <div className="board-category-filter" aria-label={t.board.categoryFilterLabel}>
            <button
              type="button"
              className={`board-category-chip ${
                categoryFilter === categoryFilterAll ? 'is-active' : ''
              }`}
              onClick={() => onCategoryFilterChange(categoryFilterAll)}
            >
              {t.board.allCategories}
            </button>
            {categories.map((category) => (
              <button
                type="button"
                className={`board-category-chip ${
                  categoryFilter === category.id ? 'is-active' : ''
                }`}
                key={category.id}
                onClick={() => onCategoryFilterChange(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="board-secondary-button board-category-toggle"
            onClick={onCategoryManagerToggle}
          >
            {t.board.categoryManage}
          </button>

          <div className="board-list-summary">
            <span className="board-count">
              {hasSearchQuery || categoryFilter !== categoryFilterAll
                ? t.board.searchResultCount(sortedPosts.length)
                : t.board.totalCount(activePosts.length)}
            </span>
            <label className="board-sort-field">
              <span>{t.board.sortLabel}</span>
              <select
                value={sortMode}
                onChange={(event) => onSortModeChange(event.target.value)}
              >
                {BOARD_SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {t.board.sortOptions[option.id]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {categoryManagerOpen ? (
          <BoardCategoryManager
            categories={categories}
            categoryError={categoryError}
            categoryNameInput={categoryNameInput}
            editingCategoryId={editingCategoryId}
            editingCategoryName={editingCategoryName}
            onAddCategory={onAddCategory}
            onCategoryErrorClear={onCategoryErrorClear}
            onCategoryNameInputChange={onCategoryNameInputChange}
            onDeleteCategory={onDeleteCategory}
            onEditingCategoryIdChange={onEditingCategoryIdChange}
            onEditingCategoryNameChange={onEditingCategoryNameChange}
            onUpdateCategory={onUpdateCategory}
            t={t}
          />
        ) : null}

        {sortedPosts.length > 0 ? (
          <div className="board-title-list">
            {sortedPosts.map((post, index) => {
              // 저장된 categoryId가 사라져도 기본 카테고리로 표시
              const postCategoryId = getPostCategoryId(post, categories)

              return (
                <button
                  type="button"
                  className="board-title-row"
                  key={post.id}
                  onClick={() => onOpenDetail(post.id)}
                >
                  <span className="board-post-number">
                    {sortedPosts.length - index}
                  </span>
                  <span className="board-author">
                    <UserAvatar
                      avatarImageId={avatarImageId}
                      nickname={post.author ?? t.board.unknownAuthor}
                      size="sm"
                    />
                    <span className="board-author__name">
                      {post.author ?? t.board.unknownAuthor}
                    </span>
                  </span>
                  <span className="board-title-text">
                    {post.pinned === true ? (
                      <span className="board-pinned-badge">{t.board.pinned}</span>
                    ) : null}
                    <span className="board-title-label">{post.title}</span>
                  </span>
                  <span className="board-category-badge">
                    {getBoardCategoryName(postCategoryId, categories)}
                  </span>
                  <span className="board-title-views">
                    {t.board.views(post.views ?? 0)}
                  </span>
                  <time className="board-title-date" dateTime={post.createdAt}>
                    {formatPostDate(post.createdAt, {
                      dateStyle: 'medium',
                    })}
                  </time>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <span>{t.common.systemMessage}</span>
            <p>
              {activePosts.length > 0 && (hasSearchQuery || categoryFilter !== categoryFilterAll)
                ? t.board.noSearchResults
                : t.board.emptyMessage}
            </p>
          </div>
        )}

        <div className="board-search-panel board-search-panel-bottom" role="search">
          <label className="board-search-field">
            <span>{t.board.searchLabel}</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={t.board.searchPlaceholder}
            />
          </label>

          <div
            className="board-search-scope"
            aria-label={t.board.searchScopeLabel}
          >
            {searchScopes.map((scope) => (
              <button
                type="button"
                className={`board-scope-button ${
                  searchScope === scope ? 'is-active' : ''
                }`}
                key={scope}
                onClick={() => onSearchScopeChange(scope)}
              >
                {t.board.searchScopes[scope]}
              </button>
            ))}
          </div>

          {hasSearchQuery ? (
            <button
              type="button"
              className="board-secondary-button board-search-clear"
              onClick={() => onSearchQueryChange('')}
            >
              {t.board.clearSearch}
            </button>
          ) : null}
        </div>
      </section>
    </>
  )
}

export default BoardList
