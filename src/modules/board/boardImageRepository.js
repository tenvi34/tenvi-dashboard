import {
  createBoardImage as createRemoteBoardImage,
  deleteBoardImage as deleteRemoteBoardImage,
  fetchBoardImage,
  fetchBoardImages,
} from '../../api/boardApi.js'
import { readBoardStorageMode } from './boardStorageMode.js'
import {
  deleteBoardImage as deleteLocalBoardImage,
  deleteBoardImages as deleteLocalBoardImages,
  getAllBoardImages as getAllLocalBoardImages,
  getBoardImage as getLocalBoardImage,
  getBoardImages as getLocalBoardImages,
  putBoardImages as putLocalBoardImages,
  saveBoardImage as saveLocalBoardImage,
} from '../boardImageStore.js'

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const createBoardImageId = () => {
  if (globalThis.crypto?.randomUUID) {
    return `board-image-${globalThis.crypto.randomUUID()}`
  }

  return `board-image-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isRemoteMode = () => readBoardStorageMode() === 'remote'

const saveRemoteBoardImage = async (file) => {
  const imageRecord = {
    id: createBoardImageId(),
    dataUrl: await readFileAsDataUrl(file),
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  }
  const createdImage = await createRemoteBoardImage(imageRecord)

  return {
    imageId: createdImage.id,
    name: createdImage.name,
    type: createdImage.type,
  }
}

export const saveBoardImage = (file) =>
  isRemoteMode() ? saveRemoteBoardImage(file) : saveLocalBoardImage(file)

export const getBoardImage = (imageId) =>
  isRemoteMode() ? fetchBoardImage(imageId).catch(() => null) : getLocalBoardImage(imageId)

export const getBoardImages = async (imageIds = []) => {
  if (!isRemoteMode()) {
    return getLocalBoardImages(imageIds)
  }

  const uniqueImageIds = [...new Set(imageIds.filter(Boolean))]
  const entries = await Promise.all(
    uniqueImageIds.map(async (imageId) => [imageId, await getBoardImage(imageId)]),
  )

  return Object.fromEntries(entries.filter(([, image]) => image))
}

export const getAllBoardImages = () =>
  isRemoteMode() ? fetchBoardImages() : getAllLocalBoardImages()

export const putBoardImages = async (imageRecords = []) => {
  if (!isRemoteMode()) {
    return putLocalBoardImages(imageRecords)
  }

  for (const imageRecord of imageRecords.filter((record) => record?.id)) {
    await createRemoteBoardImage(imageRecord).catch(() => null)
  }
}

export const deleteBoardImage = (imageId) =>
  isRemoteMode() ? deleteRemoteBoardImage(imageId) : deleteLocalBoardImage(imageId)

export const deleteBoardImages = async (imageIds = []) => {
  if (!isRemoteMode()) {
    return deleteLocalBoardImages(imageIds)
  }

  await Promise.all([...new Set(imageIds.filter(Boolean))].map(deleteRemoteBoardImage))
}

export const localBoardImageRepository = {
  getAllImages: getAllLocalBoardImages,
}

export const remoteBoardImageRepository = {
  createImage: createRemoteBoardImage,
  fetchImages: fetchBoardImages,
}
