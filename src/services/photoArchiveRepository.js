const DB_NAME = 'tenvi-photo-archive'
const DB_VERSION = 1
const STORE_NAME = 'photoRecords'

const createRecordId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// IndexedDB 초기화와 사진 기록 저장소 준비
const openPhotoArchiveDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })

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
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
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

// 저장된 모든 사진 지도 기록을 생성일 최신순으로 조회
export const getPhotoRecords = async () => {
  const records = await runStoreTransaction('readonly', (store) => store.getAll())

  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// 리사이즈된 미리보기 Blob과 메타데이터 저장
export const createPhotoRecord = async (recordInput) => {
  const now = new Date().toISOString()
  const record = {
    ...recordInput,
    id: createRecordId(),
    createdAt: now,
    updatedAt: now,
  }

  await runStoreTransaction('readwrite', (store) => store.add(record))

  return record
}

// 사진 기록의 제목/메모/좌표 갱신용 저장소 계약
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
