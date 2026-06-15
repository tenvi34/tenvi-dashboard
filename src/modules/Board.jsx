import { useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'

const STORAGE_KEY = STORAGE_KEYS.boardPosts

// 게시글 목록 불러오기
const loadBoardPosts = () => {
  try {
    const rawPosts = localStorage.getItem(STORAGE_KEY)

    if (!rawPosts) {
      return [
        {
          id: 'post-1',
          title: '첫 게시글',
          content: '게시판 기능을 만드는 중',
          category: 'general',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
    }

    const parsedPosts = JSON.parse(rawPosts)

    return Array.isArray(parsedPosts) ? parsedPosts : []
  } catch {
    return []
  }
}

// 게시글 저장
const saveBoardPosts = (posts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

function Board({ t }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isWriting, setIsWriting] = useState(false)

  const [posts, setPosts] = useState(() => loadBoardPosts())

  // 게시글 작성
  const handleCreatePost = () => {
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) {
      return
    }

    const now = new Date().toISOString()

    const newPost = {
      id: `post-${crypto.randomUUID()}`,
      title: trimmedTitle,
      content: trimmedContent,
      category: 'general',
      createdAt: now,
      updatedAt: now,
    }

    setPosts((currentPosts) => {
      const nextPosts = [newPost, ...currentPosts]
      saveBoardPosts(nextPosts)

      return nextPosts
    })

    // 저장 후 입력 폼 초기화
    setTitle('')
    setContent('')
    setIsWriting(false)
  }

  const handleCancelWrite = () => {
    setTitle('')
    setContent('')
    setIsWriting(false)
  }

  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
        <p className="module-meta">
          준비중 <span>{posts.length}</span>
        </p>
      </div>

      <div className="board-toolbar">
        <div>
          <p className="module-label">Archive</p>
          <h3>게시글 목록</h3>
        </div>
        <button
          type="button"
          className="board-primary-button"
          onClick={() => setIsWriting((currentValue) => !currentValue)}
        >
          {isWriting ? '작성 닫기' : '글쓰기'}
        </button>
      </div>

      {isWriting ? (
        <section className="board-section board-compose-panel">
          <div className="board-section-header board-compose-header">
            <div>
              <p className="module-label">Compose</p>
              <h3>게시글 작성</h3>
            </div>
            <span className="board-status-chip">Draft</span>
          </div>

          <form className="board-form" onSubmit={(event) => {
            event.preventDefault()
            handleCreatePost()
          }}>
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

            <div className="board-form-actions">
              <button type="submit" className="board-primary-button">
                작성
              </button>
              <button
                type="button"
                className="board-secondary-button"
                onClick={handleCancelWrite}
              >
                취소
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* 게시판 기본 목록 */}
      <section className="board-section board-list-panel">
        <div className="board-list-summary">
          <span className="board-count">전체 {posts.length}개</span>
        </div>

        <div className="board-post-list">
          {posts.map((post, index) => (
            <article className="board-post-card" key={post.id}>
              <span className="board-post-number">{posts.length - index}</span>
              <div className="board-post-main">
                <span className="board-post-category">{post.category}</span>
                <h4>{post.title}</h4>
                <p>{post.content}</p>
              </div>
              <div className="board-post-meta">
                <time dateTime={post.createdAt}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </time>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}

export default Board
