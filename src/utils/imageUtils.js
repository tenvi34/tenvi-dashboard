const DEFAULT_MAX_SIZE = 1200
const DEFAULT_MIME_TYPE = 'image/jpeg'
const DEFAULT_QUALITY = 0.82

// 미리보기 크기 계산
export const calculatePreviewSize = (width, height, maxSize = DEFAULT_MAX_SIZE) => {
  if (width <= 0 || height <= 0) {
    return { height: 0, width: 0 }
  }

  const scale = Math.min(1, maxSize / Math.max(width, height))

  return {
    height: Math.round(height * scale),
    width: Math.round(width * scale),
  }
}

// object URL 이미지 로드
const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load image file.'))
    }

    image.src = objectUrl
  })

const canvasToBlob = (canvas, mimeType, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('Could not create preview image.'))
      },
      mimeType,
      quality,
    )
  })

// IndexedDB 미리보기 Blob
export const createPreviewImageBlob = async (
  file,
  {
    maxSize = DEFAULT_MAX_SIZE,
    mimeType = DEFAULT_MIME_TYPE,
    quality = DEFAULT_QUALITY,
  } = {},
) => {
  const image = await loadImageFromFile(file)
  const { height, width } = calculatePreviewSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    maxSize,
  )
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height
  context.drawImage(image, 0, 0, width, height)

  const blob = await canvasToBlob(canvas, mimeType, quality)

  return {
    blob,
    height,
    mimeType,
    width,
  }
}
