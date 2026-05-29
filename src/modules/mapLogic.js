import exifr from 'exifr'

const DATE_CANDIDATE_KEYS = [
  'DateTimeOriginal',
  'CreateDate',
  'ModifyDate',
  'DateTime',
]
const LOCATION_SOURCES = ['exif', 'manual', 'search']

const isValidCoordinate = (value) => Number.isFinite(value)

// 기존 기록의 누락되거나 알 수 없는 locationSource fallback
export const normalizeLocationSource = (source) =>
  LOCATION_SOURCES.includes(source) ? source : 'manual'

// EXIF 날짜 값을 UI 저장용 문자열로 통일
export const formatExifDate = (value) => {
  if (!value) {
    return ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString()
  }

  return String(value)
}

// EXIF GPS와 촬영일을 Map 위치 상태로 정규화
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

// 지도 클릭 좌표를 현재 선택 사진의 임시 위치로 반영
export const createManualLocation = (previousLocation, latitude, longitude) => {
  const nextLatitude = Number(latitude)
  const nextLongitude = Number(longitude)

  if (!isValidCoordinate(nextLatitude) || !isValidCoordinate(nextLongitude)) {
    return previousLocation
  }

  // 지도 클릭 좌표를 현재 사진의 임시 위치로만 반영
  return {
    fileName: previousLocation?.fileName ?? '',
    latitude: nextLatitude,
    longitude: nextLongitude,
    locationSource: normalizeLocationSource('manual'),
    status: 'located',
    takenAt: previousLocation?.takenAt ?? '',
  }
}

// 선택한 사진, 미리보기 Blob, EXIF 위치 기반 저장 전 draft 생성
export const createPhotoDraft = (file, location, previewImage) => ({
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

// 검색 결과 좌표를 draft 위치로 반영
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

// 저장 전 draft에 지도 클릭 좌표 적용
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

// IndexedDB 신규 저장 전 필수 좌표와 미리보기 Blob 검증
export const isPhotoDraftReadyToSave = (draft) =>
  Boolean(
    draft?.previewImageBlob &&
      draft.status === 'located' &&
      isValidCoordinate(Number(draft.latitude)) &&
      isValidCoordinate(Number(draft.longitude)),
  )

// 저장된 기록을 원본 변경 없이 편집용 draft로 복사
export const createEditDraft = (record) => {
  if (!record) {
    return null
  }

  return {
    id: record.id,
    latitude: Number(record.latitude),
    locationSource: normalizeLocationSource(record.locationSource),
    longitude: Number(record.longitude),
    memo: record.memo ?? '',
    originalFileName: record.originalFileName ?? '',
    status: 'located',
    title: record.title ?? record.originalFileName ?? '',
  }
}

// IndexedDB update 전 편집 draft 좌표와 제목 검증
export const isEditDraftReadyToSave = (editDraft) =>
  Boolean(
    editDraft?.id &&
      editDraft.status === 'located' &&
      isValidCoordinate(Number(editDraft.latitude)) &&
      isValidCoordinate(Number(editDraft.longitude)),
  )

// 편집 draft를 저장소 update patch 구조로 변환
export const createPhotoRecordUpdatePatch = (editDraft) => {
  if (!isEditDraftReadyToSave(editDraft)) {
    return null
  }

  return {
    latitude: Number(editDraft.latitude),
    locationSource: normalizeLocationSource(editDraft.locationSource),
    longitude: Number(editDraft.longitude),
    memo: editDraft.memo.trim(),
    title: editDraft.title.trim() || editDraft.originalFileName,
  }
}

// 화면 draft를 저장소 입력 구조로 변환
export const createPhotoRecordInput = (draft) => {
  if (!isPhotoDraftReadyToSave(draft)) {
    return null
  }

  return {
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
  // 업로드 사진 저장 없이 브라우저 메모리에서 EXIF만 읽기
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
