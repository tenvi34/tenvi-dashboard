import { useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  createBoardPost,
  deleteBoardPost,
  parseBoardPosts,
} from './boardLogic.js'

const STORAGE_KEY = STORAGE_KEYS.boardPosts

// 게시글 목록 불러오기
const loadBoardPosts = () => {
  try {
    const rawPosts = localStorage.getItem(STORAGE_KEY)

    if (!rawPosts) {
      return []
    }

    return parseBoardPosts(rawPosts)
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

    const newPost = createBoardPost({
      title: trimmedTitle,
      content: trimmedContent,
    })

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

  // 게시글 작성 취소
  const handleCancelWrite = () => {
    setTitle('')
    setContent('')
    setIsWriting(false)
  }

  // 게시글 삭제
  const handleDeletePost = (postId) => {
    setPosts((currentPosts) => {
      const nextPosts = deleteBoardPost(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
  }

  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
        <p className="module-meta">
          {t.board.status} <span>{posts.length}</span>
        </p>
      </div>

      <div className="board-toolbar">
        <div>
          <p className="module-label">{t.board.archiveLabel}</p>
          <h3>{t.board.listTitle}</h3>
        </div>
        <button
          type="button"
          className="board-primary-button board-write-button"
          onClick={() => setIsWriting((currentValue) => !currentValue)}
        >
          {isWriting ? t.board.closeWrite : t.board.write}
        </button>
      </div>

      {isWriting ? (
        <section className="board-section board-compose-panel">
          <div className="board-section-header board-compose-header">
            <div>
              <p className="module-label">{t.board.composeLabel}</p>
              <h3>{t.board.composeTitle}</h3>
            </div>
            <span className="board-status-chip">{t.board.draft}</span>
          </div>

          <form
            className="board-form"
            onSubmit={(event) => {
              event.preventDefault()
              handleCreatePost()
            }}
          >
            <label className="board-field">
              <span>{t.board.titleField}</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t.board.titlePlaceholder}
              />
            </label>

            <label className="board-field">
              <span>{t.board.contentField}</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={t.board.contentPlaceholder}
                rows={5}
              />
            </label>

            <div className="board-form-actions">
              <button
                type="submit"
                className="board-primary-button board-submit-button"
              >
                {t.board.submit}
              </button>
              <button
                type="button"
                className="board-secondary-button"
                onClick={handleCancelWrite}
              >
                {t.board.cancel}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* 게시판 기본 목록 */}
      <section className="board-section board-list-panel">
        <div className="board-list-summary">
          <span className="board-count">{t.board.totalCount(posts.length)}</span>
        </div>

        {posts.length > 0 ? (
          <div className="board-post-list">
            {posts.map((post, index) => (
              <article className="board-post-card" key={post.id}>
                <span className="board-post-number">{posts.length - index}</span>
                <div className="board-post-main">
                  <span className="board-post-category">
                    {t.board.categories[post.category] ?? post.category}
                  </span>
                  <h4>{post.title}</h4>
                  <p>{post.content}</p>
                </div>
                <div className="board-post-meta">
                  <time dateTime={post.createdAt}>
                    {new Intl.DateTimeFormat(t.board.locale).format(
                      new Date(post.createdAt),
                    )}
                  </time>
                  <button
                    type="button"
                    className="board-delete-button"
                    onClick={() => handleDeletePost(post.id)}
                  >
                    {t.board.delete}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state" role="status">
            <span>{t.common.systemMessage}</span>
            <p>{t.board.emptyMessage}</p>
          </div>
        )}
      </section>
    </section>
  )
}

export default Board
