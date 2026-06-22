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

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

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

const createProfileImageId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `profile-image-${globalThis.crypto.randomUUID()}`
  }

  return `profile-image-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

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

export const putProfileImages = async (imageRecords = []) => {
  const validImageRecords = imageRecords.filter((imageRecord) => imageRecord?.id)

  if (validImageRecords.length === 0) {
    return
  }

  await runProfileImageTransaction('readwrite', (store) => {
    validImageRecords.forEach((imageRecord) => store.put(imageRecord))
  })
}

export const deleteProfileImage = async (imageId) => {
  if (!imageId) {
    return
  }

  await runProfileImageTransaction('readwrite', (store) => {
    store.delete(imageId)
  })
}
