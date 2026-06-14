import { useState } from 'react'

function Board({ t }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const samplePosts = [
    {
      id: 'post-1',
      title: '첫 게시글',
      content: '게시판 기능을 만드는 중',
      category: 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
        <p className="module-meta">
          준비중 <span>{samplePosts.length}</span>
        </p>
      </div>

      <div className="board-layout">
        {/* 게시글 작성 UI 초안 */}
        <section className="board-section board-compose-panel">
          <div className="board-section-header">
            <div>
              <p className="module-label">Compose</p>
              <h3>게시글 작성</h3>
            </div>
            <span className="board-status-chip">Draft</span>
          </div>

          <div className="board-form">
            <label className="board-field">
              <span>제목</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="게시글 제목"
              />
            </label>

            <label className="board-field">
              <span>내용</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="게시글 내용"
                rows={5}
              />
            </label>

            <button type="button" className="board-primary-button">
              작성
            </button>
          </div>
        </section>

        {/* 게시글 목록 UI 초안 */}
        <section className="board-section board-list-panel">
          <div className="board-section-header">
            <div>
              <p className="module-label">Archive</p>
              <h3>게시글 목록</h3>
            </div>
            <span className="board-count">전체 {samplePosts.length}개</span>
          </div>

          <div className="board-post-list">
            {samplePosts.map((post) => (
              <article className="board-post-card" key={post.id}>
                <div>
                  <span className="board-post-category">{post.category}</span>
                  <h4>{post.title}</h4>
                </div>
                <p>{post.content}</p>
                <time dateTime={post.createdAt}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </time>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

export default Board
