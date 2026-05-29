import exifr from 'exifr'

const DATE_CANDIDATE_KEYS = [
  'DateTimeOriginal',
  'CreateDate',
  'ModifyDate',
  'DateTime',
]

const isValidCoordinate = (value) => Number.isFinite(value)

export const formatExifDate = (value) => {
  if (!value) {
    return ''
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleString()
  }

  return String(value)
}

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
    source: 'exif',
    status: 'located',
    takenAt,
  }
}

export const createManualLocation = (previousLocation, latitude, longitude) => {
  const nextLatitude = Number(latitude)
  const nextLongitude = Number(longitude)

  if (!isValidCoordinate(nextLatitude) || !isValidCoordinate(nextLongitude)) {
    return previousLocation
  }

  // 지도 클릭 좌표는 저장하지 않고 현재 사진의 임시 위치로만 덮어씁니다.
  return {
    fileName: previousLocation?.fileName ?? '',
    latitude: nextLatitude,
    longitude: nextLongitude,
    source: 'manual',
    status: 'located',
    takenAt: previousLocation?.takenAt ?? '',
  }
}

export const readPhotoLocation = async (file) => {
  // PoC에서는 업로드된 사진을 저장하지 않고 브라우저 메모리에서 EXIF만 읽습니다.
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
