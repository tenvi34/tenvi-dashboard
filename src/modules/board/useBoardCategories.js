import { useEffect, useMemo, useState } from 'react'
import { normalizeBoardCategories } from '../boardLogic.js'
import { readBoardStorageMode } from './boardStorageMode.js'
import {
  localBoardCategoryRepository,
  remoteBoardCategoryRepository,
} from './boardCategoryRepository.js'

function useBoardCategories() {
  const [storageMode] = useState(() => readBoardStorageMode())
  const repository = useMemo(
    () =>
      storageMode === 'remote'
        ? remoteBoardCategoryRepository
        : localBoardCategoryRepository,
    [storageMode],
  )
  // Board 화면 전체에서 공유하는 카테고리 기준 데이터
  const [categories, setCategoriesState] = useState(() =>
    storageMode === 'local'
      ? localBoardCategoryRepository.fetchCategories()
      : normalizeBoardCategories(),
  )

  useEffect(() => {
    let isMounted = true

    if (storageMode !== 'remote') {
      return () => {
        isMounted = false
      }
    }

    repository
      .fetchCategories()
      .then((remoteCategories) => {
        if (isMounted) {
          setCategoriesState(remoteCategories)
        }
      })
      .catch(() => {
        if (isMounted) {
          setCategoriesState(localBoardCategoryRepository.fetchCategories())
        }
      })

    return () => {
      isMounted = false
    }
  }, [repository, storageMode])

  const setCategories = (nextCategories) => {
    // 화면 반영을 먼저 하고 저장소 동기화는 비동기로 처리
    setCategoriesState((currentCategories) => {
      const normalizedCategories = normalizeBoardCategories(nextCategories)

      Promise.resolve(
        repository.replaceCategories(normalizedCategories, currentCategories),
      ).catch(() => {
        // REMOTE 실패가 Board 작성/조회 흐름을 막지 않도록 유지
      })

      return normalizedCategories
    })
  }

  return {
    categories,
    setCategories,
  }
}

export default useBoardCategories
