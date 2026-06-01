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

// IndexedDB 초기화와 사진/컬렉션 저장소 준비
export const openPhotoArchiveDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      // 기존 photoRecords store는 재생성하지 않고, 없는 경우에만 최초 생성
      if (!database.objectStoreNames.contains(PHOTO_RECORD_STORE_NAME)) {
        const store = database.createObjectStore(PHOTO_RECORD_STORE_NAME, {
          keyPath: 'id',
        })

        store.createIndex('createdAt', 'createdAt')
        store.createIndex('updatedAt', 'updatedAt')
      }

      // DB v2 컬렉션 store 추가: 기존 사진 record는 업그레이드 중 수정하지 않음
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

// 화면 코드에서 저장소 세부 API를 숨기기 위한 트랜잭션 Promise 래퍼
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

// 기존 사진 기록의 collectionId 누락을 화면 호환용 null로 보정
const normalizePhotoRecord = (record) => ({
  ...record,
  collectionId:
    typeof record.collectionId === 'string' && record.collectionId.trim()
      ? record.collectionId
      : null,
})

// 저장된 모든 사진 지도 기록을 생성일 최신순으로 조회
export const getPhotoRecords = async () => {
  const records = await runStoreTransaction('readonly', (store) => store.getAll())

  return [...records]
    .map(normalizePhotoRecord)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// Settings 데이터 현황과 백업 안내에 사용할 Map 기록 개수 조회
export const getPhotoRecordCount = async () => {
  const count = await runStoreTransaction('readonly', (store) => store.count())

  return count
}

// 리사이즈된 미리보기 Blob과 메타데이터 저장
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

// 사진 기록의 제목/메모/좌표 갱신용 저장소 계약
// IndexedDB 일괄 저장 helper: 항목별 실패를 분리해 대량 업로드 전체 진행을 보호
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

// 사용자가 삭제한 사진 기록과 미리보기 Blob 제거
export const deletePhotoRecord = async (id) => {
  await runStoreTransaction('readwrite', (store) => store.delete(id))

  return id
}

// 백업 복원용 전체 교체: 사진/컬렉션 store를 가능한 같은 IndexedDB 트랜잭션에서 처리
export const replacePhotoArchiveData = async ({ records, collections }) => {
  const database = await openPhotoArchiveDatabase()
  const storeNames = collections
    ? [PHOTO_RECORD_STORE_NAME, PHOTO_COLLECTION_STORE_NAME]
    : [PHOTO_RECORD_STORE_NAME]

  return new Promise((resolve, reject) => {
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

// 기존 호출 호환용 사진 record만 전체 교체
export const replacePhotoRecords = async (records) =>
  replacePhotoArchiveData({ records })
