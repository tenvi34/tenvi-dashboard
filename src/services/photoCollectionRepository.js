import {
  openPhotoArchiveDatabase,
  PHOTO_COLLECTION_STORE_NAME,
  PHOTO_RECORD_STORE_NAME,
} from './photoArchiveRepository.js'

const createCollectionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `collection-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 컬렉션 record 보정
const normalizeCollection = (collection) => ({
  id: collection.id,
  name: String(collection.name ?? '').trim(),
  description: String(collection.description ?? ''),
  startDate: String(collection.startDate ?? ''),
  endDate: String(collection.endDate ?? ''),
  createdAt: String(collection.createdAt ?? new Date().toISOString()),
  updatedAt: String(collection.updatedAt ?? collection.createdAt ?? new Date().toISOString()),
})

// 컬렉션 트랜잭션 래퍼
const runCollectionTransaction = async (mode, action) => {
  const database = await openPhotoArchiveDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_COLLECTION_STORE_NAME, mode)
    const store = transaction.objectStore(PHOTO_COLLECTION_STORE_NAME)
    const request = action(store)
    let result

    request.onsuccess = () => {
      result = request.result
    }

    transaction.oncomplete = () => {
      database.close()
      resolve(result)
    }

    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

// Map 컬렉션 조회
export const getPhotoCollections = async () => {
  const collections = await runCollectionTransaction('readonly', (store) =>
    store.getAll(),
  )

  return [...collections]
    .map(normalizeCollection)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Map 컬렉션 생성
export const createPhotoCollection = async (collectionInput) => {
  const now = new Date().toISOString()
  const collection = normalizeCollection({
    ...collectionInput,
    id: createCollectionId(),
    createdAt: now,
    updatedAt: now,
  })

  await runCollectionTransaction('readwrite', (store) => store.add(collection))

  return collection
}

// Map 컬렉션 수정
export const updatePhotoCollection = async (id, patch) => {
  const currentCollection = await runCollectionTransaction('readonly', (store) =>
    store.get(id),
  )

  if (!currentCollection) {
    return null
  }

  const nextCollection = normalizeCollection({
    ...currentCollection,
    ...patch,
    id,
    updatedAt: new Date().toISOString(),
  })

  await runCollectionTransaction('readwrite', (store) =>
    store.put(nextCollection),
  )

  return nextCollection
}

// 컬렉션 삭제 transaction
export const deletePhotoCollection = async (collectionId) => {
  const database = await openPhotoArchiveDatabase()

  return new Promise((resolve, reject) => {
    // 컬렉션 삭제와 record 연결 해제 동시 처리
    const transaction = database.transaction(
      [PHOTO_COLLECTION_STORE_NAME, PHOTO_RECORD_STORE_NAME],
      'readwrite',
    )
    const collectionStore = transaction.objectStore(PHOTO_COLLECTION_STORE_NAME)
    const recordStore = transaction.objectStore(PHOTO_RECORD_STORE_NAME)
    let affectedRecordCount = 0

    collectionStore.delete(collectionId)

    const recordsRequest = recordStore.getAll()

    recordsRequest.onsuccess = () => {
      recordsRequest.result.forEach((record) => {
        if (record.collectionId === collectionId) {
          // 사진 자체는 보존
          affectedRecordCount += 1
          recordStore.put({
            ...record,
            collectionId: null,
            updatedAt: new Date().toISOString(),
          })
        }
      })
    }

    transaction.oncomplete = () => {
      database.close()
      resolve({ affectedRecordCount, collectionId })
    }

    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      database.close()
      reject(transaction.error)
    }
  })
}
