const PROFILE_IMAGE_DB_NAME = 'TENVI_PROFILE_DB'
const PROFILE_IMAGE_DB_VERSION = 1
const PROFILE_IMAGE_STORE_NAME = 'profileImages'

// 프로필 이미지 전용 IndexedDB 초기화
const openProfileImageDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(PROFILE_IMAGE_DB_NAME, PROFILE_IMAGE_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(PROFILE_IMAGE_STORE_NAME)) {
        db.createObjectStore(PROFILE_IMAGE_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

// 프로필 이미지는 아바타 preview용 data URL로 보관
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// IndexedDB 연결 수명 정리 포함 트랜잭션 래퍼
const runProfileImageTransaction = async (mode, handler) => {
  const db = await openProfileImageDb()

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(PROFILE_IMAGE_STORE_NAME, mode)
      const store = transaction.objectStore(PROFILE_IMAGE_STORE_NAME)
      const result = handler(store)

      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

// 로컬 프로필 이미지 고유 ID
const createProfileImageId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `profile-image-${globalThis.crypto.randomUUID()}`
  }

  return `profile-image-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 프로필 이미지 저장 후 profile avatarImageId에 연결할 record 반환
export const saveProfileImage = async (file) => {
  const dataUrl = await readFileAsDataUrl(file)
  const imageRecord = {
    id: createProfileImageId(),
    dataUrl,
    name: file.name,
    type: file.type,
    createdAt: new Date().toISOString(),
  }

  await runProfileImageTransaction('readwrite', (store) => {
    store.put(imageRecord)
  })

  return imageRecord
}

// 아바타 렌더링용 이미지 단건 조회
export const getProfileImage = async (imageId) => {
  if (!imageId) {
    return null
  }

  return runProfileImageTransaction(
    'readonly',
    (store) =>
      new Promise((resolve, reject) => {
        const request = store.get(imageId)

        request.onsuccess = () => resolve(request.result ?? null)
        request.onerror = () => reject(request.error)
      }),
  )
}

// Board 전용 백업에 포함할 프로필 이미지 전체 조회
export const getAllProfileImages = async () =>
  runProfileImageTransaction(
    'readonly',
    (store) =>
      new Promise((resolve, reject) => {
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result ?? [])
        request.onerror = () => reject(request.error)
      }),
  )

// Board 백업 복원용 프로필 이미지 일괄 저장
export const putProfileImages = async (imageRecords = []) => {
  const validImageRecords = imageRecords.filter((imageRecord) => imageRecord?.id)

  if (validImageRecords.length === 0) {
    return
  }

  await runProfileImageTransaction('readwrite', (store) => {
    validImageRecords.forEach((imageRecord) => store.put(imageRecord))
  })
}

// 프로필 이미지 교체/초기화 후 이전 record 정리
export const deleteProfileImage = async (imageId) => {
  if (!imageId) {
    return
  }

  await runProfileImageTransaction('readwrite', (store) => {
    store.delete(imageId)
  })
}
