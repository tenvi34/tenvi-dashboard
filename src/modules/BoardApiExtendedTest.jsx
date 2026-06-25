import { useState } from 'react'
import {
  createBoardPost,
  fetchBoardPosts,
  fetchTrashBoardPosts,
  permanentlyDeleteBoardPost,
  restoreBoardPost,
  softDeleteBoardPost,
  updateBoardPost,
} from '../api/boardApi.js'

const DEFAULT_FORM = {
  title: '',
  content: '',
  author: 'TENVI',
  categoryId: 'general',
  pinned: false,
}

const createTextBlock = (content) => ({
  id: crypto.randomUUID(),
  type: 'text',
  content,
})

const createPayload = (form) => ({
  title: form.title,
  content: form.content,
  author: form.author,
  categoryId: form.categoryId,
  pinned: form.pinned,
  blocks: [createTextBlock(form.content)],
})

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function BoardApiExtendedTest() {
  const [activePosts, setActivePosts] = useState([])
  const [trashPosts, setTrashPosts] = useState([])
  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedPost, setSelectedPost] = useState(null)
  const [lastResponse, setLastResponse] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const resetStatus = () => {
    setErrorMessage('')
    setLastResponse(null)
  }

  const resetForm = () => {
    setForm(DEFAULT_FORM)
    setSelectedPost(null)
  }

  const runBoardAction = async (action) => {
    setIsLoading(true)
    resetStatus()

    try {
      return await action()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Board API failed.')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const loadActivePosts = () =>
    runBoardAction(async () => {
      resetForm()
      const posts = await fetchBoardPosts()

      setActivePosts(posts)
      return posts
    })

  const loadTrashPosts = () =>
    runBoardAction(async () => {
      resetForm()
      const posts = await fetchTrashBoardPosts()

      setTrashPosts(posts)
      return posts
    })

  const handleCreate = async (event) => {
    event.preventDefault()
    const createdPost = await runBoardAction(() => createBoardPost(createPayload(form)))

    if (!createdPost) {
      return
    }

    setActivePosts((posts) => [createdPost, ...posts])
    setSelectedPost(createdPost)
    setLastResponse(createdPost)
    setForm(DEFAULT_FORM)
  }

  const handleUpdate = async () => {
    if (!selectedPost) {
      setErrorMessage('Select a post to update.')
      return
    }

    const updatedPost = await runBoardAction(() =>
      updateBoardPost(selectedPost.id, createPayload(form)),
    )

    if (!updatedPost) {
      return
    }

    setActivePosts((posts) =>
      posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
    )
    setSelectedPost(updatedPost)
    setLastResponse(updatedPost)
  }

  const handleSelectPost = (post) => {
    setSelectedPost(post)
    setForm({
      title: post.title ?? '',
      content: post.content ?? '',
      author: post.author ?? 'TENVI',
      categoryId: post.categoryId ?? 'general',
      pinned: Boolean(post.pinned),
    })
    setLastResponse(post)
    setErrorMessage('')
  }

  const handleSoftDelete = async (postId) => {
    const deleted = await runBoardAction(() => softDeleteBoardPost(postId))

    if (deleted !== null) {
      return
    }

    setActivePosts((posts) => posts.filter((post) => post.id !== postId))
    resetForm()
    await loadTrashPosts()
  }

  const handleRestore = async (postId) => {
    const restoredPost = await runBoardAction(() => restoreBoardPost(postId))

    if (!restoredPost) {
      return
    }

    setTrashPosts((posts) => posts.filter((post) => post.id !== postId))
    setActivePosts((posts) => [restoredPost, ...posts])
    setSelectedPost(restoredPost)
    setLastResponse(restoredPost)
  }

  const handlePermanentDelete = async (postId) => {
    const deleted = await runBoardAction(() => permanentlyDeleteBoardPost(postId))

    if (deleted !== null) {
      return
    }

    setTrashPosts((posts) => posts.filter((post) => post.id !== postId))
    resetForm()
  }

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
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
          onClick={loadActivePosts}
          disabled={isLoading}
        >
          게시글 목록
        </button>
        <button
          className="settings-option"
          type="button"
          onClick={loadTrashPosts}
          disabled={isLoading}
        >
          복구함
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
            <span>Author</span>
            <input
              type="text"
              value={form.author}
              onChange={(event) => handleChange('author', event.target.value)}
              placeholder="TENVI"
            />
          </label>
        </div>
        <div className="board-api-test__row">
          <label className="settings-field">
            <span>Content</span>
            <input
              type="text"
              value={form.content}
              onChange={(event) => handleChange('content', event.target.value)}
              placeholder="Text block content"
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
        <div className="board-api-test__compact-actions">
          <label className="board-api-test__checkbox">
            <input
              type="checkbox"
              checked={form.pinned}
              onChange={(event) => handleChange('pinned', event.target.checked)}
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
            disabled={isLoading || !selectedPost}
          >
            수정
          </button>
        </div>
      </form>

      {errorMessage ? (
        <p className="board-api-test__error">{errorMessage}</p>
      ) : null}

      {lastResponse ? (
        <dl className="board-api-test__response">
          <div>
            <dt>title</dt>
            <dd>{lastResponse.title || '-'}</dd>
          </div>
          <div>
            <dt>content</dt>
            <dd>{lastResponse.content || '-'}</dd>
          </div>
          <div>
            <dt>author</dt>
            <dd>{lastResponse.author || '-'}</dd>
          </div>
          <div>
            <dt>categoryId</dt>
            <dd>{lastResponse.categoryId || '-'}</dd>
          </div>
          <div>
            <dt>views</dt>
            <dd>{lastResponse.views ?? 0}</dd>
          </div>
          <div>
            <dt>pinned</dt>
            <dd>{String(Boolean(lastResponse.pinned))}</dd>
          </div>
          <div>
            <dt>createdAt</dt>
            <dd>{formatDateTime(lastResponse.createdAt)}</dd>
          </div>
          <div>
            <dt>updatedAt</dt>
            <dd>{formatDateTime(lastResponse.updatedAt)}</dd>
          </div>
          <div>
            <dt>deletedAt</dt>
            <dd>{formatDateTime(lastResponse.deletedAt)}</dd>
          </div>
        </dl>
      ) : null}

      <div className="board-api-test__columns">
        <div>
          <p className="settings-group-label">Active</p>
          <div className="board-api-test__list">
            {activePosts.map((post) => (
              <article
                className={`board-api-test__item ${
                  selectedPost?.id === post.id ? 'is-selected' : ''
                }`}
                key={post.id}
              >
                <button type="button" onClick={() => handleSelectPost(post)}>
                  <strong>{post.title}</strong>
                  <span>{post.author || 'TENVI'} · {post.views ?? 0} views</span>
                </button>
                <button
                  className="board-api-test__delete"
                  type="button"
                  onClick={() => handleSoftDelete(post.id)}
                  disabled={isLoading}
                >
                  삭제
                </button>
              </article>
            ))}
            {activePosts.length === 0 ? (
              <p className="settings-note">활성 목록이 비어 있습니다.</p>
            ) : null}
          </div>
        </div>

        <div>
          <p className="settings-group-label">Trash</p>
          <div className="board-api-test__list">
            {trashPosts.map((post) => (
              <article className="board-api-test__item" key={post.id}>
                <button type="button" onClick={() => handleSelectPost(post)}>
                  <strong>{post.title}</strong>
                  <span>{formatDateTime(post.deletedAt)}</span>
                </button>
                <div className="board-api-test__item-actions">
                  <button
                    className="board-api-test__delete"
                    type="button"
                    onClick={() => handleRestore(post.id)}
                    disabled={isLoading}
                  >
                    복구
                  </button>
                  <button
                    className="board-api-test__delete"
                    type="button"
                    onClick={() => handlePermanentDelete(post.id)}
                    disabled={isLoading}
                  >
                    영구
                  </button>
                </div>
              </article>
            ))}
            {trashPosts.length === 0 ? (
              <p className="settings-note">복구함이 비어 있습니다.</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}

export default BoardApiExtendedTest
