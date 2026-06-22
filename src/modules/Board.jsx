import { useState } from 'react'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import BoardDetail from './board/BoardDetail.jsx'
import BoardForm from './board/BoardForm.jsx'
import BoardImageLightbox from './board/BoardImageLightbox.jsx'
import BoardList from './board/BoardList.jsx'
import useBoardDetailImages from './board/useBoardDetailImages.js'
import './Board.css'
import {
  DEFAULT_BOARD_CATEGORY_ID,
  addBoardCategory,
  createBoardDraft,
  createBoardPost,
  deleteBoardCategory,
  deleteBoardPost,
  getBoardImageIds,
  getBoardPostTextContent,
  getPostCategoryId,
  getRemovedBoardImageIds,
  increaseBoardPostViews,
  movePostsToDefaultCategory,
  moveBoardPostToTrash,
  normalizeBoardBlocks,
  parseBoardCategories,
  parseBoardDraft,
  parseBoardPosts,
  restoreBoardPost,
  sortBoardPosts,
  toggleBoardPostPinned,
  updateBoardCategory,
  updateBoardPost,
} from './boardLogic.js'
import { deleteBoardImages } from './boardImageStore.js'

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
  const [trashOpen, setTrashOpen] = useState(false)
  const [categoryNameInput, setCategoryNameInput] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
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
  const activePosts = posts.filter((post) => !post.deletedAt)
  const trashedPosts = posts.filter((post) => post.deletedAt)
  const selectedPost = activePosts.find((post) => post.id === selectedPostId)
  const selectedPostBlocks = selectedPost ? createEditableBlocks(selectedPost) : []
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasSearchQuery = normalizedSearchQuery.length > 0
  const activeDraft = draftList.find((draft) => draft.id === activeDraftId)
  const draftSaved = Boolean(activeDraft)
  const { detailImagePreviews, imageViewer, setImageViewer } =
    useBoardDetailImages(selectedPost)

  const filteredPosts = activePosts.filter((post) => {
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
    setImageViewer(null)
    setView('list')
  }

  // 게시글 삭제
  const handleDeletePost = (postId) => {
    if (!window.confirm(t.board.deleteConfirm)) {
      return
    }

    setPosts((currentPosts) => {
      const nextPosts = moveBoardPostToTrash(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
    handleBackToList()
  }

  // 고정 상태만 전환해 기존 게시글 내용과 저장 key 보존
  const handleRestorePost = (postId) => {
    setPosts((currentPosts) => {
      const nextPosts = restoreBoardPost(currentPosts, postId)
      saveBoardPosts(nextPosts)

      return nextPosts
    })
  }

  const handlePermanentDeletePost = (postId) => {
    if (!window.confirm(t.board.permanentDeleteConfirm)) {
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
      // 영구 삭제 시점에만 IndexedDB 이미지 정리
    })
  }

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

  // 작성자 수정
  const handleAuthorChange = (nextAuthor, shouldSaveDraft = false) => {
    setAuthor(nextAuthor)
    setFormError('')

    if (shouldSaveDraft) {
      saveCurrentDraft({ author: nextAuthor })
    }
  }

  // 제목 수정
  const handleTitleChange = (nextTitle, shouldSaveDraft = false) => {
    setTitle(nextTitle)
    setFormError('')

    if (shouldSaveDraft) {
      saveCurrentDraft({ title: nextTitle })
    }
  }

  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
        <p className="module-meta">{t.board.totalCount(activePosts.length)}</p>
      </div>

      {view === 'write' ? (
        <BoardForm
          activeDraft={activeDraft}
          activeDraftId={activeDraftId}
          author={author}
          blocks={blocks}
          categories={categories}
          categoryId={categoryId}
          draftList={draftList}
          draftPickerOpen={draftPickerOpen}
          draftSaved={draftSaved}
          formError={formError}
          formatDraftSavedAt={formatDraftSavedAt}
          getDraftPreviewText={getDraftPreviewText}
          mode="write"
          onAuthorChange={handleAuthorChange}
          onBlocksChange={handleBlocksChange}
          onCancel={handleCancelWrite}
          onCategoryChange={handleCategoryChange}
          onDeleteAllDrafts={handleDeleteAllDrafts}
          onDeleteDraft={handleDeleteDraft}
          onDraftPickerToggle={() => setDraftPickerOpen((isOpen) => !isOpen)}
          onLoadDraft={handleLoadDraft}
          onSubmit={handleCreatePost}
          onTitleChange={handleTitleChange}
          t={t}
          title={title}
        />
      ) : null}

      {view === 'edit' ? (
        <BoardForm
          activeDraft={activeDraft}
          activeDraftId={activeDraftId}
          author={author}
          blocks={blocks}
          categories={categories}
          categoryId={categoryId}
          draftList={draftList}
          draftPickerOpen={draftPickerOpen}
          draftSaved={draftSaved}
          formError={formError}
          formatDraftSavedAt={formatDraftSavedAt}
          getDraftPreviewText={getDraftPreviewText}
          mode="edit"
          onAuthorChange={handleAuthorChange}
          onBlocksChange={handleBlocksChange}
          onCancel={handleCancelEdit}
          onCategoryChange={handleCategoryChange}
          onDeleteAllDrafts={handleDeleteAllDrafts}
          onDeleteDraft={handleDeleteDraft}
          onDraftPickerToggle={() => setDraftPickerOpen((isOpen) => !isOpen)}
          onLoadDraft={handleLoadDraft}
          onSubmit={handleUpdatePost}
          onTitleChange={handleTitleChange}
          t={t}
          title={title}
        />
      ) : null}

      {view === 'detail' ? (
        <BoardDetail
          categories={categories}
          detailImagePreviews={detailImagePreviews}
          formatPostDate={formatPostDate}
          onBackToList={handleBackToList}
          onDeletePost={handleDeletePost}
          onImageViewerOpen={setImageViewer}
          onOpenEdit={handleOpenEdit}
          onTogglePinned={handleTogglePinned}
          post={selectedPost}
          postBlocks={selectedPostBlocks}
          t={t}
        />
      ) : null}

      <BoardImageLightbox
        imageViewer={imageViewer}
        onClose={() => setImageViewer(null)}
        t={t}
      />

      {view === 'list' ? (
        <BoardList
          activePosts={activePosts}
          categories={categories}
          categoryError={categoryError}
          categoryFilter={categoryFilter}
          categoryFilterAll={CATEGORY_FILTER_ALL}
          categoryManagerOpen={categoryManagerOpen}
          categoryNameInput={categoryNameInput}
          editingCategoryId={editingCategoryId}
          editingCategoryName={editingCategoryName}
          formatPostDate={formatPostDate}
          hasSearchQuery={hasSearchQuery}
          onAddCategory={handleAddCategory}
          onCategoryErrorClear={() => setCategoryError('')}
          onCategoryFilterChange={setCategoryFilter}
          onCategoryManagerToggle={() => setCategoryManagerOpen((isOpen) => !isOpen)}
          onCategoryNameInputChange={setCategoryNameInput}
          onDeleteCategory={handleDeleteCategory}
          onEditingCategoryIdChange={setEditingCategoryId}
          onEditingCategoryNameChange={setEditingCategoryName}
          onOpenDetail={handleOpenDetail}
          onOpenWrite={handleOpenWrite}
          onPermanentDeletePost={handlePermanentDeletePost}
          onRestorePost={handleRestorePost}
          onSearchQueryChange={setSearchQuery}
          onSearchScopeChange={setSearchScope}
          onSortModeChange={setSortMode}
          onTrashToggle={() => setTrashOpen((isOpen) => !isOpen)}
          onUpdateCategory={handleUpdateCategory}
          searchQuery={searchQuery}
          searchScope={searchScope}
          searchScopes={SEARCH_SCOPES}
          sortMode={sortMode}
          sortedPosts={sortedPosts}
          trashedPosts={trashedPosts}
          trashOpen={trashOpen}
          t={t}
        />
      ) : null}
    </section>
  )
}

export default Board
