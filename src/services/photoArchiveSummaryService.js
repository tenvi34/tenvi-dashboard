import { getPhotoRecords } from './photoArchiveRepository.js'
import { getPhotoCollections } from './photoCollectionRepository.js'

const LOCATION_SOURCE_KEYS = ['exif', 'manual', 'search']

const getTimestamp = (value) => {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const getSummaryLocationSource = (source) =>
  LOCATION_SOURCE_KEYS.includes(source) ? source : 'unknown'

const createEmptyLocationSourceCounts = () => ({
  exif: 0,
  manual: 0,
  search: 0,
  unknown: 0,
})

// Dashboard 요약 전용 순수 계산: IndexedDB 구조 변경 없이 읽은 배열만 집계
export const createMapArchiveSummary = (records = [], collections = []) => {
  const collectionMap = new Map(
    collections
      .filter((collection) => collection?.id)
      .map((collection) => [collection.id, collection]),
  )
  const collectionPhotoCounts = new Map()
  const locationSourceCounts = createEmptyLocationSourceCounts()

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

// Dashboard 조회 계층: IndexedDB에서는 읽기만 수행하고 화면에는 가벼운 요약 객체만 전달
export const getMapArchiveSummary = async () => {
  const [records, collections] = await Promise.all([
    getPhotoRecords(),
    getPhotoCollections(),
  ])

  return createMapArchiveSummary(records, collections)
}
