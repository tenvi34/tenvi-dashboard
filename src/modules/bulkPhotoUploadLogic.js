const BULK_ITEM_STATUSES = ['located', 'missing-location', 'failed']

const isValidCoordinate = (value) => Number.isFinite(Number(value))

export const normalizeBulkUploadItemStatus = (status) =>
  BULK_ITEM_STATUSES.includes(status) ? status : 'failed'

export const createBulkPhotoAnalysisItem = ({
  errorMessage = '',
  fileType = '',
  fileName = '',
  id,
  location = {},
  previewImage = null,
  status,
}) => ({
  errorMessage,
  fileName,
  id,
  fileType,
  latitude: location.latitude,
  locationSource: location.locationSource ?? 'exif',
  longitude: location.longitude,
  originalFileName: fileName,
  previewImage,
  status: normalizeBulkUploadItemStatus(status ?? location.status),
  takenAt: location.takenAt ?? '',
  title: fileName.replace(/\.[^.]+$/, ''),
})

export const createBulkUploadSummary = (items = []) =>
  items.reduce(
    (summary, item) => {
      const status = normalizeBulkUploadItemStatus(item?.status)
      const summaryKey =
        status === 'missing-location' ? 'missingLocation' : status

      return {
        ...summary,
        [summaryKey]: summary[summaryKey] + 1,
      }
    },
    {
      failed: 0,
      located: 0,
      missingLocation: 0,
      total: items.length,
    },
  )

// 위치정보 없는 사진 제외 정책: 최종 저장 후보는 좌표와 미리보기 Blob이 있는 located 항목만 허용
export const getBulkPhotoSaveCandidates = (items = []) =>
  items.filter(
    (item) =>
      item?.status === 'located' &&
      isValidCoordinate(item.latitude) &&
      isValidCoordinate(item.longitude) &&
      Boolean(item.previewImage?.blob),
  )

export const createBulkPhotoRecordInput = (item, collectionId = null) => {
  if (!getBulkPhotoSaveCandidates([item]).length) {
    return null
  }

  return {
    collectionId: collectionId ?? null,
    fileType: item.fileType ?? item.previewImage.mimeType,
    latitude: Number(item.latitude),
    locationSource: item.locationSource ?? 'exif',
    longitude: Number(item.longitude),
    memo: '',
    originalFileName: item.originalFileName ?? item.fileName,
    previewImageBlob: item.previewImage.blob,
    previewImageHeight: item.previewImage.height,
    previewImageMimeType: item.previewImage.mimeType,
    previewImageWidth: item.previewImage.width,
    takenAt: item.takenAt ?? '',
    title: item.title || item.originalFileName || item.fileName,
  }
}

export const createBulkPhotoRecordInputs = (items = [], collectionId = null) =>
  getBulkPhotoSaveCandidates(items)
    .map((item) => createBulkPhotoRecordInput(item, collectionId))
    .filter(Boolean)

// 일부 저장 실패 처리: 성공 항목과 실패 항목을 분리해 UI 결과 표시용으로 정리
export const createBulkPhotoSaveResult = (results = []) => ({
  failedCount: results.filter((result) => result.status === 'failed').length,
  failedItems: results.filter((result) => result.status === 'failed'),
  savedRecords: results
    .filter((result) => result.status === 'saved')
    .map((result) => result.record),
  successCount: results.filter((result) => result.status === 'saved').length,
})
