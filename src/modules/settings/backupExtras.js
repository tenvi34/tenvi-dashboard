import { STORAGE_KEYS } from '../../constants/storageKeys.js'
import { getAllProfileImages, replaceProfileImages } from '../profileImageStore.js'
import { travelRepository } from '../travel/travelRepository.js'
import { validateTravelData } from '../travel/travelLogic.js'

const has = (data, key) => Object.prototype.hasOwnProperty.call(data, key)

// v1 백업 확장: 누락 필드는 복원 대상에서 제외하여 구 백업의 기존 데이터 보존
export const validateBackupExtras = (data) => {
  const result = {}
  if (has(data, 'travelTrips')) {
    if (!Array.isArray(data.travelTrips)) throw new Error('invalidData')
    result.travelTrips = data.travelTrips.map(validateTravelData)
    if (new Set(result.travelTrips.map((item) => item.trip.id)).size !== result.travelTrips.length) throw new Error('invalidData')
  }
  if (has(data, 'profileImages')) {
    if (!Array.isArray(data.profileImages) || data.profileImages.some((image) =>
      !image || typeof image.id !== 'string' || !image.id.trim() ||
      typeof image.dataUrl !== 'string' || !/^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(image.dataUrl))) throw new Error('invalidData')
    if (new Set(data.profileImages.map((image) => image.id)).size !== data.profileImages.length) throw new Error('invalidData')
    result.profileImages = data.profileImages
  }
  if (has(data, 'timerCompletedSessions')) {
    if (!Number.isSafeInteger(data.timerCompletedSessions) || data.timerCompletedSessions < 0) throw new Error('invalidData')
    result.timerCompletedSessions = data.timerCompletedSessions
  }
  return result
}

export const collectBackupExtras = async () => {
  const [travelTrips, profileImages] = await Promise.all([travelRepository.list(), getAllProfileImages()])
  const count = Number(localStorage.getItem(STORAGE_KEYS.timerCompletedSessions))
  return validateBackupExtras({ travelTrips, profileImages,
    timerCompletedSessions: Number.isSafeInteger(count) && count >= 0 ? count : 0 })
}

// 새 필드가 존재할 때만 해당 IndexedDB를 읽고 교체
export const captureBackupExtras = async (data) => ({
  ...(has(data, 'travelTrips') ? { travelTrips: await travelRepository.list() } : {}),
  ...(has(data, 'profileImages') ? { profileImages: await getAllProfileImages() } : {}),
})

export const restoreBackupExtras = async (data) => {
  const results = await Promise.allSettled([
    ...(has(data, 'travelTrips') ? [Promise.resolve().then(() => travelRepository.replaceAll(data.travelTrips))] : []),
    ...(has(data, 'profileImages') ? [Promise.resolve().then(() => replaceProfileImages(data.profileImages))] : []),
  ])
  const failed = results.find((result) => result.status === 'rejected')
  if (failed) throw failed.reason
}
