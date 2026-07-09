import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import BoardDetail from './board/BoardDetail.jsx'
import BoardForm from './board/BoardForm.jsx'
import BoardImageLightbox from './board/BoardImageLightbox.jsx'
import BoardList from './board/BoardList.jsx'
import useBoardCategories from './board/useBoardCategories.js'
import useBoardDetailImages from './board/useBoardDetailImages.js'
import useBoardDrafts, { getDraftPreviewText } from './board/useBoardDrafts.js'
import useBoardPosts from './board/useBoardPosts.js'
import './Board.css'
import {
  DEFAULT_BOARD_CATEGORY_ID,
  addBoardCategory,
  deleteBoardCategory,
  getBoardImageIds,
  getBoardPostTextContent,
  getPostCategoryId,
  getRemovedBoardImageIds,
  normalizeBoardBlocks,
  sortBoardPosts,
  updateBoardCategory,
} from './boardLogic.js'
import { deleteBoardImages } from './boardImageStore.js'
import { parseUserProfile } from './userProfileLogic.js'

const CATEGORY_FILTER_ALL = 'all'
const SEARCH_SCOPES = ['title', 'content', 'author']

// 새 글 작성자 기본값은 로컬 프로필 nickname 사용
const getDefaultAuthorName = () =>
  parseUserProfile(localStorage.getItem(STORAGE_KEYS.userProfile)).nickname

// 새 글과 빈 에디터에서 최소 1개 텍스트 블록 유지
const createEmptyTextBlock = () => ({
  id: crypto.randomUUID(),
  type: 'text',
  content: '',
})

const getEditableBlocks = (blocks) =>
  blocks.length > 0 ? blocks : [createEmptyTextBlock()]

// legacy content-only 게시글도 에디터 blocks로 변환
const createEditableBlocks = (post) => {
  const normalizedBlocks = normalizeBoardBlocks(post?.blocks, post?.content)

  return getEditableBlocks(normalizedBlocks)
}

// 이미지 블록만 있는 글도 본문이 있는 것으로 인정
const hasWritableBody = (blocks) =>
  normalizeBoardBlocks(blocks).some((block) => {
    if (block.type === 'image') {
      return Boolean(block.imageId || block.src)
    }

    return block.content.trim().length > 0
  })

function Board({ routeView = 'list', t }) {
  const navigate = useNavigate()
  const { postId = '' } = useParams()
  const editPostIdRef = useRef('')
  const writeRouteInitializedRef = useRef(false)
  const viewedPostIdsRef = useRef(new Set())
  // localStorage에 연결된 Board 데이터 상태
  const {
    activePosts,
    createPost,
    error: postsError,
    increasePostViews,
    loading: postsLoading,
    movePostsToCategoryFallback,
    permanentlyDeletePost,
    posts,
    restorePost,
    softDeletePost,
    togglePostPinned,
    trashedPosts,
    updatePost,
  } = useBoardPosts()
  const { categories, setCategories } = useBoardCategories()
  const {
    activeDraft,
    activeDraftId,
    clearDrafts,
    deleteLegacyDraft,
    draftList,
    draftPickerOpen,
    draftSaved,
    reloadDrafts,
    removeDraftFromList,
    saveCurrentDraft: saveDraft,
    setActiveDraftId,
    setDraftPickerOpen,
  } = useBoardDrafts()

  // 작성/수정 폼 입력 상태
  const [author, setAuthor] = useState(() => getDefaultAuthorName())
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState(DEFAULT_BOARD_CATEGORY_ID)
  const [blocks, setBlocks] = useState(() => [createEmptyTextBlock()])

  // 목록 필터와 보조 패널 상태
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER_ALL)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [categoryNameInput, setCategoryNameInput] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [formError, setFormError] = useState('')

  // 검색/정렬 조건은 현재 화면 상태로만 유지
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState('title')
  const [sortMode, setSortMode] = useState('latest')
  const selectedPostId = postId
  const selectedPost = activePosts.find((post) => post.id === selectedPostId)
  const selectedPostBlocks = selectedPost ? createEditableBlocks(selectedPost) : []
  const userProfile = parseUserProfile(localStorage.getItem(STORAGE_KEYS.userProfile))
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const hasSearchQuery = normalizedSearchQuery.length > 0
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

  // 작성/수정 폼 입력 상태 초기화
  const resetWriteForm = useCallback(() => {
    setAuthor(getDefaultAuthorName())
    setTitle('')
    setCategoryId(DEFAULT_BOARD_CATEGORY_ID)
    setBlocks([createEmptyTextBlock()])
    setFormError('')
  }, [])

  const saveCurrentDraft = (nextValues) => {
    saveDraft({
      author,
      title,
      categoryId,
      blocks,
      ...nextValues,
    })
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

    clearDrafts()
    setDraftPickerOpen(false)
    resetWriteForm()
    deleteBoardImages(imageIds).catch(() => {
      // 전체 draft 삭제는 localStorage 정리를 우선하고 이미지 정리는 후처리
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

  // 게시글 작성: 새 post 저장 후 현재 draft 정리
  const handleCreatePost = async () => {
    const trimmedAuthor = author.trim()
    const trimmedTitle = title.trim()

    if (!trimmedTitle || !hasWritableBody(blocks)) {
      setFormError(t.board.formRequiredMessage)
      return
    }

    const payload = {
      author: trimmedAuthor,
      title: trimmedTitle,
      categoryId,
      blocks,
    }

    try {
      await createPost(payload)
    } catch {
      setFormError(t.board.formRequiredMessage)
      return
    }

    deleteLegacyDraft()
    removeDraftFromList(activeDraftId)
    setActiveDraftId('')
    setDraftPickerOpen(false)
    resetWriteForm()
    navigate('/board')
  }

  // 게시글 작성 취소: 저장된 draft는 유지하고 화면만 복귀
  const handleCancelWrite = () => {
    resetWriteForm()
    setActiveDraftId('')
    setDraftPickerOpen(false)
    navigate('/board')
  }

  // 선택한 draft를 작성 폼으로 복원
  const restoreDraftToForm = (savedDraft) => {
    setAuthor(savedDraft.author)
    setTitle(savedDraft.title)
    setCategoryId(getPostCategoryId(savedDraft, categories))
    setBlocks(getEditableBlocks(savedDraft.blocks))
    setFormError('')
    setActiveDraftId(savedDraft.id)
    setDraftPickerOpen(false)
  }

  // 글쓰기 진입 시 draft 목록을 다시 읽어 최신 상태 반영
  const handleOpenWrite = () => {
    navigate('/board/posts/new')
  }

  // 게시글 수정 화면 열기
  const handleOpenEdit = () => {
    if (!selectedPost) {
      return
    }

    navigate(`/board/posts/${selectedPost.id}/edit`)
  }

  // 게시글 수정 취소
  const handleCancelEdit = () => {
    resetWriteForm()
    navigate(selectedPost ? `/board/posts/${selectedPost.id}` : '/board')
  }

  // 게시글 수정 저장: 제거된 이미지 ID를 계산해 IndexedDB 정리
  const handleUpdatePost = async () => {
    if (!selectedPost) {
      return
    }

    const trimmedTitle = title.trim()

    if (!trimmedTitle || !hasWritableBody(blocks)) {
      setFormError(t.board.formRequiredMessage)
      return
    }

    const removedImageIds = getRemovedBoardImageIds(selectedPost.blocks, blocks)
    const payload = {
      author,
      title,
      categoryId,
      blocks,
    }

    try {
      await updatePost(selectedPost.id, payload)
    } catch {
      setFormError(t.board.formRequiredMessage)
      return
    }

    deleteBoardImages(removedImageIds).catch(() => {
      // 이미지 정리는 실패해도 게시글 수정 흐름 유지
    })
    resetWriteForm()
    navigate(`/board/posts/${selectedPost.id}`)
  }

  // 상세 URL 진입
  const handleOpenDetail = (postId) => {
    navigate(`/board/posts/${postId}`)
  }

  // 게시글 목록 URL로 이동
  const handleBackToList = () => {
    setImageViewer(null)
    navigate('/board')
  }

  // 게시글 삭제: 복구 가능하도록 deletedAt만 기록
  const handleDeletePost = async (postId) => {
    if (!window.confirm(t.board.deleteConfirm)) {
      return
    }

    await softDeletePost(postId)
    handleBackToList()
  }

  // 휴지통 글을 활성 목록으로 복원
  const handleRestorePost = async (postId) => {
    await restorePost(postId)
  }

  const handlePermanentDeletePost = async (postId) => {
    if (!window.confirm(t.board.permanentDeleteConfirm)) {
      return
    }

    const targetPost = posts.find((post) => post.id === postId)
    const imageIds = getBoardImageIds(targetPost?.blocks)

    await permanentlyDeletePost(postId)
    deleteBoardImages(imageIds).catch(() => {
      // 영구 삭제 시점에만 IndexedDB 이미지 정리
    })
  }

  // repository action을 통한 고정 상태 전환
  const handleTogglePinned = async (postId) => {
    await togglePostPinned(postId)
  }

  // 새 글 draft 수동 삭제: 연결 이미지까지 함께 정리
  const handleDeleteDraft = (targetDraft = activeDraft) => {
    const imageIds = getBoardImageIds(targetDraft?.blocks ?? blocks)
    deleteLegacyDraft()
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
    setEditingCategoryId('')
    setEditingCategoryName('')
    setCategoryError('')
  }

  // 카테고리 삭제 후 연결 게시글을 general로 이동
  const handleDeleteCategory = async (targetCategoryId) => {
    if (targetCategoryId === DEFAULT_BOARD_CATEGORY_ID) {
      return
    }

    const nextCategories = deleteBoardCategory(categories, targetCategoryId)

    await movePostsToCategoryFallback(targetCategoryId)

    setCategories(nextCategories)
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

  useEffect(() => {
    if (routeView !== 'write') {
      writeRouteInitializedRef.current = false
      return
    }

    if (writeRouteInitializedRef.current) {
      return
    }

    // 글쓰기 URL 진입 시 draft 목록 최신화
    resetWriteForm()
    reloadDrafts()
    setActiveDraftId('')
    setDraftPickerOpen(false)
    editPostIdRef.current = ''
    writeRouteInitializedRef.current = true
    // URL 진입 시점에만 실행해 작성 중 입력값 보존
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetWriteForm, routeView])

  useEffect(() => {
    if (routeView !== 'edit' || !selectedPost) {
      return
    }

    if (editPostIdRef.current === selectedPost.id) {
      return
    }

    // URL postId 기준 수정 폼 복원
    setAuthor(selectedPost.author ?? '')
    setTitle(selectedPost.title)
    setCategoryId(getPostCategoryId(selectedPost, categories))
    setBlocks(createEditableBlocks(selectedPost))
    setFormError('')
    editPostIdRef.current = selectedPost.id
  }, [categories, routeView, selectedPost])

  useEffect(() => {
    if (routeView !== 'detail' || !selectedPostId || !selectedPost) {
      return
    }

    if (viewedPostIdsRef.current.has(selectedPostId)) {
      return
    }

    viewedPostIdsRef.current.add(selectedPostId)
    increasePostViews(selectedPostId).catch(() => {
      // 조회수 갱신 실패가 상세 진입 자체를 막지 않도록 유지
    })
  }, [increasePostViews, routeView, selectedPost, selectedPostId])

  return (
    <section className="module-panel board-module" aria-labelledby="board-title">
      <div className="module-header">
        <div>
          <p className="module-label">{t.board.label}</p>
          <h2 id="board-title">{t.board.title}</h2>
        </div>
        <p className="module-meta">{t.board.totalCount(activePosts.length)}</p>
      </div>

      {postsLoading ? (
        <p className="board-storage-status">원격 Board 게시글을 불러오는 중입니다.</p>
      ) : null}
      {postsError ? (
        <p className="board-storage-status is-error" role="alert">{postsError}</p>
      ) : null}

      {routeView === 'write' ? (
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

      {routeView === 'edit' ? (
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

      {routeView === 'detail' ? (
        <BoardDetail
          avatarImageId={userProfile.avatarImageId}
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

      {routeView === 'list' ? (
        <BoardList
          activePosts={activePosts}
          avatarImageId={userProfile.avatarImageId}
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
