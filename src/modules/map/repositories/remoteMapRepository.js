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

// REMOTE 컬렉션 응답 보정
const normalizeRemoteCollection = (collection) => ({
  ...collection,
  description: String(collection.description ?? ''),
  endDate: String(collection.endDate ?? ''),
  startDate: String(collection.startDate ?? ''),
})

// IndexedDB record를 REMOTE 요청 본문으로 변환
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

// REMOTE record를 Map UI 구조로 복원
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

// REMOTE 컬렉션 요청 본문 변환
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
  // REMOTE 사진 기록 목록 조회
  async fetchRecords() {
    // preview Blob 복원 포함
    const records = await mapApi.fetchMapRecords()

    return Promise.all(records.map(fromRemoteRecord))
  },

  // REMOTE 사진 기록 단건 조회
  async fetchRecord(id) {
    return fromRemoteRecord(await mapApi.fetchMapRecord(id))
  },

  // REMOTE 사진 기록 생성
  async createRecord(payload) {
    const createdRecord = await mapApi.createRemoteMapRecord(
      await toRemoteRecordPayload(payload),
    )

    return fromRemoteRecord(createdRecord)
  },

  // REMOTE 사진 기록 일괄 생성
  async createRecords(recordInputs) {
    const results = []

    for (const recordInput of recordInputs) {
      try {
        results.push({
          record: await this.createRecord(recordInput),
          status: 'saved',
        })
      } catch (error) {
        // bulk 일부 실패 유지
        results.push({
          error,
          fileName: recordInput?.originalFileName ?? '',
          status: 'failed',
        })
      }
    }

    return results
  },

  // REMOTE 사진 기록 수정
  async updateRecord(id, payload) {
    const updatedRecord = await mapApi.updateRemoteMapRecord(id, payload)

    return fromRemoteRecord(updatedRecord)
  },

  // REMOTE 사진 기록 삭제
  async deleteRecord(id) {
    await mapApi.deleteRemoteMapRecord(id)

    return id
  },

  // REMOTE 사진 기록 개수 조회
  async fetchRecordCount() {
    return (await mapApi.fetchMapRecords()).length
  },

  // REMOTE 컬렉션 목록 조회
  async fetchCollections() {
    const collections = await mapApi.fetchMapCollections()

    return collections.map(normalizeRemoteCollection)
  },

  // REMOTE 컬렉션 단건 조회
  async fetchCollection(id) {
    return normalizeRemoteCollection(await mapApi.fetchMapCollection(id))
  },

  // REMOTE 컬렉션 생성
  async createCollection(payload) {
    return normalizeRemoteCollection(
      await mapApi.createRemoteMapCollection(toRemoteCollectionPayload(payload)),
    )
  },

  // REMOTE 컬렉션 수정
  async updateCollection(id, payload) {
    return normalizeRemoteCollection(
      await mapApi.updateRemoteMapCollection(id, payload),
    )
  },

  // REMOTE 컬렉션 삭제
  async deleteCollection(id) {
    await mapApi.deleteRemoteMapCollection(id)

    return { collectionId: id }
  },
})

export const remoteMapRepository = createRemoteMapRepository()
