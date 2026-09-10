import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTripData } from './travelLogic.js'
import { travelRepository, TRAVEL_DATABASE_NAME } from './travelRepository.js'

// IndexedDB 이벤트를 직접 제어하여 request 성공과 transaction 확정의 차이 검증
const harness = () => {
  const readRequest = {}
  const store = { add: vi.fn(), put: vi.fn(), delete: vi.fn(), get: vi.fn(() => readRequest), getAll: vi.fn(() => readRequest) }
  const tx = { objectStore: vi.fn(() => store), abort: vi.fn(() => queueMicrotask(() => tx.onabort())) }
  const database = { transaction: vi.fn(() => tx), close: vi.fn() }
  const openRequest = { result: database }
  const open = vi.fn(() => { queueMicrotask(() => openRequest.onsuccess()); return openRequest })
  vi.stubGlobal('indexedDB', { open })
  return { store, tx, database, open, readRequest, openRequest }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve() }
afterEach(() => vi.unstubAllGlobals())

describe('Travel repository transaction boundaries', () => {
  it('reports successful creation only after IndexedDB commits', async () => {
    const h = harness()
    const data = createTripData({ name: 'Trip' })
    const resolved = vi.fn()
    const pending = travelRepository.add(data).then(resolved)
    await flush()
    expect(h.open).toHaveBeenCalledWith(TRAVEL_DATABASE_NAME, 1)
    expect(h.store.add).toHaveBeenCalledWith(data)
    expect(resolved).not.toHaveBeenCalled()
    h.tx.oncomplete()
    await pending
    expect(resolved).toHaveBeenCalledWith(data)
    expect(h.database.close).toHaveBeenCalled()
  })
  it('reads the latest record and applies an edit inside the same write transaction', async () => {
    const h = harness()
    const data = createTripData({ name: 'Existing' })
    data.trip.memo = 'Latest note from another tab'
    const pending = travelRepository.update(data.trip.id, (current) => ({ ...current, trip: { ...current.trip, name: 'Renamed' } }))
    await flush()
    expect(h.database.transaction).toHaveBeenCalledWith('trips', 'readwrite')
    h.readRequest.result = data
    h.readRequest.onsuccess()
    expect(h.store.put.mock.calls[0][0].trip).toMatchObject({ name: 'Renamed', memo: 'Latest note from another tab' })
    h.tx.oncomplete()
    expect((await pending).trip.name).toBe('Renamed')
  })
  it('rejects a storage quota abort even after the write request was issued', async () => {
    const h = harness()
    const pending = travelRepository.add(createTripData({ name: 'Trip' }))
    const rejected = expect(pending).rejects.toThrow('quota')
    await flush()
    h.tx.error = new Error('quota')
    h.tx.onabort()
    await rejected
    expect(h.database.close).toHaveBeenCalled()
  })
  it('does not recreate a trip deleted by another tab', async () => {
    const h = harness()
    const pending = travelRepository.update('deleted', (current) => current)
    const rejected = expect(pending).rejects.toThrow('tripMissing')
    await flush()
    h.readRequest.result = undefined
    h.readRequest.onsuccess()
    await rejected
    expect(h.store.put).not.toHaveBeenCalled()
    expect(h.tx.abort).toHaveBeenCalled()
  })
  it('aborts invalid references and does not write any part of the edit', async () => {
    const h = harness()
    const data = createTripData({ name: 'Trip' })
    const pending = travelRepository.update(data.trip.id, (current) => ({ ...current, settings: { ...current.settings, lodgingPlaceId: 'missing' } }))
    const rejected = expect(pending).rejects.toThrow('invalidData')
    await flush()
    h.readRequest.result = data
    h.readRequest.onsuccess()
    await rejected
    expect(h.store.put).not.toHaveBeenCalled()
  })
  it('deletes only the requested trip key', async () => {
    const h = harness()
    const pending = travelRepository.remove('trip-a')
    await flush()
    expect(h.store.delete).toHaveBeenCalledExactlyOnceWith('trip-a')
    h.tx.oncomplete()
    expect(await pending).toBe('trip-a')
  })
  it('validates records before returning the list', async () => {
    const h = harness()
    const pending = travelRepository.list()
    const rejected = expect(pending).rejects.toThrow('invalidData')
    await flush()
    h.readRequest.result = [{ trip: { id: 'broken' } }]
    h.readRequest.onsuccess()
    await rejected
  })
})
