import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import BoardEditor from './BoardEditor.jsx'
import {
  createBoardDraft,
  createBoardPost,
  deleteBoardPost,
  getBoardImageIds,
  getBoardPostTextContent,
  getRemovedBoardImageIds,
  increaseBoardPostViews,
  normalizeBoardBlocks,
  parseBoardDraft,
  parseBoardPosts,
  updateBoardPost,
} from './boardLogic.js'
import { deleteBoardImages, getBoardImages } from './boardImageStore.js'

const POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts
const DRAFT_STORAGE_KEY = STORAGE_KEYS.boardDraft
const SEARCH_SCOPES = ['title', 'content', 'author']

const createEmptyTextBlock = () => ({
  id: crypto.randomUUID(),
  type: 'text',
  content: '',
})

const getEditableBlocks = (blocks) =>
  blocks.length > 0 ? blocks : [createEmptyTextBlock()]

const createEditableBlocks = (post) => {
  const normalizedBlocks = normalizeBoardBlocks(post?.blocks, post?.content)

  return getEditableBlocks(normalizedBlocks)
}

const hasWritableBody = (blocks) =>
  normalizeBoardBlocks(blocks).some((block) => {
    if (block.type === 'image') {
      return Boolean(block.imageId || block.src)
    }

    return block.content.trim().length > 0
  })

// Board localStorage 게시글 복원
const loadBoardPosts = () => {
  try {
    const rawPosts = localStorage.getItem(POSTS_STORAGE_KEY)

    if (!rawPosts) {
      return []
    }

    return parseBoardPosts(rawPosts)
  } catch {
    return []
  }
}

// 기존 Board localStorage key 보존
const saveBoardPosts = (posts) => {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts))
}

// Board 새 글 draft 복원
const loadBoardDraft = () => {
  try {
    return parseBoardDraft(localStorage.getItem(DRAFT_STORAGE_KEY))
  } catch {
    return null
  }
}

// Board 새 글 draft 자동저장
const saveBoardDraft = (input) => {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createBoardDraft(input)))
}

// Board 새 글 draft 삭제
const deleteBoardDraft = () => {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

function Board({ t }) {
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState(() => [createEmptyTextBlock()])
  const [detailImagePreviews, setDetailImagePreviews] = useState({})
  const [formError, setFormError] = useState('')
  const [view, setView] = useState('list')
  const [selectedPostId, setSelectedPostId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState('title')
  const [draftSaved, setDraftSaved] = useState(() => Boolean(loadBoardDraft()))
  const [posts, setPosts] = useState(() => loadBoardPosts())
  const selectedPost = posts.find((post) => post.id === selectedPostId)
  const selectedPostBlocks = selectedPost ? createEditableBlocks(selectedPost) : []
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasSearchQuery = normalizedSearchQuery.length > 0

  // 상세 화면 imageId preview 복원
  useEffect(() => {
    if (!selectedPost) {
      setDetailImagePreviews({})
      return
    }

    const imageIds = getBoardImageIds(selectedPost.blocks)

    if (imageIds.length === 0) {
      setDetailImagePreviews({})
      return
    }

    let isMounted = true

    getBoardImages(imageIds)
      .then((imagesById) => {
        if (!isMounted) {
          return
        }

        setDetailImagePreviews(
          Object.fromEntries(
            Object.entries(imagesById).map(([imageId, image]) => [
              imageId,
              image.dataUrl,
            ]),
          ),
        )
      })
      .catch(() => {
        if (isMounted) {
          setDetailImagePreviews({})
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedPost])

  // blocks 기반 글도 content 문자열을 통해 기존 검색 흐름 유지
  const filteredPosts = posts.filter((post) => {
    if (!normalizedSearchQuery) {
      return true
    }

    const targetValue = {
      title: post.title,
      content: [post.content ?? '', getBoardPostTextContent(post.blocks)].join(' '),
      author: post.author ?? '',
    }[searchScope]

    return targetValue.toLowerCase().includes(normalizedSearchQuery)
  })

  const formatPostDate = (value, options) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(t.board.locale, options).format(date)
  }

  // 게시글 입력 상태 초기화
  const resetWriteForm = () => {
    setAuthor('')
    setTitle('')
    setBlocks([createEmptyTextBlock()])
    setFormError('')
  }

  // 새 글 작성 화면 변경사항 draft 저장
  const saveCurrentDraft = (nextValues) => {
    saveBoardDraft({
      author,
      title,
      blocks,
      ...nextValues,
    })
    setDraftSaved(true)
  }

  const handleBlocksChange = (nextBlocks, shouldSaveDraft = false) => {
    setBlocks(nextBlocks)
    setFormError('')

    if (shouldSaveDraft) {
      saveCurrentDraft({ blocks: nextBlocks })
    }
  }

  // 게시글 작성
  const handleCreatePost = () => {
    const trimmedAuthor = author.trim()
    const trimmedTitle = title.trim()

    if (!trimmedTitle || !hasWritableBody(blocks)) {
      setFormError(t.board.formRequiredMessage)
      return
    }

    const newPost = createBoardPost({
      author: trimmedAuthor,
      title: trimmedTitle,
      blocks,
    })

    if (!newPost) {
      setFormError(t.board.formRequiredMessage)
      return
    }

    setPosts((currentPosts) => {
      const nextPosts = [newPost, ...currentPosts]
      saveBoardPosts(nextPosts)

      return nextPosts
    })

    deleteBoardDraft()
    setDraftSaved(false)
    resetWriteForm()
    setView('list')
  }

  // 게시글 작성 취소
  const handleCancelWrite = () => {
    resetWriteForm()
    setView('list')
  }

  // 게시글 작성 화면 열기
  const handleOpenWrite = () => {
    const savedDraft = loadBoardDraft()

    if (savedDraft) {
      setAuthor(savedDraft.author)
      setTitle(savedDraft.title)
      setBlocks(getEditableBlocks(savedDraft.blocks))
      setFormError('')
      setDraftSaved(true)
    } else {
      resetWriteForm()
      setDraftSaved(false)
    }

    setSelectedPostId('')
    setView('write')
  }

  // 게시글 수정 화면 열기
  const handleOpenEdit = () => {
    if (!selectedPost) {
      return
    }

    setAuthor(selectedPost.author ?? '')
    setTitle(selectedPost.title)
    setBlocks(createEditableBlocks(selectedPost))
    setFormError('')
    setView('edit')
  }

  // 게시글 수정 취소
  const handleCancelEdit = () => {
    resetWriteForm()
    setView('detail')
  }

  // 게시글 수정 저장
  const handleUpdatePost = () => {
    if (!selectedPost) {
      return
    }

    const trimmedTitle = title.trim()

    if (!trimmedTitle || !hasWritableBody(blocks)) {
      setFormError(t.board.formRequiredMessage)
      return
    }

    const removedImageIds = getRemovedBoardImageIds(selectedPost.blocks, blocks)

    setPosts((currentPosts) => {
      const nextPosts = updateBoardPost(currentPosts, selectedPost.id, {
        author,
        title,
        blocks,
      })

      saveBoardPosts(nextPosts)

      return nextPosts
    })

    deleteBoardImages(removedImageIds).catch(() => {
      // 이미지 정리는 실패해도 게시글 수정 흐름 유지
    })
    resetWriteForm()
    setView('detail')
  }

  // 상세 화면 진입 시 조회수 증가 유지
  const handleOpenDetail = (postId) => {
    setSelectedPostId(postId)
    setPosts((currentPosts) => {
      const nextPosts = increaseBoardPostViews(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
    setView('detail')
  }

  // 게시글 목록으로 이동
  const handleBackToList = () => {
    setSelectedPostId('')
    setView('list')
  }

  // 게시글 삭제
  const handleDeletePost = (postId) => {
    if (!window.confirm(t.board.deleteConfirm)) {
      return
    }

    const targetPost = posts.find((post) => post.id === postId)
    const imageIds = getBoardImageIds(targetPost?.blocks)

    setPosts((currentPosts) => {
      const nextPosts = deleteBoardPost(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
    deleteBoardImages(imageIds).catch(() => {
      // legacy src 이미지는 삭제 대상 아님
    })
    handleBackToList()
  }

  // 새 글 draft 수동 삭제
  const handleDeleteDraft = () => {
    const imageIds = getBoardImageIds(blocks)

    deleteBoardDraft()
    deleteBoardImages(imageIds).catch(() => {
      // draft 삭제는 localStorage 정리를 우선
    })
    setDraftSaved(false)
    resetWriteForm()
  }

  const renderBoardForm = ({ mode }) => {
    const isEditMode = mode === 'edit'

    return (
      <section className="board-section board-compose-panel board-screen">
        <div className="board-section-header board-compose-header">
          <div>
            <p className="module-label">
              {isEditMode ? t.board.editLabel : t.board.composeLabel}
            </p>
            <h3>{isEditMode ? t.board.editTitle : t.board.composeTitle}</h3>
          </div>
          {!isEditMode ? (
            <span className="board-status-chip">
              {draftSaved ? t.board.draftSaved : t.board.draft}
            </span>
          ) : null}
        </div>

        <form
          className="board-form"
          onSubmit={(event) => {
            event.preventDefault()
            if (isEditMode) {
              handleUpdatePost()
              return
            }

            handleCreatePost()
          }}
        >
          <label className="board-field">
            <span>{t.board.authorField}</span>
            <input
              type="text"
              value={author}
              onChange={(event) => {
                const nextAuthor = event.target.value
                setAuthor(nextAuthor)
                setFormError('')

                if (!isEditMode) {
                  saveCurrentDraft({ author: nextAuthor })
                }
              }}
              placeholder={t.board.authorPlaceholder}
            />
          </label>

          <label className="board-field">
            <span>{t.board.titleField}</span>
            <input
              type="text"
              value={title}
              onChange={(event) => {
                const nextTitle = event.target.value
                setTitle(nextTitle)
                setFormError('')

                if (!isEditMode) {
                  saveCurrentDraft({ title: nextTitle })
                }
              }}
              placeholder={t.board.titlePlaceholder}
            />
          </label>

          <div className="board-field">
            <span>{t.board.contentField}</span>
            <BoardEditor
              blocks={blocks}
              onChange={(nextBlocks) => handleBlocksChange(nextBlocks, !isEditMode)}
              t={t}
            />
          </div>

          {formError ? (
            <p className="board-form-message" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="board-form-actions">
            {!isEditMode ? (
              <button
                type="button"
                className="board-secondary-button"
                onClick={handleDeleteDraft}
                disabled={!draftSaved}
              >
                {t.board.deleteDraft}
              </button>
            ) : null}
            <button
              type="submit"
              className="board-primary-button board-submit-button"
            >
              {isEditMode ? t.board.saveEdit : t.board.submit}
            </button>
            <button
              type="button"
              className="board-secondary-button"
              onClick={isEditMode ? handleCancelEdit : handleCancelWrite}
            >
              {t.board.cancel}
            </button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
        <p className="module-meta">{t.board.totalCount(posts.length)}</p>
      </div>

      {view === 'write' ? renderBoardForm({ mode: 'write' }) : null}

      {view === 'edit' ? renderBoardForm({ mode: 'edit' }) : null}

      {view === 'detail' ? (
        <section className="board-cafe-panel board-screen">
          {selectedPost ? (
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
                    className="board-secondary-button"
                    onClick={handleOpenEdit}
                  >
                    {t.board.edit}
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
                {selectedPostBlocks.map((block) => {
                  const imageSource =
                    block.type === 'image'
                      ? block.src || detailImagePreviews[block.imageId] || ''
                      : ''

                  return block.type === 'image' ? (
                    <figure className="board-cafe-image-block" key={block.id}>
                      {imageSource ? <img src={imageSource} alt={block.name} /> : null}
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
      ) : null}

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
              <span className="board-count">
                {hasSearchQuery
                  ? t.board.searchResultCount(filteredPosts.length)
                  : t.board.totalCount(posts.length)}
              </span>
            </div>

            {filteredPosts.length > 0 ? (
              <div className="board-title-list">
                {filteredPosts.map((post, index) => (
                  <button
                    type="button"
                    className="board-title-row"
                    key={post.id}
                    onClick={() => handleOpenDetail(post.id)}
                  >
                    <span className="board-post-number">
                      {filteredPosts.length - index}
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
                <p>
                  {posts.length > 0 && hasSearchQuery
                    ? t.board.noSearchResults
                    : t.board.emptyMessage}
                </p>
              </div>
            )}

            <div className="board-search-panel board-search-panel-bottom" role="search">
              <label className="board-search-field">
                <span>{t.board.searchLabel}</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t.board.searchPlaceholder}
                />
              </label>

              <div
                className="board-search-scope"
                aria-label={t.board.searchScopeLabel}
              >
                {SEARCH_SCOPES.map((scope) => (
                  <button
                    type="button"
                    className={`board-scope-button ${
                      searchScope === scope ? 'is-active' : ''
                    }`}
                    key={scope}
                    onClick={() => setSearchScope(scope)}
                  >
                    {t.board.searchScopes[scope]}
                  </button>
                ))}
              </div>

              {hasSearchQuery ? (
                <button
                  type="button"
                  className="board-secondary-button board-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  {t.board.clearSearch}
                </button>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}

export default Board
