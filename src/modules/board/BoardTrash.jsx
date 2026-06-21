function BoardTrash({
  formatPostDate,
  onPermanentDeletePost,
  onRestorePost,
  posts,
  t,
}) {
  return (
    <section className="board-trash-panel" aria-label={t.board.trash}>
      <div className="board-trash-header">
        <div>
          <p className="module-label">{t.board.trash}</p>
          <h3>{t.board.trashTitle}</h3>
        </div>
        <span className="board-count">
          {t.board.trashCount(posts.length)}
        </span>
      </div>

      {posts.length > 0 ? (
        <div className="board-trash-list">
          {posts.map((post) => (
            <div className="board-trash-item" key={post.id}>
              <div>
                <strong>{post.title}</strong>
                <small>
                  {post.deletedAt
                    ? t.board.deletedAt(
                        formatPostDate(post.deletedAt, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }),
                      )
                    : ''}
                </small>
              </div>
              <div className="board-trash-actions">
                <button
                  type="button"
                  className="board-secondary-button"
                  onClick={() => onRestorePost(post.id)}
                >
                  {t.board.restore}
                </button>
                <button
                  type="button"
                  className="board-delete-button"
                  onClick={() => onPermanentDeletePost(post.id)}
                >
                  {t.board.permanentDelete}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="board-trash-empty">{t.board.emptyTrash}</p>
      )}
    </section>
  )
}

export default BoardTrash
