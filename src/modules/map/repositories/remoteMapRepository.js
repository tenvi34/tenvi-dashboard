import {
  createRemoteMapCollection,
  createRemoteMapRecord,
  deleteRemoteMapCollection,
  deleteRemoteMapRecord,
  fetchMapCollection,
  fetchMapCollections,
  fetchMapRecord,
  fetchMapRecords,
  updateRemoteMapCollection,
  updateRemoteMapRecord,
} from '../../../api/mapApi.js'
import {
  blobToDataUrl,
  dataUrlToBlob,
} from '../../../services/photoArchiveBackupService.js'

const normalizeRemoteCollection = (collection) => ({
  ...collection,
  description: String(collection.description ?? ''),
  endDate: String(collection.endDate ?? ''),
  startDate: String(collection.startDate ?? ''),
})

const toRemoteRecordPayload = async (record) => ({
  id: record.id,
  collectionId: record.collectionId ?? null,
  fileType: record.fileType ?? '',
  latitude: Number(record.latitude),
  locationSource: record.locationSource,
  longitude: Number(record.longitude),
  memo: record.memo ?? '',
  originalFileName: record.originalFileName ?? '',
  previewDataUrl:
    record.previewDataUrl ??
    record.previewImageDataUrl ??
    (record.previewImageBlob ? await blobToDataUrl(record.previewImageBlob) : ''),
  previewImageHeight: Number(record.previewImageHeight) || 0,
  previewImageMimeType: record.previewImageMimeType ?? 'image/jpeg',
  previewImageWidth: Number(record.previewImageWidth) || 0,
  takenAt: record.takenAt ?? '',
  title: record.title ?? record.originalFileName ?? '',
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  deletedAt: record.deletedAt,
})

const fromRemoteRecord = async (record) => {
  const previewDataUrl = record.previewDataUrl ?? record.previewImageDataUrl

  // 원본 파일은 REMOTE에 저장하지 않고 UI용 preview만 Blob으로 복원
  return {
    ...record,
    collectionId: record.collectionId ?? null,
    fileType: record.fileType ?? '',
    previewImageBlob: await dataUrlToBlob(previewDataUrl),
    previewImageHeight: Number(record.previewImageHeight) || 0,
    previewImageMimeType: record.previewImageMimeType ?? 'image/jpeg',
    previewImageWidth: Number(record.previewImageWidth) || 0,
    takenAt: record.takenAt ?? '',
  }
}

const toRemoteCollectionPayload = (collection) => ({
  id: collection.id,
  name: collection.name,
  description: collection.description ?? '',
  startDate: collection.startDate ?? '',
  endDate: collection.endDate ?? '',
  createdAt: collection.createdAt,
  updatedAt: collection.updatedAt,
})

export const createRemoteMapRepository = (mapApi = {
  createRemoteMapCollection,
  createRemoteMapRecord,
  deleteRemoteMapCollection,
  deleteRemoteMapRecord,
  fetchMapCollection,
  fetchMapCollections,
  fetchMapRecord,
  fetchMapRecords,
  updateRemoteMapCollection,
  updateRemoteMapRecord,
}) => ({
  async fetchRecords() {
    const records = await mapApi.fetchMapRecords()

    return Promise.all(records.map(fromRemoteRecord))
  },

  async fetchRecord(id) {
    return fromRemoteRecord(await mapApi.fetchMapRecord(id))
  },

  async createRecord(payload) {
    const createdRecord = await mapApi.createRemoteMapRecord(
      await toRemoteRecordPayload(payload),
    )

    return fromRemoteRecord(createdRecord)
  },

  async createRecords(recordInputs) {
    const results = []

    for (const recordInput of recordInputs) {
      try {
        results.push({
          record: await this.createRecord(recordInput),
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
  },

  async updateRecord(id, payload) {
    const updatedRecord = await mapApi.updateRemoteMapRecord(id, payload)

    return fromRemoteRecord(updatedRecord)
  },

  async deleteRecord(id) {
    await mapApi.deleteRemoteMapRecord(id)

    return id
  },

  async fetchRecordCount() {
    return (await mapApi.fetchMapRecords()).length
  },

  async fetchCollections() {
    const collections = await mapApi.fetchMapCollections()

    return collections.map(normalizeRemoteCollection)
  },

  async fetchCollection(id) {
    return normalizeRemoteCollection(await mapApi.fetchMapCollection(id))
  },

  async createCollection(payload) {
    return normalizeRemoteCollection(
      await mapApi.createRemoteMapCollection(toRemoteCollectionPayload(payload)),
    )
  },

  async updateCollection(id, payload) {
    return normalizeRemoteCollection(
      await mapApi.updateRemoteMapCollection(id, payload),
    )
  },

  async deleteCollection(id) {
    await mapApi.deleteRemoteMapCollection(id)

    return { collectionId: id }
  },
})

export const remoteMapRepository = createRemoteMapRepository()
