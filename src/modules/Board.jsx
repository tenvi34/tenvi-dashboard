import { useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import {
  createBoardPost,
  deleteBoardPost,
  increaseBoardPostViews,
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
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [view, setView] = useState('list')
  const [selectedPostId, setSelectedPostId] = useState('')

  const [posts, setPosts] = useState(() => loadBoardPosts())
  const selectedPost = posts.find((post) => post.id === selectedPostId)

  const formatPostDate = (value, options) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(t.board.locale, options).format(date)
  }

  const resetWriteForm = () => {
    setAuthor('')
    setTitle('')
    setContent('')
  }

  // 게시글 작성
  const handleCreatePost = () => {
    const trimmedAuthor = author.trim()
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    if (!trimmedTitle || !trimmedContent) {
      return
    }

    const newPost = createBoardPost({
      author: trimmedAuthor,
      title: trimmedTitle,
      content: trimmedContent,
    })

    setPosts((currentPosts) => {
      const nextPosts = [newPost, ...currentPosts]
      saveBoardPosts(nextPosts)

      return nextPosts
    })

    // 저장 후 입력 폼 초기화
    resetWriteForm()
    setView('list')
  }

  // 게시글 작성 취소
  const handleCancelWrite = () => {
    resetWriteForm()
    setView('list')
  }

  const handleOpenWrite = () => {
    resetWriteForm()
    setSelectedPostId('')
    setView('write')
  }

  const handleOpenDetail = (postId) => {
    setSelectedPostId(postId)
    setPosts((currentPosts) => {
      const nextPosts = increaseBoardPostViews(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
    setView('detail')
  }

  const handleBackToList = () => {
    setSelectedPostId('')
    setView('list')
  }

  // 게시글 삭제
  const handleDeletePost = (postId) => {
    setPosts((currentPosts) => {
      const nextPosts = deleteBoardPost(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
    handleBackToList()
  }

  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
        <p className="module-meta">
          {t.board.totalCount(posts.length)}
        </p>
      </div>

      {/* 작성 화면 */}
      {view === 'write' ? (
        <section className="board-section board-compose-panel board-screen">
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
              <span>{t.board.authorField}</span>
              <input
                type="text"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                placeholder={t.board.authorPlaceholder}
              />
            </label>

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

      {/* 상세 화면 */}
      {view === 'detail' ? (
        <section className="board-cafe-panel board-screen">
          {selectedPost ? (
            <>
              <article className="board-cafe-article">
                <h3>{selectedPost.title}</h3>

                <div className="board-cafe-meta-row">
                  <div className="board-cafe-avatar" aria-hidden="true">
                    {(selectedPost.author ?? t.board.unknownAuthor)
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div className="board-cafe-author">
                    <div className="board-cafe-author-line">
                      <strong>{selectedPost.author ?? t.board.unknownAuthor}</strong>
                    </div>
                    <div className="board-cafe-post-info">
                      <time dateTime={selectedPost.createdAt}>
                        {formatPostDate(selectedPost.createdAt, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </time>
                      <span>{t.board.views(selectedPost.views ?? 0)}</span>
                    </div>
                  </div>

                  <div className="board-detail-actions">
                    <button
                      type="button"
                      className="board-secondary-button"
                      onClick={handleBackToList}
                    >
                      {t.board.backToList}
                    </button>
                    <button
                      type="button"
                      className="board-delete-button"
                      onClick={() => handleDeletePost(selectedPost.id)}
                    >
                      {t.board.delete}
                    </button>
                  </div>
                </div>

                <div className="board-cafe-content">
                  <p>{selectedPost.content}</p>
                </div>
              </article>
            </>
          ) : (
            <div className="empty-state" role="status">
              <span>{t.common.systemMessage}</span>
              <p>{t.board.missingPostMessage}</p>
            </div>
          )}
        </section>
      ) : null}

      {/* 목록 화면 */}
      {view === 'list' ? (
        <>
          <div className="board-toolbar">
            <div>
              <p className="module-label">{t.board.archiveLabel}</p>
              <h3>{t.board.listTitle}</h3>
            </div>
            <button
              type="button"
              className="board-primary-button board-write-button"
              onClick={handleOpenWrite}
            >
              {t.board.write}
            </button>
          </div>

          <section className="board-section board-list-panel">
            <div className="board-list-summary">
              <span className="board-count">{t.board.totalCount(posts.length)}</span>
            </div>

            {posts.length > 0 ? (
              <div className="board-title-list">
                {posts.map((post, index) => (
                  <button
                    type="button"
                    className="board-title-row"
                    key={post.id}
                    onClick={() => handleOpenDetail(post.id)}
                  >
                    <span className="board-post-number">
                      {posts.length - index}
                    </span>
                    <span className="board-title-text">{post.title}</span>
                    <time className="board-title-date" dateTime={post.createdAt}>
                      {formatPostDate(post.createdAt, {
                        dateStyle: 'medium',
                      })}
                    </time>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state" role="status">
                <span>{t.common.systemMessage}</span>
                <p>{t.board.emptyMessage}</p>
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  )
}

export default Board
