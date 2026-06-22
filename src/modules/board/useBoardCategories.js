import { useState } from 'react'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { parseBoardCategories } from '../boardLogic.js'

const CATEGORIES_STORAGE_KEY = STORAGE_KEYS.boardCategories

// Board 카테고리 localStorage 복원
const loadBoardCategories = () => {
  try {
    return parseBoardCategories(localStorage.getItem(CATEGORIES_STORAGE_KEY))
  } catch {
    return parseBoardCategories()
  }
}

// Board 카테고리 key 보존
const saveBoardCategories = (categories) => {
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
}

function useBoardCategories() {
  const [categories, setCategoriesState] = useState(() => loadBoardCategories())

  const setCategories = (nextCategories) => {
    setCategoriesState(nextCategories)
    saveBoardCategories(nextCategories)
  }

  return {
    categories,
    setCategories,
  }
}

export default useBoardCategories
