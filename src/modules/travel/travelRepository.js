import { validateTravelData } from './travelLogic.js'

// Map 사진 DB 및 기존 localStorage와 분리된 Travel 전용 DB
export const TRAVEL_DATABASE_NAME = 'tenvi-travel'
const STORE_NAME = 'trips'
const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(TRAVEL_DATABASE_NAME, 1)
  let blocked = false
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'trip.id' })
  request.onerror = () => reject(request.error)
  request.onblocked = () => { blocked = true; reject(new Error('storageBlocked')) }
  request.onsuccess = () => {
    const database = request.result
    if (blocked) { database.close(); return }
    database.onversionchange = () => database.close()
    resolve(database)
  }
})

// 읽기-수정-쓰기를 한 트랜잭션으로 처리하여 다른 탭의 변경 덮어쓰기 방지
const transaction = async (mode, action) => {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    let tx
    try { tx = database.transaction(STORE_NAME, mode) }
    catch (error) { database.close(); reject(error); return }
    let result
    let failure
    tx.oncomplete = () => { database.close(); resolve(result) }
    tx.onabort = tx.onerror = () => { database.close(); reject(failure || tx.error || new Error('storageError')) }
    try {
      action(tx.objectStore(STORE_NAME), (value) => { result = value }, (error) => { failure = error; tx.abort() })
    } catch (error) { failure = error; tx.abort() }
  })
}

// UI는 이 계약만 사용하며 추후 API repository로 교체 가능
export const travelRepository = {
  list: () => transaction('readonly', (store, done, fail) => {
    const request = store.getAll()
    request.onsuccess = () => {
      try { done(request.result.map(validateTravelData)) } catch (error) { fail(error) }
    }
  }),
  add: (data) => {
    const validated = validateTravelData(data)
    return transaction('readwrite', (store, done) => { store.add(validated); done(validated) })
  },
  update: (tripId, updater) => transaction('readwrite', (store, done, fail) => {
    const request = store.get(tripId)
    request.onsuccess = () => {
      try {
        if (!request.result) throw new Error('tripMissing')
        const next = validateTravelData(updater(validateTravelData(request.result)))
        if (next.trip.id !== tripId) throw new Error('invalidData')
        store.put(next)
        done(next)
      } catch (error) { fail(error) }
    }
  }),
  remove: (tripId) => transaction('readwrite', (store, done) => { store.delete(tripId); done(tripId) }),
}
