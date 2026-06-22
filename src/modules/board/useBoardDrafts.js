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

  localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(nextDrafts))

  return nextDrafts
}

const saveBoardDraft = (input, draftId) => {
  const nextDraft = createBoardDraftRecord(input, draftId)

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft))

  return nextDraft
}

const deleteBoardDraft = () => {
  localStorage.removeItem(DRAFT_STORAGE_KEY)
}

function useBoardDrafts() {
  const [draftList, setDraftList] = useState(() => loadBoardDrafts())
  const [activeDraftId, setActiveDraftId] = useState('')
  const [draftPickerOpen, setDraftPickerOpen] = useState(false)
  const activeDraft = draftList.find((draft) => draft.id === activeDraftId)
  const draftSaved = Boolean(activeDraft)

  const reloadDrafts = () => {
    setDraftList(loadBoardDrafts())
  }

  const removeDraftFromList = (draftId) => {
    if (!draftId) {
      return draftList
    }

    const nextDrafts = draftList.filter((draft) => draft.id !== draftId)
    const limitedDrafts = saveBoardDrafts(nextDrafts)

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

    setActiveDraftId(nextDraft.id)
    setDraftList(limitedDrafts)

    return nextDraft
  }

  const clearDrafts = () => {
    deleteBoardDraft()
    saveBoardDrafts([])
    setDraftList([])
    setActiveDraftId('')
  }

  const deleteLegacyDraft = () => {
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
