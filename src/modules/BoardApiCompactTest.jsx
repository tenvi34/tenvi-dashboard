import { useState } from 'react'
import {
  createBoardPost,
  deleteBoardPost,
  fetchBoardPosts,
  updateBoardPost,
} from '../api/boardApi.js'

const DEFAULT_FORM = {
  title: '',
  content: '',
  categoryId: '',
  isPinned: false,
}

// 기존 Board 화면과 분리된 백엔드 API 간이 테스트 카드
function BoardApiCompactTest() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedPostId, setSelectedPostId] = useState('')
  const [resultMessage, setResultMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const resetStatus = () => {
    setResultMessage('')
    setErrorMessage('')
  }

  const loadPosts = async () => {
    setIsLoading(true)
    resetStatus()
    setSelectedPostId('')
    setForm(DEFAULT_FORM)

    try {
      const nextPosts = await fetchBoardPosts()

      setPosts(nextPosts)
      setResultMessage(`Loaded ${nextPosts.length} posts.`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Board API failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    resetStatus()

    try {
      const createdPost = await createBoardPost(form)

      setPosts((currentPosts) => [createdPost, ...currentPosts])
      setSelectedPostId(createdPost.id)
      setForm(DEFAULT_FORM)
      setResultMessage('Created.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Create failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPost = (post) => {
    setSelectedPostId(post.id)
    setForm({
      title: post.title ?? '',
      content: post.content ?? '',
      categoryId: post.categoryId ?? '',
      isPinned: Boolean(post.isPinned),
    })
    resetStatus()
  }

  const handleUpdate = async () => {
    if (!selectedPostId) {
      setErrorMessage('Select a post to update.')
      return
    }

    setIsLoading(true)
    resetStatus()

    try {
      const updatedPost = await updateBoardPost(selectedPostId, form)

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === updatedPost.id ? updatedPost : post,
        ),
      )
      setResultMessage('Updated.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Update failed.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (postId) => {
    setIsLoading(true)
    resetStatus()

    try {
      await deleteBoardPost(postId)
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))

      if (selectedPostId === postId) {
        setSelectedPostId('')
        setForm(DEFAULT_FORM)
      }

      setResultMessage('Deleted.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Delete failed.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="settings-panel board-api-test">
      <div className="settings-panel-header">
        <p className="module-label">Board API</p>
        <h3>Board API 테스트</h3>
      </div>

      <div className="board-api-test__actions">
        <button
          className="settings-option"
          type="button"
          onClick={loadPosts}
          disabled={isLoading}
        >
          목록 새로고침
        </button>
      </div>

      <form className="board-api-test__form" onSubmit={handleCreate}>
        <div className="board-api-test__row">
          <label className="settings-field">
            <span>Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="Title"
            />
          </label>
          <label className="settings-field">
            <span>CategoryId</span>
            <input
              type="text"
              value={form.categoryId}
              onChange={(event) => handleChange('categoryId', event.target.value)}
              placeholder="general"
            />
          </label>
        </div>
        <label className="settings-field">
          <span>Content</span>
          <input
            type="text"
            value={form.content}
            onChange={(event) => handleChange('content', event.target.value)}
            placeholder="Content"
          />
        </label>
        <div className="board-api-test__compact-actions">
          <label className="board-api-test__checkbox">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(event) => handleChange('isPinned', event.target.checked)}
            />
            <span>Pinned</span>
          </label>
          <button className="settings-option" type="submit" disabled={isLoading}>
            생성
          </button>
          <button
            className="settings-option"
            type="button"
            onClick={handleUpdate}
            disabled={isLoading || !selectedPostId}
          >
            수정
          </button>
        </div>
      </form>

      {resultMessage ? (
        <p className="board-api-test__status">{resultMessage}</p>
      ) : null}

      {errorMessage ? (
        <p className="board-api-test__error">{errorMessage}</p>
      ) : null}

      <div className="board-api-test__list" aria-label="Board API posts">
        {posts.length > 0 ? (
          posts.map((post) => (
            <article
              className={`board-api-test__item ${
                selectedPostId === post.id ? 'is-selected' : ''
              }`}
              key={post.id}
            >
              <button type="button" onClick={() => handleSelectPost(post)}>
                <strong>{post.title}</strong>
                <span>{post.categoryId || '-'}</span>
              </button>
              <button
                className="board-api-test__delete"
                type="button"
                onClick={() => handleDelete(post.id)}
                disabled={isLoading}
              >
                삭제
              </button>
            </article>
          ))
        ) : (
          <p className="settings-note">목록이 비어 있습니다.</p>
        )}
      </div>
    </section>
  )
}

export default BoardApiCompactTest
