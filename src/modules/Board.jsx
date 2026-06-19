import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import BoardEditor from './BoardEditor.jsx'
import {
  BOARD_SORT_OPTIONS,
  DEFAULT_BOARD_CATEGORY_ID,
  addBoardCategory,
  createBoardDraft,
  createBoardPost,
  deleteBoardCategory,
  deleteBoardPost,
  getBoardCategoryName,
  getBoardImageIds,
  getBoardPostTextContent,
  getPostCategoryId,
  getRemovedBoardImageIds,
  increaseBoardPostViews,
  movePostsToDefaultCategory,
  normalizeBoardBlocks,
  parseBoardCategories,
  parseBoardDraft,
  parseBoardPosts,
  sortBoardPosts,
  toggleBoardPostPinned,
  updateBoardCategory,
  updateBoardPost,
} from './boardLogic.js'
import { deleteBoardImages, getBoardImages } from './boardImageStore.js'

const POSTS_STORAGE_KEY = STORAGE_KEYS.boardPosts
const DRAFT_STORAGE_KEY = STORAGE_KEYS.boardDraft
const DRAFTS_STORAGE_KEY = STORAGE_KEYS.boardDrafts
const CATEGORIES_STORAGE_KEY = STORAGE_KEYS.boardCategories
const CATEGORY_FILTER_ALL = 'all'
const SEARCH_SCOPES = ['title', 'content', 'author']
const LEGACY_DRAFT_ID = 'legacy-board-draft'
const MAX_BOARD_DRAFTS = 10

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

// 임시저장 목록 본문 단서
const getDraftPreviewText = (draft) => {
  const textContent = getBoardPostTextContent(draft?.blocks)

  if (textContent) {
    return textContent.split('\n').find((line) => line.trim())?.trim() ?? ''
  }

  return ''
}

const getBoardDraftTime = (draft) => {
  const time = new Date(draft?.savedAt).getTime()

  return Number.isNaN(time) ? 0 : time
}

// draft 최신순 유지와 최대 개수 제한
const limitBoardDrafts = (drafts) =>
  drafts
    .filter(Boolean)
    .sort((firstDraft, secondDraft) => getBoardDraftTime(secondDraft) - getBoardDraftTime(firstDraft))
    .slice(0, MAX_BOARD_DRAFTS)

// draft 목록 식별자 생성
const createBoardDraftId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 다중 draft record 정규화
const createBoardDraftRecord = (input, draftId) => ({
  ...createBoardDraft(input),
  id: draftId || createBoardDraftId(),
})

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

    return rawPosts ? parseBoardPosts(rawPosts) : []
  } catch {
    return []
  }
}

// 기존 Board localStorage key 보존
const saveBoardPosts = (posts) => {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts))
}

// Board 카테고리 localStorage 복원
const loadBoardCategories = () => {
  try {
    return parseBoardCategories(localStorage.getItem(CATEGORIES_STORAGE_KEY))
  } catch {
    return parseBoardCategories()
  }
}

// Board 카테고리 저장
const saveBoardCategories = (categories) => {
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
}

// Board 새 글 draft 복원
const loadBoardDraft = () => {
  try {
    return parseBoardDraft(localStorage.getItem(DRAFT_STORAGE_KEY))
  } catch {
    return null
  }
}

// Board 다중 draft 복원과 legacy draft 병합
const loadBoardDrafts = () => {
  try {
    const rawDrafts = localStorage.getItem(DRAFTS_STORAGE_KEY)
    const parsedDrafts = rawDrafts ? JSON.parse(rawDrafts) : []
    const draftRecords = Array.isArray(parsedDrafts)
      ? parsedDrafts
          .map((draft) => {
            const parsedDraft = parseBoardDraft(JSON.stringify(draft))

            return parsedDraft
              ? {
                  ...parsedDraft,
                  id: String(draft?.id || createBoardDraftId()),
                }
              : null
          })
          .filter(Boolean)
      : []
    const rawLegacyDraft = localStorage.getItem(DRAFT_STORAGE_KEY)
    const legacyDraft = rawLegacyDraft ? parseBoardDraft(rawLegacyDraft) : null

    if (legacyDraft) {
      let legacyDraftId = LEGACY_DRAFT_ID

      try {
        const parsedLegacyDraft = JSON.parse(rawLegacyDraft)

        legacyDraftId = String(parsedLegacyDraft?.id || LEGACY_DRAFT_ID)
      } catch {
        legacyDraftId = LEGACY_DRAFT_ID
      }

      const hasLegacyDraft = draftRecords.some((draft) => draft.id === legacyDraftId)

      if (!hasLegacyDraft) {
        draftRecords.push({
          ...legacyDraft,
          id: legacyDraftId,
        })
      }
    }

    return limitBoardDrafts(draftRecords)
  } catch {
    const legacyDraft = loadBoardDraft()

    return legacyDraft
      ? [
          {
            ...legacyDraft,
            id: LEGACY_DRAFT_ID,
          },
        ]
      : []
  }
}

// Board draft 목록 저장
const saveBoardDrafts = (drafts) => {
  const nextDrafts = limitBoardDrafts(drafts)

  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts))

  return nextDrafts
}

const saveBoardDraft = (input, draftId) => {
  const nextDraft = createBoardDraftRecord(input, draftId)

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft))

  return nextDraft
}

// Board 새 글 draft 삭제
const deleteBoardDraft = () => {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

function Board({ t }) {
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(DEFAULT_BOARD_CATEGORY_ID)
  const [blocks, setBlocks] = useState(() => [createEmptyTextBlock()])
  const [categories, setCategories] = useState(() => loadBoardCategories())
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER_ALL)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [categoryNameInput, setCategoryNameInput] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [detailImagePreviews, setDetailImagePreviews] = useState({})
  const [formError, setFormError] = useState('')
  const [view, setView] = useState('list')
  const [selectedPostId, setSelectedPostId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState('title')
  const [sortMode, setSortMode] = useState('latest')
  const [draftList, setDraftList] = useState(() => loadBoardDrafts())
  const [activeDraftId, setActiveDraftId] = useState('')
  const [draftPickerOpen, setDraftPickerOpen] = useState(false)
  const [posts, setPosts] = useState(() => loadBoardPosts())
  const selectedPost = posts.find((post) => post.id === selectedPostId)
  const selectedPostBlocks = selectedPost ? createEditableBlocks(selectedPost) : []
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasSearchQuery = normalizedSearchQuery.length > 0
  const activeDraft = draftList.find((draft) => draft.id === activeDraftId)
  const draftSaved = Boolean(activeDraft)

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

  // 카테고리 필터와 검색 동시 적용
  const filteredPosts = posts.filter((post) => {
    const postCategoryId = getPostCategoryId(post, categories)

    if (categoryFilter !== CATEGORY_FILTER_ALL && postCategoryId !== categoryFilter) {
      return false
    }

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
  // 필터 결과만 정렬해 원본 저장 순서와 localStorage 데이터 보존
  const sortedPosts = sortBoardPosts(filteredPosts, sortMode)

  const formatPostDate = (value, options) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return new Intl.DateTimeFormat(t.board.locale, options).format(date)
  }

  const formatDraftSavedAt = (value) =>
    value
      ? formatPostDate(value, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : ''

  // 게시글 입력 상태 초기화
  const resetWriteForm = () => {
    setAuthor('')
    setTitle('')
    setCategoryId(DEFAULT_BOARD_CATEGORY_ID)
    setBlocks([createEmptyTextBlock()])
    setFormError('')
  }

  // 새 글 작성 화면 변경사항 draft 저장
  const removeDraftFromList = (draftId) => {
    if (!draftId) {
      return draftList
    }

    const nextDrafts = draftList.filter((draft) => draft.id !== draftId)

    const limitedDrafts = saveBoardDrafts(nextDrafts)

    setDraftList(limitedDrafts)

    return limitedDrafts
  }

  const saveCurrentDraft = (nextValues) => {
    const nextDraftId = activeDraftId || createBoardDraftId()
    const nextDraft = saveBoardDraft({
      author,
      title,
      categoryId,
      blocks,
      ...nextValues,
    }, nextDraftId)
    const nextDrafts = [
      nextDraft,
      ...draftList.filter((draft) => draft.id !== nextDraft.id),
    ]

    const limitedDrafts = saveBoardDrafts(nextDrafts)

    setActiveDraftId(nextDraft.id)
    setDraftList(limitedDrafts)
  }

  const hasCurrentDraftInput = () =>
    author.trim().length > 0 || title.trim().length > 0 || hasWritableBody(blocks)

  const handleLoadDraft = (draft) => {
    if (!draft) {
      return
    }

    if (
      draft.id !== activeDraftId &&
      hasCurrentDraftInput() &&
      !window.confirm(t.board.loadDraftConfirm)
    ) {
      return
    }

    if (draft.id !== activeDraftId && hasCurrentDraftInput()) {
      saveCurrentDraft({})
    }

    restoreDraftToForm(draft)
  }

  const handleDeleteAllDrafts = () => {
    if (draftList.length === 0 || !window.confirm(t.board.clearDraftsConfirm)) {
      return
    }

    const imageIds = [...new Set(draftList.flatMap((draft) => getBoardImageIds(draft.blocks)))]

    deleteBoardDraft()
    saveBoardDrafts([])
    setDraftList([])
    setActiveDraftId('')
    setDraftPickerOpen(false)
    resetWriteForm()
    deleteBoardImages(imageIds).catch(() => {
      // 전체 draft 삭제는 localStorage 정리를 우선
    })
  }

  const handleBlocksChange = (nextBlocks, shouldSaveDraft = false) => {
    setBlocks(nextBlocks)
    setFormError('')

    if (shouldSaveDraft) {
      saveCurrentDraft({ blocks: nextBlocks })
    }
  }

  // 카테고리 선택 변경
  const handleCategoryChange = (nextCategoryId, shouldSaveDraft = false) => {
    setCategoryId(nextCategoryId)
    setFormError('')

    if (shouldSaveDraft) {
      saveCurrentDraft({ categoryId: nextCategoryId })
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
      categoryId,
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
    removeDraftFromList(activeDraftId)
    setActiveDraftId('')
    setDraftPickerOpen(false)
    resetWriteForm()
    setView('list')
  }

  // 게시글 작성 취소
  const handleCancelWrite = () => {
    resetWriteForm()
    setActiveDraftId('')
    setDraftPickerOpen(false)
    setView('list')
  }

  // 게시글 작성 화면 열기
  const restoreDraftToForm = (savedDraft) => {
    setAuthor(savedDraft.author)
    setTitle(savedDraft.title)
    setCategoryId(getPostCategoryId(savedDraft, categories))
    setBlocks(getEditableBlocks(savedDraft.blocks))
    setFormError('')
    setActiveDraftId(savedDraft.id)
    setDraftPickerOpen(false)
  }

  // 저장된 draft가 있을 때 이어쓰기와 새 글 시작을 분리
  const handleOpenWrite = () => {
    resetWriteForm()
    setDraftList(loadBoardDrafts())
    setActiveDraftId('')
    setDraftPickerOpen(false)
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
    setCategoryId(getPostCategoryId(selectedPost, categories))
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
        categoryId,
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

  // 고정 상태만 전환해 기존 게시글 내용과 저장 key 보존
  const handleTogglePinned = (postId) => {
    setPosts((currentPosts) => {
      const nextPosts = toggleBoardPostPinned(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
  }

  // 새 글 draft 수동 삭제
  const handleDeleteDraft = (targetDraft = activeDraft) => {
    const imageIds = getBoardImageIds(targetDraft?.blocks ?? blocks)

    deleteBoardDraft()
    deleteBoardImages(imageIds).catch(() => {
      // draft 삭제는 localStorage 정리를 우선
    })
    removeDraftFromList(targetDraft?.id)

    if (!targetDraft || targetDraft.id === activeDraftId) {
      setActiveDraftId('')
      resetWriteForm()
    }
  }

  // 카테고리 추가
  const handleAddCategory = () => {
    const nextCategories = addBoardCategory(categories, categoryNameInput)

    if (nextCategories.length === categories.length) {
      setCategoryError(t.board.categoryInvalidMessage)
      return
    }

    setCategories(nextCategories)
    saveBoardCategories(nextCategories)
    setCategoryNameInput('')
    setCategoryError('')
  }

  // 카테고리 수정
  const handleUpdateCategory = (targetCategoryId) => {
    const nextCategories = updateBoardCategory(
      categories,
      targetCategoryId,
      editingCategoryName,
    )

    if (nextCategories === categories || nextCategories.length !== categories.length) {
      setCategoryError(t.board.categoryInvalidMessage)
      return
    }

    setCategories(nextCategories)
    saveBoardCategories(nextCategories)
    setEditingCategoryId('')
    setEditingCategoryName('')
    setCategoryError('')
  }

  // 카테고리 삭제 후 게시글 general 이동
  const handleDeleteCategory = (targetCategoryId) => {
    if (targetCategoryId === DEFAULT_BOARD_CATEGORY_ID) {
      return
    }

    const nextCategories = deleteBoardCategory(categories, targetCategoryId)
    const nextPosts = movePostsToDefaultCategory(posts, targetCategoryId, categories)

    setCategories(nextCategories)
    saveBoardCategories(nextCategories)
    setPosts(nextPosts)
    saveBoardPosts(nextPosts)
    setCategoryFilter((currentFilter) =>
      currentFilter === targetCategoryId ? CATEGORY_FILTER_ALL : currentFilter,
    )
    setCategoryError('')
  }

  const renderCategorySelect = ({ isEditMode }) => (
    <label className="board-field">
      <span>{t.board.categoryField}</span>
      <select
        value={categoryId}
        onChange={(event) => handleCategoryChange(event.target.value, !isEditMode)}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  )

  const renderBoardForm = ({ mode }) => {
    const isEditMode = mode === 'edit'
    const boardFormId = isEditMode ? 'board-edit-form' : 'board-write-form'

    return (
      <section className="board-section board-compose-panel board-screen">
        <form
          id={boardFormId}
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
          <div className="board-compose-fixed">
            <div className="board-section-header board-compose-header">
              <div>
                <p className="module-label">
                  {isEditMode ? t.board.editLabel : t.board.composeLabel}
                </p>
                <h3>{isEditMode ? t.board.editTitle : t.board.composeTitle}</h3>
              </div>
              <div className="board-compose-header-actions">
                {!isEditMode ? (
                  <span className="board-status-chip">
                    {draftSaved && formatDraftSavedAt(activeDraft.savedAt)
                      ? t.board.draftSavedAt(formatDraftSavedAt(activeDraft.savedAt))
                      : draftSaved
                        ? t.board.draftSaved
                        : t.board.draft}
                  </span>
                ) : null}
                {!isEditMode ? (
                  <button
                    type="button"
                    className="board-secondary-button"
                    onClick={() => setDraftPickerOpen((isOpen) => !isOpen)}
                    disabled={draftList.length === 0}
                  >
                    {t.board.loadDraft}
                  </button>
                ) : null}
                {!isEditMode ? (
                  <button
                    type="button"
                    className="board-secondary-button"
                    onClick={() => handleDeleteDraft()}
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
            </div>

            {!isEditMode && draftPickerOpen ? (
              <div className="board-draft-picker" aria-label={t.board.draftPickerLabel}>
                <div className="board-draft-picker-header">
                  <p className="module-label">{t.board.draftPickerLabel}</p>
                  <div className="board-draft-picker-actions">
                    <span className="board-count">
                      {t.board.draftCount(draftList.length)}
                    </span>
                    <button
                      type="button"
                      className="board-secondary-button"
                      onClick={handleDeleteAllDrafts}
                    >
                      {t.board.clearDrafts}
                    </button>
                  </div>
                </div>
                {draftList.length > 0 ? (
                  <div className="board-draft-list">
                    {draftList.map((draft) => {
                      const previewText = getDraftPreviewText(draft)
                      const hasImages = getBoardImageIds(draft.blocks).length > 0
                      const savedAt = formatDraftSavedAt(draft.savedAt)

                      return (
                        <div className="board-draft-item" key={draft.id}>
                          <button
                            type="button"
                            className={`board-draft-load-button ${
                              draft.id === activeDraftId ? 'is-active' : ''
                            }`}
                            onClick={() => handleLoadDraft(draft)}
                          >
                            <strong>{draft.title.trim() || t.board.untitledDraft}</strong>
                            <span>
                              {previewText
                                ? t.board.draftPreview(previewText)
                                : hasImages
                                  ? t.board.imageDraftPreview
                                  : t.board.emptyDraftPreview}
                            </span>
                            <div className="board-draft-item-meta">
                              {hasImages ? (
                                <em className="board-draft-image-badge">
                                  {t.board.imageDraftBadge}
                                </em>
                              ) : null}
                              {savedAt ? <small>{t.board.draftSavedAt(savedAt)}</small> : null}
                            </div>
                          </button>
                          <button
                            type="button"
                            className="board-delete-button"
                            onClick={() => handleDeleteDraft(draft)}
                          >
                            {t.board.deleteDraft}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="board-draft-empty">{t.board.noDrafts}</p>
                )}
              </div>
            ) : null}

            <div className="board-compose-meta">
              {renderCategorySelect({ isEditMode })}

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
            </div>
          </div>

          <div className="board-compose-scroll">
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
              <div className="board-cafe-title-row">
                <h3>{selectedPost.title}</h3>
                <div className="board-cafe-badges">
                  <span className="board-category-badge">
                    {getBoardCategoryName(
                      getPostCategoryId(selectedPost, categories),
                      categories,
                    )}
                  </span>
                  {selectedPost.pinned === true ? (
                    <span className="board-pinned-badge">{t.board.pinned}</span>
                  ) : null}
                </div>
              </div>

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
                    className={`board-secondary-button board-pin-button ${
                      selectedPost.pinned === true ? 'is-active' : ''
                    }`}
                    onClick={() => handleTogglePinned(selectedPost.id)}
                  >
                    {selectedPost.pinned === true ? t.board.unpin : t.board.pin}
                  </button>
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
            <div className="board-list-controls">
              <div className="board-category-filter" aria-label={t.board.categoryFilterLabel}>
                <button
                  type="button"
                  className={`board-category-chip ${
                    categoryFilter === CATEGORY_FILTER_ALL ? 'is-active' : ''
                  }`}
                  onClick={() => setCategoryFilter(CATEGORY_FILTER_ALL)}
                >
                  {t.board.allCategories}
                </button>
                {categories.map((category) => (
                  <button
                    type="button"
                    className={`board-category-chip ${
                      categoryFilter === category.id ? 'is-active' : ''
                    }`}
                    key={category.id}
                    onClick={() => setCategoryFilter(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="board-secondary-button board-category-toggle"
                onClick={() => setCategoryManagerOpen((isOpen) => !isOpen)}
              >
                {t.board.categoryManage}
              </button>

              <div className="board-list-summary">
                <span className="board-count">
                  {hasSearchQuery || categoryFilter !== CATEGORY_FILTER_ALL
                    ? t.board.searchResultCount(sortedPosts.length)
                    : t.board.totalCount(posts.length)}
                </span>
                <label className="board-sort-field">
                  <span>{t.board.sortLabel}</span>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value)}
                  >
                    {BOARD_SORT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {t.board.sortOptions[option.id]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {categoryManagerOpen ? (
              <div className="board-category-manager">
                <div className="board-category-form">
                  <input
                    type="text"
                    value={categoryNameInput}
                    onChange={(event) => {
                      setCategoryNameInput(event.target.value)
                      setCategoryError('')
                    }}
                    placeholder={t.board.categoryNamePlaceholder}
                  />
                  <button
                    type="button"
                    className="board-secondary-button"
                    onClick={handleAddCategory}
                  >
                    {t.board.categoryAdd}
                  </button>
                </div>

                {categoryError ? (
                  <p className="board-form-message" role="alert">
                    {categoryError}
                  </p>
                ) : null}

                <div className="board-category-list">
                  {categories.map((category) => {
                    const isEditing = editingCategoryId === category.id
                    const isGeneral = category.id === DEFAULT_BOARD_CATEGORY_ID

                    return (
                      <div className="board-category-item" key={category.id}>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(event) =>
                              setEditingCategoryName(event.target.value)
                            }
                          />
                        ) : (
                          <span>{category.name}</span>
                        )}
                        <div className="board-category-actions">
                          {isEditing ? (
                            <button
                              type="button"
                              className="board-secondary-button"
                              onClick={() => handleUpdateCategory(category.id)}
                            >
                              {t.board.categorySave}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="board-secondary-button"
                              onClick={() => {
                                setEditingCategoryId(category.id)
                                setEditingCategoryName(category.name)
                                setCategoryError('')
                              }}
                            >
                              {t.board.categoryEdit}
                            </button>
                          )}
                          <button
                            type="button"
                            className="board-delete-button"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={isGeneral}
                          >
                            {t.board.categoryDelete}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {sortedPosts.length > 0 ? (
              <div className="board-title-list">
                {sortedPosts.map((post, index) => {
                  const postCategoryId = getPostCategoryId(post, categories)

                  return (
                    <button
                      type="button"
                      className="board-title-row"
                      key={post.id}
                      onClick={() => handleOpenDetail(post.id)}
                    >
                      <span className="board-post-number">
                        {sortedPosts.length - index}
                      </span>
                      <span className="board-title-text">
                        {post.pinned === true ? (
                          <span className="board-pinned-badge">{t.board.pinned}</span>
                        ) : null}
                        <span className="board-title-label">{post.title}</span>
                      </span>
                      <span className="board-category-badge">
                        {getBoardCategoryName(postCategoryId, categories)}
                      </span>
                      <span className="board-title-views">
                        {t.board.views(post.views ?? 0)}
                      </span>
                      <time className="board-title-date" dateTime={post.createdAt}>
                        {formatPostDate(post.createdAt, {
                          dateStyle: 'medium',
                        })}
                      </time>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state" role="status">
                <span>{t.common.systemMessage}</span>
                <p>
                  {posts.length > 0 && (hasSearchQuery || categoryFilter !== CATEGORY_FILTER_ALL)
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
