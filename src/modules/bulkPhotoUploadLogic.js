const BULK_ITEM_STATUSES = ['located', 'missing-location', 'failed']

// 좌표 저장 가능 여부 확인
const isValidCoordinate = (value) => Number.isFinite(Number(value))

// bulk 항목 상태 fallback
export const normalizeBulkUploadItemStatus = (status) =>
  BULK_ITEM_STATUSES.includes(status) ? status : 'failed'

// 파일 분석 결과를 UI 항목으로 정규화
export const createBulkPhotoAnalysisItem = ({
  errorMessage = '',
  file = null,
  fileType = '',
  fileName = '',
  id,
  location = {},
  previewImage = null,
  status,
}) => {
  const normalizedStatus = normalizeBulkUploadItemStatus(status ?? location.status)

  return {
    errorMessage,
    file,
    fileName,
    id,
    fileType,
    latitude: location.latitude,
    locationSource: location.locationSource ?? 'exif',
    longitude: location.longitude,
    originalFileName: fileName,
    originalStatus: normalizedStatus,
    previewImage,
    status: normalizedStatus,
    takenAt: location.takenAt ?? '',
    title: fileName.replace(/\.[^.]+$/, ''),
  }
}

// 원래 위치가 없던 항목만 추출
export const getBulkMissingLocationItems = (items = []) =>
  items.filter(
    (item) =>
      item?.originalStatus === 'missing-location' && item.status !== 'failed',
  )

// 위치 일괄 적용 가능 항목
export const getBulkLocationAssignableItems = (items = []) =>
  items.filter((item) => item?.status !== 'failed')

// 위치 누락 항목 선택 토글
export const toggleBulkMissingLocationSelection = (
  selectedIds = [],
  itemId,
) => {
  if (selectedIds.includes(itemId)) {
    return selectedIds.filter((selectedId) => selectedId !== itemId)
  }

  return [...selectedIds, itemId]
}

// 위치 누락 항목 전체 선택
export const selectAllBulkMissingLocationItems = (items = []) =>
  getBulkMissingLocationItems(items).map((item) => item.id)

// 실패 제외 항목 전체 선택
export const selectAllBulkLocationAssignableItems = (items = []) =>
  getBulkLocationAssignableItems(items).map((item) => item.id)

// bulk 선택 상태 초기화
export const clearBulkMissingLocationSelection = () => []

// 선택 항목에 수동/검색 위치 적용
export const applyLocationToBulkItems = (
  items = [],
  selectedIds = [],
  location = {},
) => {
  const selectedIdSet = new Set(selectedIds)
  const latitude = Number(location.latitude)
  const longitude = Number(location.longitude)
  const locationSource =
    location.locationSource === 'search' ? 'search' : 'manual'

  return items.map((item) => {
    if (!selectedIdSet.has(item.id) || item.status === 'failed') {
      return item
    }

    return {
      ...item,
      latitude,
      locationSource,
      longitude,
      status: 'located',
    }
  })
}

// bulk 분석 결과 요약
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

// bulk 저장 후보 정제
export const getBulkPhotoSaveCandidates = (items = []) =>
  items.filter(
    (item) =>
      item?.status === 'located' &&
      isValidCoordinate(item.latitude) &&
      isValidCoordinate(item.longitude) &&
      Boolean(item.previewImage?.blob),
  )

// bulk 항목을 IndexedDB 저장 입력으로 변환
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

// 저장 가능한 bulk 입력 목록 생성
export const createBulkPhotoRecordInputs = (items = [], collectionId = null) =>
  getBulkPhotoSaveCandidates(items)
    .map((item) => createBulkPhotoRecordInput(item, collectionId))
    .filter(Boolean)

// bulk 저장 결과 정리
export const createBulkPhotoSaveResult = (results = []) => ({
  failedCount: results.filter((result) => result.status === 'failed').length,
  failedItems: results.filter((result) => result.status === 'failed'),
  savedRecords: results
    .filter((result) => result.status === 'saved')
    .map((result) => result.record),
  successCount: results.filter((result) => result.status === 'saved').length,
})
