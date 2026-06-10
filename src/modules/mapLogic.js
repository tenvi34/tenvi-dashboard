import exifr from 'exifr'

const DATE_CANDIDATE_KEYS = [
  'DateTimeOriginal',
  'CreateDate',
  'ModifyDate',
  'DateTime',
]
const LOCATION_SOURCES = ['exif', 'manual', 'search']
export const COLLECTION_FILTER_ALL = 'all'
export const COLLECTION_FILTER_UNASSIGNED = 'unassigned'
export const LOCATION_SOURCE_FILTER_ALL = 'all'
export const LOCATION_SOURCE_FILTER_UNKNOWN = 'unknown'

const isValidCoordinate = (value) => Number.isFinite(value)

// locationSource fallback
export const normalizeLocationSource = (source) =>
  LOCATION_SOURCES.includes(source) ? source : 'manual'

// collectionId 보정
export const normalizePhotoRecordCollectionId = (record, collections = []) => {
  const collectionId = record?.collectionId

  if (typeof collectionId !== 'string' || !collectionId.trim()) {
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

// 컬렉션 입력 정규화
export const normalizePhotoCollectionInput = (input = {}) => ({
  description: String(input.description ?? '').trim(),
  endDate: String(input.endDate ?? ''),
  name: String(input.name ?? '').trim(),
  startDate: String(input.startDate ?? ''),
})

// 컬렉션 이름 검증
export const isPhotoCollectionInputValid = (input = {}) =>
  Boolean(normalizePhotoCollectionInput(input).name)

// 컬렉션 필터 계산
export const filterPhotoRecordsByCollection = (
  records,
  collections,
  selectedFilter,
) => {
  if (selectedFilter === COLLECTION_FILTER_ALL) {
    return records
  }

  const collectionIds = new Set(collections.map((collection) => collection.id))

  if (selectedFilter === COLLECTION_FILTER_UNASSIGNED) {
    // 미분류 record 포함
    return records.filter(
      (record) => !record.collectionId || !collectionIds.has(record.collectionId),
    )
  }

  return records.filter((record) => record.collectionId === selectedFilter)
}

// EXIF 날짜 정규화
const normalizeSearchText = (value) => String(value ?? '').trim().toLowerCase()

// legacy source 분류
export const normalizeLocationSourceForFilter = (source) =>
  LOCATION_SOURCES.includes(source) ? source : LOCATION_SOURCE_FILTER_UNKNOWN

// 검색/위치 필터
export const filterPhotoRecordsBySearchAndLocation = (
  records,
  { locationSourceFilter = LOCATION_SOURCE_FILTER_ALL, searchQuery = '' } = {},
) => {
  const normalizedQuery = normalizeSearchText(searchQuery)

  return records.filter((record) => {
    const matchesSearch =
      !normalizedQuery ||
      [record?.title, record?.memo, record?.originalFileName].some((value) =>
        normalizeSearchText(value).includes(normalizedQuery),
      )
    const normalizedSource = normalizeLocationSourceForFilter(
      record?.locationSource,
    )
    const matchesSource =
      locationSourceFilter === LOCATION_SOURCE_FILTER_ALL ||
      normalizedSource === locationSourceFilter

    return matchesSearch && matchesSource
  })
}

export const formatExifDate = (value) => {
  if (!value) {
    return ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString()
  }

  return String(value)
}

// EXIF 위치 정규화
export const normalizePhotoLocation = (fileName, metadata = {}) => {
  const latitude = Number(metadata.latitude)
  const longitude = Number(metadata.longitude)
  const dateKey = DATE_CANDIDATE_KEYS.find((key) => metadata[key])
  const takenAt = formatExifDate(metadata[dateKey])

  if (!isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
    return {
      fileName,
      status: 'missing-location',
      takenAt,
    }
  }

  return {
    fileName,
    latitude,
    longitude,
    locationSource: normalizeLocationSource('exif'),
    status: 'located',
    takenAt,
  }
}

// 지도 클릭 위치 반영
export const createManualLocation = (previousLocation, latitude, longitude) => {
  const nextLatitude = Number(latitude)
  const nextLongitude = Number(longitude)

  if (!isValidCoordinate(nextLatitude) || !isValidCoordinate(nextLongitude)) {
    return previousLocation
  }

  // 임시 위치 반영
  return {
    fileName: previousLocation?.fileName ?? '',
    latitude: nextLatitude,
    longitude: nextLongitude,
    locationSource: normalizeLocationSource('manual'),
    status: 'located',
    takenAt: previousLocation?.takenAt ?? '',
  }
}

// 사진 draft 생성
export const createPhotoDraft = (file, location, previewImage) => ({
  collectionId: null,
  fileType: file.type,
  latitude: location.latitude,
  locationSource: location.locationSource,
  longitude: location.longitude,
  memo: '',
  originalFileName: file.name,
  previewImageBlob: previewImage.blob,
  previewImageHeight: previewImage.height,
  previewImageMimeType: previewImage.mimeType,
  previewImageWidth: previewImage.width,
  status: location.status,
  takenAt: location.takenAt ?? '',
  title: file.name.replace(/\.[^.]+$/, ''),
})

// 검색 좌표 반영
export const applySearchLocationToDraft = (draft, place) => {
  const latitude = Number(place?.latitude)
  const longitude = Number(place?.longitude)

  if (!draft || !isValidCoordinate(latitude) || !isValidCoordinate(longitude)) {
    return draft
  }

  return {
    ...draft,
    latitude,
    locationSource: 'search',
    longitude,
    status: 'located',
  }
}

// draft 지도 좌표 적용
export const applyManualLocationToDraft = (draft, latitude, longitude) => {
  const manualLocation = createManualLocation(
    {
      fileName: draft?.originalFileName,
      takenAt: draft?.takenAt,
    },
    latitude,
    longitude,
  )

  if (!draft || manualLocation?.status !== 'located') {
    return draft
  }

  return {
    ...draft,
    latitude: manualLocation.latitude,
    locationSource: manualLocation.locationSource,
    longitude: manualLocation.longitude,
    status: 'located',
  }
}

// 신규 저장 검증
export const isPhotoDraftReadyToSave = (draft) =>
  Boolean(
    draft?.previewImageBlob &&
      draft.status === 'located' &&
      isValidCoordinate(Number(draft.latitude)) &&
      isValidCoordinate(Number(draft.longitude)),
  )

// 편집 draft 복사
export const createEditDraft = (record) => {
  if (!record) {
    return null
  }

  return {
    id: record.id,
    collectionId: record.collectionId ?? null,
    latitude: Number(record.latitude),
    locationSource: normalizeLocationSource(record.locationSource),
    longitude: Number(record.longitude),
    memo: record.memo ?? '',
    originalFileName: record.originalFileName ?? '',
    status: 'located',
    title: record.title ?? record.originalFileName ?? '',
  }
}

// 편집 draft 검증
export const isEditDraftReadyToSave = (editDraft) =>
  Boolean(
    editDraft?.id &&
      editDraft.status === 'located' &&
      isValidCoordinate(Number(editDraft.latitude)) &&
      isValidCoordinate(Number(editDraft.longitude)),
  )

// update patch 변환
export const createPhotoRecordUpdatePatch = (editDraft) => {
  if (!isEditDraftReadyToSave(editDraft)) {
    return null
  }

  return {
    collectionId: editDraft.collectionId ?? null,
    latitude: Number(editDraft.latitude),
    locationSource: normalizeLocationSource(editDraft.locationSource),
    longitude: Number(editDraft.longitude),
    memo: editDraft.memo.trim(),
    title: editDraft.title.trim() || editDraft.originalFileName,
  }
}

// 저장소 입력 변환
export const createPhotoRecordInput = (draft) => {
  if (!isPhotoDraftReadyToSave(draft)) {
    return null
  }

  return {
    collectionId: draft.collectionId ?? null,
    fileType: draft.fileType,
    latitude: Number(draft.latitude),
    locationSource: normalizeLocationSource(draft.locationSource),
    longitude: Number(draft.longitude),
    memo: draft.memo.trim(),
    originalFileName: draft.originalFileName,
    previewImageBlob: draft.previewImageBlob,
    previewImageHeight: draft.previewImageHeight,
    previewImageMimeType: draft.previewImageMimeType,
    previewImageWidth: draft.previewImageWidth,
    takenAt: draft.takenAt,
    title: draft.title.trim() || draft.originalFileName,
  }
}

export const readPhotoLocation = async (file) => {
  // 메모리 EXIF 읽기
  const gpsMetadata = await exifr.gps(file).catch(() => null)
  const metadata = await exifr
    .parse(file, {
      exif: true,
      tiff: true,
      pick: DATE_CANDIDATE_KEYS,
    })
    .catch(() => ({}))

  return normalizePhotoLocation(file.name, {
    ...metadata,
    ...gpsMetadata,
  })
}
