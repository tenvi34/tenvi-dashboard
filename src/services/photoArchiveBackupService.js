const MAP_LOCATION_SOURCES = ['exif', 'manual', 'search']

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isFiniteCoordinate = (value) => Number.isFinite(Number(value))

const normalizeLocationSource = (source) =>
  MAP_LOCATION_SOURCES.includes(source) ? source : 'manual'

const normalizeCollectionId = (collectionId, collections = []) => {
  if (typeof collectionId !== 'string' || !collectionId.trim()) {
    return null
  }

  if (collections === null) {
    return null
  }

  if (
    collections.length > 0 &&
    !collections.some((collection) => collection.id === collectionId)
  ) {
    return null
  }

  return collectionId
}

// IndexedDB Blob을 JSON 백업에 넣기 위한 data URL 문자열로 변환
export const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

// 백업 data URL을 IndexedDB에 다시 넣을 Blob으로 복원
export const dataUrlToBlob = async (dataUrl) => {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new Error('Invalid image data URL.')
  }

  const response = await fetch(dataUrl)

  if (!response.ok) {
    throw new Error('Could not restore image blob.')
  }

  return response.blob()
}

// IndexedDB 사진 기록을 JSON 백업 가능한 구조로 직렬화
export const serializePhotoRecordsForBackup = async (records) =>
  Promise.all(
    records.map(async (record) => ({
      id: record.id,
      previewImageDataUrl: await blobToDataUrl(record.previewImageBlob),
      previewImageHeight: record.previewImageHeight,
      previewImageMimeType: record.previewImageMimeType,
      previewImageWidth: record.previewImageWidth,
      originalFileName: record.originalFileName,
      fileType: record.fileType,
      takenAt: record.takenAt,
      latitude: record.latitude,
      longitude: record.longitude,
      collectionId: record.collectionId ?? null,
      locationSource: normalizeLocationSource(record.locationSource),
      title: record.title,
      memo: record.memo,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })),
  )

// Map 백업 record의 필수 메타데이터와 이미지 문자열을 복원 전 검증
export const validateMapBackupRecordShape = (record, collections = []) => {
  if (!isPlainObject(record)) {
    return null
  }

  if (
    typeof record.id !== 'string' ||
    typeof record.previewImageDataUrl !== 'string' ||
    !record.previewImageDataUrl.startsWith('data:image/') ||
    !isFiniteCoordinate(record.latitude) ||
    !isFiniteCoordinate(record.longitude)
  ) {
    return null
  }

  return {
    id: record.id,
    previewImageDataUrl: record.previewImageDataUrl,
    previewImageHeight: Number(record.previewImageHeight) || 0,
    previewImageMimeType: record.previewImageMimeType || 'image/jpeg',
    previewImageWidth: Number(record.previewImageWidth) || 0,
    originalFileName: String(record.originalFileName ?? ''),
    fileType: String(record.fileType ?? ''),
    takenAt: String(record.takenAt ?? ''),
    latitude: Number(record.latitude),
    longitude: Number(record.longitude),
    collectionId: normalizeCollectionId(record.collectionId, collections),
    locationSource: normalizeLocationSource(record.locationSource),
    title: String(record.title ?? record.originalFileName ?? ''),
    memo: String(record.memo ?? ''),
    createdAt: String(record.createdAt ?? new Date().toISOString()),
    updatedAt: String(record.updatedAt ?? record.createdAt ?? new Date().toISOString()),
  }
}

// Map 컬렉션 백업 record의 필수 구조 검증
export const validateMapCollectionBackupRecordShape = (collection) => {
  if (
    !isPlainObject(collection) ||
    typeof collection.id !== 'string' ||
    typeof collection.name !== 'string' ||
    !collection.name.trim()
  ) {
    return null
  }

  return {
    id: collection.id,
    name: collection.name.trim(),
    description: String(collection.description ?? ''),
    startDate: String(collection.startDate ?? ''),
    endDate: String(collection.endDate ?? ''),
    createdAt: String(collection.createdAt ?? new Date().toISOString()),
    updatedAt: String(
      collection.updatedAt ?? collection.createdAt ?? new Date().toISOString(),
    ),
  }
}

// IndexedDB 컬렉션을 JSON 백업 가능한 구조로 직렬화
export const serializePhotoCollectionsForBackup = (collections) =>
  collections.map(validateMapCollectionBackupRecordShape).filter(Boolean)

// 복원 전 컬렉션 손상 여부와 정상 복원 가능 목록 요약 생성
export const preparePhotoCollectionsForRestore = (backupCollections) => {
  const totalCount = Array.isArray(backupCollections)
    ? backupCollections.length
    : 0
  const restoredCollections = []
  let damagedCount = 0

  if (!Array.isArray(backupCollections)) {
    return {
      damagedCount: 0,
      restoredCollections,
      totalCount: 0,
      validCount: 0,
    }
  }

  backupCollections.forEach((collection) => {
    const normalizedCollection =
      validateMapCollectionBackupRecordShape(collection)

    if (!normalizedCollection) {
      damagedCount += 1
      return
    }

    restoredCollections.push(normalizedCollection)
  })

  return {
    damagedCount,
    restoredCollections,
    totalCount,
    validCount: restoredCollections.length,
  }
}

// 복원 전 모든 이미지 data URL을 Blob으로 변환하고 손상 record 요약 생성
export const preparePhotoRecordsForRestore = async (
  backupRecords,
  collections = [],
) => {
  const totalCount = Array.isArray(backupRecords) ? backupRecords.length : 0
  const restoredRecords = []
  let damagedCount = 0

  if (!Array.isArray(backupRecords)) {
    return {
      damagedCount: 0,
      restoredRecords,
      totalCount: 0,
      validCount: 0,
    }
  }

  for (const record of backupRecords) {
    const normalizedRecord = validateMapBackupRecordShape(record, collections)

    if (!normalizedRecord) {
      damagedCount += 1
      continue
    }

    try {
      // 기존 IndexedDB 데이터를 건드리기 전 Blob 복원 가능 여부 사전 확인
      const previewImageBlob = await dataUrlToBlob(
        normalizedRecord.previewImageDataUrl,
      )

      const { previewImageDataUrl, ...restorableRecord } = normalizedRecord

      void previewImageDataUrl

      restoredRecords.push({
        ...restorableRecord,
        previewImageBlob,
      })
    } catch {
      damagedCount += 1
    }
  }

  return {
    damagedCount,
    restoredRecords,
    totalCount,
    validCount: restoredRecords.length,
  }
}
