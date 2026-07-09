import {
  localMapRepository,
  remoteMapRepository,
} from './repositories/index.js'

const createCopyCount = (total) => ({
  total,
  copied: 0,
  skipped: 0,
  failed: 0,
})

const toCollectionPayload = (collection) => ({
  id: collection.id,
  name: collection.name,
  description: collection.description ?? '',
  startDate: collection.startDate ?? '',
  endDate: collection.endDate ?? '',
  createdAt: collection.createdAt,
  updatedAt: collection.updatedAt,
})

const toRecordPayload = (record) => ({
  id: record.id,
  title: record.title,
  memo: record.memo ?? '',
  latitude: Number(record.latitude),
  longitude: Number(record.longitude),
  locationSource: record.locationSource,
  collectionId: record.collectionId ?? null,
  originalFileName: record.originalFileName ?? '',
  fileType: record.fileType ?? '',
  takenAt: record.takenAt ?? '',
  previewImageBlob: record.previewImageBlob,
  previewImageHeight: Number(record.previewImageHeight) || 0,
  previewImageMimeType: record.previewImageMimeType ?? 'image/jpeg',
  previewImageWidth: Number(record.previewImageWidth) || 0,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  deletedAt: record.deletedAt,
})

// IndexedDB Map 원본 보존 복사
export const copyLocalMapDataToRemote = async ({
  localRepository = localMapRepository,
  remoteRepository = remoteMapRepository,
} = {}) => {
  const [localCollections, localRecords] = await Promise.all([
    localRepository.fetchCollections(),
    localRepository.fetchRecords(),
  ])
  const result = {
    collections: createCopyCount(localCollections.length),
    records: createCopyCount(localRecords.length),
  }

  if (localCollections.length === 0 && localRecords.length === 0) {
    return result
  }

  const [remoteCollections, remoteRecords] = await Promise.all([
    remoteRepository.fetchCollections(),
    remoteRepository.fetchRecords(),
  ])
  const remoteCollectionIds = new Set(
    remoteCollections.map((collection) => String(collection.id)),
  )
  const remoteRecordIds = new Set(remoteRecords.map((record) => String(record.id)))

  for (const collection of localCollections) {
    if (remoteCollectionIds.has(String(collection.id))) {
      result.collections.skipped += 1
      continue
    }

    try {
      const createdCollection = await remoteRepository.createCollection(
        toCollectionPayload(collection),
      )
      remoteCollectionIds.add(String(createdCollection?.id ?? collection.id))
      result.collections.copied += 1
    } catch {
      result.collections.failed += 1
    }
  }

  for (const record of localRecords) {
    if (remoteRecordIds.has(String(record.id))) {
      result.records.skipped += 1
      continue
    }

    if (record.collectionId && !remoteCollectionIds.has(String(record.collectionId))) {
      result.records.failed += 1
      continue
    }

    try {
      const createdRecord = await remoteRepository.createRecord(toRecordPayload(record))
      remoteRecordIds.add(String(createdRecord?.id ?? record.id))
      result.records.copied += 1
    } catch {
      result.records.failed += 1
    }
  }

  return result
}
