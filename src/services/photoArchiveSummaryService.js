import { getPhotoRecords } from './photoArchiveRepository.js'
import { getPhotoCollections } from './photoCollectionRepository.js'

const LOCATION_SOURCE_KEYS = ['exif', 'manual', 'search']

// 날짜 정렬용 timestamp fallback
const getTimestamp = (value) => {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

// Dashboard 표시용 위치 출처 정규화
const getSummaryLocationSource = (source) =>
  LOCATION_SOURCE_KEYS.includes(source) ? source : 'unknown'

// 위치 출처별 초기 카운트
const createEmptyLocationSourceCounts = () => ({
  exif: 0,
  manual: 0,
  search: 0,
  unknown: 0,
})

// Dashboard Map 요약 계산
export const createMapArchiveSummary = (records = [], collections = []) => {
  const collectionMap = new Map(
    collections
      .filter((collection) => collection?.id)
      .map((collection) => [collection.id, collection]),
  )
  const collectionPhotoCounts = new Map()
  const locationSourceCounts = createEmptyLocationSourceCounts()

  // 컬렉션별 사진 수와 위치 출처 집계
  records.forEach((record) => {
    const source = getSummaryLocationSource(record?.locationSource)
    locationSourceCounts[source] += 1

    if (collectionMap.has(record?.collectionId)) {
      collectionPhotoCounts.set(
        record.collectionId,
        (collectionPhotoCounts.get(record.collectionId) ?? 0) + 1,
      )
    }
  })

  // 최근 사진 3개만 Dashboard에 노출
  const recentPhotoRecords = [...records]
    .sort(
      (firstRecord, secondRecord) =>
        getTimestamp(secondRecord?.createdAt) - getTimestamp(firstRecord?.createdAt),
    )
    .slice(0, 3)
    .map((record) => {
      const collection = collectionMap.get(record?.collectionId)

      return {
        id: record.id,
        title: record.title ?? record.originalFileName ?? '',
        createdAt: record.createdAt ?? '',
        locationSource: getSummaryLocationSource(record.locationSource),
        collectionName: collection?.name ?? '',
      }
    })

  // 대표 컬렉션: 사진 수 우선, 동률이면 최신 수정일
  const representativeCollection = collections.reduce((selected, collection) => {
    const photoCount = collectionPhotoCounts.get(collection.id) ?? 0

    if (photoCount === 0) {
      return selected
    }

    const candidate = {
      id: collection.id,
      name: collection.name,
      photoCount,
      updatedAt: collection.updatedAt ?? collection.createdAt ?? '',
    }

    if (!selected) {
      return candidate
    }

    if (candidate.photoCount > selected.photoCount) {
      return candidate
    }

    if (
      candidate.photoCount === selected.photoCount &&
      getTimestamp(candidate.updatedAt) > getTimestamp(selected.updatedAt)
    ) {
      return candidate
    }

    return selected
  }, null)

  return {
    totalPhotoRecords: records.length,
    totalCollections: collections.length,
    recentPhotoRecords,
    representativeCollection,
    locationSourceCounts,
  }
}

// Dashboard Map 요약 조회
export const getMapArchiveSummary = async () => {
  const [records, collections] = await Promise.all([
    getPhotoRecords(),
    getPhotoCollections(),
  ])

  return createMapArchiveSummary(records, collections)
}
