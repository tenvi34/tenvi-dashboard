const BOARD_IMAGE_DB_NAME = 'TENVI_BOARD_DB'
const BOARD_IMAGE_DB_VERSION = 1
const BOARD_IMAGE_STORE_NAME = 'boardImages'

// Board 이미지 저장소 초기화
const openBoardImageDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(BOARD_IMAGE_DB_NAME, BOARD_IMAGE_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(BOARD_IMAGE_STORE_NAME)) {
        db.createObjectStore(BOARD_IMAGE_STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

// FileReader data URL 변환
const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

// IndexedDB 트랜잭션 Promise 래퍼
const runBoardImageTransaction = async (mode, handler) => {
  const db = await openBoardImageDb()

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(BOARD_IMAGE_STORE_NAME, mode)
      const store = transaction.objectStore(BOARD_IMAGE_STORE_NAME)
      const result = handler(store)

      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

// Board 이미지 고유 ID 생성
const createBoardImageId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `board-image-${globalThis.crypto.randomUUID()}`
  }

  return `board-image-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// Board 이미지 IndexedDB 저장
export const saveBoardImage = async (file) => {
  const dataUrl = await readFileAsDataUrl(file)
  const imageRecord = {
    id: createBoardImageId(),
    dataUrl,
    name: file.name,
    type: file.type,
    createdAt: new Date().toISOString(),
  }

  await runBoardImageTransaction('readwrite', (store) => {
    store.put(imageRecord)
  })

  return {
    imageId: imageRecord.id,
    name: imageRecord.name,
    type: imageRecord.type,
  }
}

// Board 이미지 단건 조회
export const getBoardImage = async (imageId) => {
  if (!imageId) {
    return null
  }

  return runBoardImageTransaction(
    'readonly',
    (store) =>
      new Promise((resolve, reject) => {
        const request = store.get(imageId)

        request.onsuccess = () => resolve(request.result ?? null)
        request.onerror = () => reject(request.error)
      }),
  )
}

// Board 이미지 여러 건 조회
export const getBoardImages = async (imageIds = []) => {
  const uniqueImageIds = [...new Set(imageIds.filter(Boolean))]
  const imageEntries = await Promise.all(
    uniqueImageIds.map(async (imageId) => [imageId, await getBoardImage(imageId)]),
  )

  return Object.fromEntries(imageEntries.filter(([, image]) => image))
}

// Board 이미지 단건 삭제
export const deleteBoardImage = async (imageId) => {
  if (!imageId) {
    return
  }

  await runBoardImageTransaction('readwrite', (store) => {
    store.delete(imageId)
  })
}

// Board 이미지 여러 건 삭제
export const deleteBoardImages = async (imageIds = []) => {
  const uniqueImageIds = [...new Set(imageIds.filter(Boolean))]

  if (uniqueImageIds.length === 0) {
    return
  }

  await runBoardImageTransaction('readwrite', (store) => {
    uniqueImageIds.forEach((imageId) => store.delete(imageId))
  })
}
