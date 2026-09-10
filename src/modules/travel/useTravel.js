import { useCallback, useEffect, useRef, useState } from 'react'
import { travelRepository } from './travelRepository.js'

export default function useTravel() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    const current = ++generation.current
    try {
      const records = await travelRepository.list()
      if (current === generation.current) { setTrips(records); setError('') }
    } catch { if (current === generation.current) setError('loadError') }
    finally { if (current === generation.current) setLoading(false) }
  }, [])

  useEffect(() => {
    // IndexedDB 비동기 복원을 시작하여 초기 렌더의 동기 상태 변경 방지
    Promise.resolve().then(refresh)
    return () => { generation.current += 1 }
  }, [refresh])

  // 저장 완료 이후에만 화면의 확정 데이터 변경, 실패한 입력은 편집기에 유지
  const run = async (action, removeId = null) => {
    generation.current += 1
    setPending((count) => count + 1)
    setSaved(false)
    try {
      const result = await action()
      setTrips((current) => removeId ? current.filter((data) => data.trip.id !== removeId)
        : current.some((data) => data.trip.id === result.trip.id)
          ? current.map((data) => data.trip.id === result.trip.id ? result : data) : [...current, result])
      setError('')
      setSaved(true)
      return result
    } catch (failure) {
      setError(failure.message === 'tripMissing' ? 'tripMissing' : 'saveError')
      return null
    } finally { setPending((count) => count - 1) }
  }
  return { trips, loading, pending, error, saved, refresh,
    add: (data) => run(() => travelRepository.add(data)),
    update: (tripId, updater) => run(() => travelRepository.update(tripId, updater)),
    remove: (tripId) => run(() => travelRepository.remove(tripId), tripId),
  }
}
