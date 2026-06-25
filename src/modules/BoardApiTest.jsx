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
  categoryId: 'general',
  isPinned: false,
}

// 기존 Board 화면과 분리된 백엔드 API 임시 테스트 카드
function BoardApiTest() {
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

    try {
      const nextPosts = await fetchBoardPosts()

      setPosts(nextPosts)
      setResultMessage(`게시글 ${nextPosts.length}개를 불러왔습니다.`)
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
      setResultMessage('게시글을 생성했습니다.')
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
      categoryId: post.categoryId ?? 'general',
      isPinned: Boolean(post.isPinned),
    })
    resetStatus()
  }

  const handleUpdate = async () => {
    if (!selectedPostId) {
      setErrorMessage('수정할 게시글을 선택해주세요.')
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
      setResultMessage('게시글을 수정했습니다.')
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

      setResultMessage('게시글을 삭제했습니다.')
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
          목록 불러오기
        </button>
      </div>

      <form className="board-api-test__form" onSubmit={handleCreate}>
        <label className="settings-field">
          <span>Title</span>
          <input
            type="text"
            value={form.title}
            onChange={(event) => handleChange('title', event.target.value)}
            placeholder="게시글 제목"
          />
        </label>
        <label className="settings-field">
          <span>Content</span>
          <textarea
            value={form.content}
            onChange={(event) => handleChange('content', event.target.value)}
            rows={3}
            placeholder="게시글 내용"
          />
        </label>
        <div className="board-api-test__row">
          <label className="settings-field">
            <span>CategoryId</span>
            <input
              type="text"
              value={form.categoryId}
              onChange={(event) => handleChange('categoryId', event.target.value)}
              placeholder="general"
            />
          </label>
          <label className="board-api-test__checkbox">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(event) => handleChange('isPinned', event.target.checked)}
            />
            <span>Pinned</span>
          </label>
        </div>
        <div className="board-api-test__actions">
          <button className="settings-option" type="submit" disabled={isLoading}>
            생성
          </button>
          <button
            className="settings-option"
            type="button"
            onClick={handleUpdate}
            disabled={isLoading || !selectedPostId}
          >
            선택 글 수정
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
          <p className="settings-note">불러온 게시글이 없습니다.</p>
        )}
      </div>
    </section>
  )
}

export default BoardApiTest
