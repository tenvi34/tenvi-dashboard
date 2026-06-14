function Board({ t }) {
  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
      </div>

      <div className="empty-state" role="status">
        <span>{t.common.systemMessage}</span>
        <p>{t.board.message}</p>
      </div>
    </section>
  )
}

export default Board
