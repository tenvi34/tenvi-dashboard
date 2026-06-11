const DB_NAME = 'tenvi-photo-archive'
const DB_VERSION = 2
export const PHOTO_RECORD_STORE_NAME = 'photoRecords'
export const PHOTO_COLLECTION_STORE_NAME = 'photoCollections'

const createRecordId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// IndexedDB 저장소 준비
export const openPhotoArchiveDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      // 기존 records store 보존
      // photoRecords 최초 생성
      if (!database.objectStoreNames.contains(PHOTO_RECORD_STORE_NAME)) {
        const store = database.createObjectStore(PHOTO_RECORD_STORE_NAME, {
          keyPath: 'id',
        })

        store.createIndex('createdAt', 'createdAt')
        store.createIndex('updatedAt', 'updatedAt')
      }

      // 기존 DB 사용자 마이그레이션
      // DB v2 컬렉션 추가
      if (!database.objectStoreNames.contains(PHOTO_COLLECTION_STORE_NAME)) {
        const store = database.createObjectStore(PHOTO_COLLECTION_STORE_NAME, {
          keyPath: 'id',
        })

        store.createIndex('createdAt', 'createdAt')
        store.createIndex('updatedAt', 'updatedAt')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

// 트랜잭션 Promise 래퍼
const runStoreTransaction = async (mode, action) => {
  const database = await openPhotoArchiveDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_RECORD_STORE_NAME, mode)
    const store = transaction.objectStore(PHOTO_RECORD_STORE_NAME)
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

// record collectionId 보정
const normalizePhotoRecord = (record) => ({
  ...record,
  collectionId:
    typeof record.collectionId === 'string' && record.collectionId.trim()
      ? record.collectionId
      : null,
})

// 사진 기록 최신순 조회
export const getPhotoRecords = async () => {
  const records = await runStoreTransaction('readonly', (store) => store.getAll())

  return [...records]
    .map(normalizePhotoRecord)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Map 기록 개수 조회
export const getPhotoRecordCount = async () => {
  const count = await runStoreTransaction('readonly', (store) => store.count())

  return count
}

// 사진 기록 저장
export const createPhotoRecord = async (recordInput) => {
  const now = new Date().toISOString()
  const record = {
    ...recordInput,
    collectionId: recordInput.collectionId ?? null,
    id: createRecordId(),
    createdAt: now,
    updatedAt: now,
  }

  await runStoreTransaction('readwrite', (store) => store.add(record))

  return record
}

// IndexedDB 일괄 저장 helper
export const createPhotoRecords = async (recordInputs) => {
  const results = []

  for (const recordInput of recordInputs) {
    try {
      const record = await createPhotoRecord(recordInput)

      results.push({
        record,
        status: 'saved',
      })
    } catch (error) {
      // 일부 실패와 전체 실패 분리
      results.push({
        error,
        fileName: recordInput?.originalFileName ?? '',
        status: 'failed',
      })
    }
  }

  return results
}

export const updatePhotoRecord = async (id, patch) => {
  const currentRecord = await runStoreTransaction('readonly', (store) =>
    store.get(id),
  )

  if (!currentRecord) {
    // 삭제된 record 방어
    return null
  }

  const nextRecord = {
    ...currentRecord,
    ...patch,
    collectionId: patch.collectionId ?? currentRecord.collectionId ?? null,
    id,
    updatedAt: new Date().toISOString(),
  }

  await runStoreTransaction('readwrite', (store) => store.put(nextRecord))

  return nextRecord
}

// 사진 기록 삭제
export const deletePhotoRecord = async (id) => {
  await runStoreTransaction('readwrite', (store) => store.delete(id))

  return id
}

// 백업 복원 전체 교체
export const replacePhotoArchiveData = async ({ records, collections }) => {
  const database = await openPhotoArchiveDatabase()
  const storeNames = collections
    ? [PHOTO_RECORD_STORE_NAME, PHOTO_COLLECTION_STORE_NAME]
    : [PHOTO_RECORD_STORE_NAME]

  return new Promise((resolve, reject) => {
    // records/collections 동시 교체 원자성
    const transaction = database.transaction(storeNames, 'readwrite')
    const recordStore = transaction.objectStore(PHOTO_RECORD_STORE_NAME)

    recordStore.clear()
    records.forEach((record) => {
      recordStore.add(normalizePhotoRecord(record))
    })

    if (collections) {
      const collectionStore = transaction.objectStore(PHOTO_COLLECTION_STORE_NAME)

      collectionStore.clear()
      collections.forEach((collection) => {
        collectionStore.add(collection)
      })
    }

    transaction.oncomplete = () => {
      database.close()
      resolve({ collections, records })
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

// 사진 record 전체 교체
export const replacePhotoRecords = async (records) =>
  replacePhotoArchiveData({ records })
