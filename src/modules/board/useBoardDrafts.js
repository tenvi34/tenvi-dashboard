import { useState } from 'react'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import {
  createBoardDraft,
  getBoardPostTextContent,
  parseBoardDraft,
} from '../boardLogic.js'

const DRAFT_STORAGE_KEY = STORAGE_KEYS.boardDraft
const DRAFTS_STORAGE_KEY = STORAGE_KEYS.boardDrafts
const LEGACY_DRAFT_ID = 'legacy-board-draft'
const MAX_BOARD_DRAFTS = 10

// draft picker 목록에서 긴 본문 대신 보여줄 첫 줄 추출
export const getDraftPreviewText = (draft) => {
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

const loadBoardDraft = () => {
  try {
    return parseBoardDraft(localStorage.getItem(DRAFT_STORAGE_KEY))
  } catch {
    return null
  }
}

// 다중 draft 복원과 legacy draft 병합
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

const saveBoardDrafts = (drafts) => {
  const nextDrafts = limitBoardDrafts(drafts)

  // 다중 draft 목록 저장 key 보존
  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts))

  return nextDrafts
}

const saveBoardDraft = (input, draftId) => {
  const nextDraft = createBoardDraftRecord(input, draftId)

  // legacy 단일 draft key도 계속 갱신해 기존 데이터 흐름 유지
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft))

  return nextDraft
}

const deleteBoardDraft = () => {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

function useBoardDrafts() {
  // activeDraftId는 현재 작성 중인 draft와 목록 항목을 연결
  const [draftList, setDraftList] = useState(() => loadBoardDrafts())
  const [activeDraftId, setActiveDraftId] = useState('')
  const [draftPickerOpen, setDraftPickerOpen] = useState(false)
  const activeDraft = draftList.find((draft) => draft.id === activeDraftId)
  const draftSaved = Boolean(activeDraft)

  const reloadDrafts = () => {
    // 글쓰기 진입 시 다른 탭/이전 세션 저장분까지 다시 반영
    setDraftList(loadBoardDrafts())
  }

  const removeDraftFromList = (draftId) => {
    if (!draftId) {
      return draftList
    }

    const nextDrafts = draftList.filter((draft) => draft.id !== draftId)
    const limitedDrafts = saveBoardDrafts(nextDrafts)

    // active draft 제거 후 화면 목록 동기화
    setDraftList(limitedDrafts)

    return limitedDrafts
  }

  const saveCurrentDraft = (input) => {
    const nextDraftId = activeDraftId || createBoardDraftId()
    const nextDraft = saveBoardDraft(input, nextDraftId)
    const nextDrafts = [
      nextDraft,
      ...draftList.filter((draft) => draft.id !== nextDraft.id),
    ]
    const limitedDrafts = saveBoardDrafts(nextDrafts)

    // 저장한 draft를 즉시 active 상태로 전환
    setActiveDraftId(nextDraft.id)
    setDraftList(limitedDrafts)

    return nextDraft
  }

  const clearDrafts = () => {
    // 전체 draft 삭제는 legacy key와 다중 key를 함께 정리
    deleteBoardDraft()
    saveBoardDrafts([])
    setDraftList([])
    setActiveDraftId('')
  }

  const deleteLegacyDraft = () => {
    // 작성 완료/개별 삭제 시 legacy 단일 draft만 정리
    deleteBoardDraft()
  }

  return {
    activeDraft,
    activeDraftId,
    clearDrafts,
    deleteLegacyDraft,
    draftList,
    draftPickerOpen,
    draftSaved,
    reloadDrafts,
    removeDraftFromList,
    saveCurrentDraft,
    setActiveDraftId,
    setDraftPickerOpen,
  }
}

export default useBoardDrafts
