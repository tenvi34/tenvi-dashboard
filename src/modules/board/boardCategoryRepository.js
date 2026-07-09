import {
  createBoardCategory as createRemoteBoardCategory,
  deleteBoardCategory as deleteRemoteBoardCategory,
  fetchBoardCategories,
  updateBoardCategory as updateRemoteBoardCategory,
} from '../../api/boardApi.js'
import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { normalizeBoardCategories, parseBoardCategories } from '../boardLogic.js'

const CATEGORIES_STORAGE_KEY = STORAGE_KEYS.boardCategories

export const localBoardCategoryRepository = {
  fetchCategories() {
    return parseBoardCategories(localStorage.getItem(CATEGORIES_STORAGE_KEY))
  },

  replaceCategories(categories) {
    const nextCategories = normalizeBoardCategories(categories)

    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories))
    return nextCategories
  },
}

export const remoteBoardCategoryRepository = {
  async fetchCategories() {
    const categories = await fetchBoardCategories()

    return normalizeBoardCategories(categories)
  },

  async replaceCategories(nextCategories) {
    const normalizedNext = normalizeBoardCategories(nextCategories)
    const normalizedPrevious = await fetchBoardCategories()
    const previousById = new Map(
      normalizedPrevious.map((category) => [category.id, category]),
    )
    const nextById = new Map(normalizedNext.map((category) => [category.id, category]))

    for (const category of normalizedNext) {
      const previousCategory = previousById.get(category.id)

      if (!previousCategory) {
        await createRemoteBoardCategory(category)
        continue
      }

      if (
        previousCategory.name !== category.name ||
        previousCategory.isDefault !== category.isDefault
      ) {
        await updateRemoteBoardCategory(category.id, category)
      }
    }

    for (const category of normalizedPrevious) {
      if (!nextById.has(category.id) && category.id !== 'general') {
        await deleteRemoteBoardCategory(category.id)
      }
    }

    return normalizedNext
  },
}
