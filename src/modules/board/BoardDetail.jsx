import UserAvatar from '../../components/UserAvatar.jsx'
import {
  getBoardCategoryName,
  getPostCategoryId,
} from '../boardLogic.js'

// Board 게시글 상세 화면
function BoardDetail({
  avatarImageId,
  categories,
  detailImagePreviews,
  formatPostDate,
  onBackToList,
  onDeletePost,
  onImageViewerOpen,
  onOpenEdit,
  onTogglePinned,
  post,
  postBlocks,
  t,
}) {
  return (
    <section className="board-cafe-panel board-screen">
      {post ? (
        <article className="board-cafe-article">
          <div className="board-cafe-title-row">
            <h3>{post.title}</h3>
            <div className="board-cafe-badges">
              <span className="board-category-badge">
                {getBoardCategoryName(getPostCategoryId(post, categories), categories)}
              </span>
              {post.pinned === true ? (
                <span className="board-pinned-badge">{t.board.pinned}</span>
              ) : null}
            </div>
          </div>

          <div className="board-cafe-meta-row">
            <UserAvatar
              avatarImageId={avatarImageId}
              className="board-cafe-avatar"
              nickname={post.author ?? t.board.unknownAuthor}
              size="md"
            />

            <div className="board-cafe-author">
              <div className="board-cafe-author-line">
                <strong>{post.author ?? t.board.unknownAuthor}</strong>
              </div>
              <div className="board-cafe-post-info">
                <time dateTime={post.createdAt}>
                  {formatPostDate(post.createdAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
                <span>{t.board.views(post.views ?? 0)}</span>
              </div>
            </div>

            <div className="board-detail-actions">
              <button
                type="button"
                className={`board-secondary-button board-pin-button ${
                  post.pinned === true ? 'is-active' : ''
                }`}
                onClick={() => onTogglePinned(post.id)}
              >
                {post.pinned === true ? t.board.unpin : t.board.pin}
              </button>
              <button
                type="button"
                className="board-secondary-button"
                onClick={onBackToList}
              >
                {t.board.backToList}
              </button>
              <button
                type="button"
                className="board-secondary-button"
                onClick={onOpenEdit}
              >
                {t.board.edit}
              </button>
              <button
                type="button"
                className="board-delete-button"
                onClick={() => onDeletePost(post.id)}
              >
                {t.board.delete}
              </button>
            </div>
          </div>

          <div className="board-cafe-content">
            {postBlocks.map((block) => {
              // legacy src와 IndexedDB preview를 모두 허용
              const imageSource =
                block.type === 'image'
                  ? block.src || detailImagePreviews[block.imageId] || ''
                  : ''

              return block.type === 'image' ? (
                <figure className="board-cafe-image-block" key={block.id}>
                  {imageSource ? (
                    <button
                      type="button"
                      className="board-image-preview-button"
                      aria-label={t.board.openImagePreview}
                      onClick={() =>
                        onImageViewerOpen({
                          alt: block.name,
                          src: imageSource,
                        })
                      }
                    >
                      <img src={imageSource} alt={block.name} />
                    </button>
                  ) : null}
                </figure>
              ) : (
                <p className="board-cafe-text-block" key={block.id}>
                  {block.content}
                </p>
              )
            })}
          </div>
        </article>
      ) : (
        <div className="empty-state" role="status">
          <span>{t.common.systemMessage}</span>
          <p>{t.board.missingPostMessage}</p>
        </div>
      )}
    </section>
  )
}

export default BoardDetail
