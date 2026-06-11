import { useRef, useState } from 'react'
import {
  applyLocationToBulkItems,
  clearBulkMissingLocationSelection,
  createBulkPhotoAnalysisItem,
  createBulkPhotoRecordInputs,
  createBulkPhotoSaveResult,
  selectAllBulkLocationAssignableItems,
  toggleBulkMissingLocationSelection,
} from '../bulkPhotoUploadLogic.js'
import { readPhotoLocation } from '../mapLogic.js'
import {
  createPhotoRecords,
  getPhotoRecords,
} from '../../services/photoArchiveRepository.js'
import { createPreviewImageBlob } from '../../utils/imageUtils.js'

const createBulkUploadId = (file, index) =>
  `${file.name}-${file.lastModified}-${file.size}-${index}`

const createInitialBulkUploadState = () => ({
  collectionId: null,
  items: [],
  processed: 0,
  saveResult: null,
  status: 'idle',
  total: 0,
})

function useMapBulkUploadController({
  createViewportRequest,
  setActiveRecordId,
  setError,
  setRecords,
  setStatusMessage,
  setViewportRequest,
  t,
}) {
  const bulkCancelRef = useRef(false)
  const [bulkUpload, setBulkUpload] = useState(() =>
    createInitialBulkUploadState(),
  )
  const [selectedMissingLocationItemIds, setSelectedMissingLocationItemIds] =
    useState([])
  const [bulkAssignedLocation, setBulkAssignedLocation] = useState(null)
  const [bulkSaveReport, setBulkSaveReport] = useState(null)

  const resetBulkUpload = () => {
    bulkCancelRef.current = false
    // bulk 임시 상태 정리
    setBulkAssignedLocation(null)
    setBulkSaveReport(null)
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
    setBulkUpload(createInitialBulkUploadState())
  }

  const analyzeBulkPhotoFiles = async (files) => {
    bulkCancelRef.current = false
    setError('')
    setStatusMessage('')
    setBulkAssignedLocation(null)
    setBulkSaveReport(null)
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
    setBulkUpload({
      ...createInitialBulkUploadState(),
      status: 'analyzing',
      total: files.length,
    })

    // bulk 순차 분석
    for (const [index, file] of files.entries()) {
      // 진행률과 취소 확인
      if (bulkCancelRef.current) {
        setBulkUpload((currentUpload) => ({
          ...currentUpload,
          status: 'cancelled',
        }))
        return
      }

      const id = createBulkUploadId(file, index)

      try {
        const location = await readPhotoLocation(file)
        const previewImage =
          location.status === 'located' ? await createPreviewImageBlob(file) : null

        setBulkUpload((currentUpload) => ({
          ...currentUpload,
          items: [
            ...currentUpload.items,
            createBulkPhotoAnalysisItem({
              file,
              fileName: file.name,
              fileType: file.type,
              id,
              location,
              previewImage,
              status: location.status,
            }),
          ],
          processed: currentUpload.processed + 1,
        }))
      } catch {
        setBulkUpload((currentUpload) => ({
          ...currentUpload,
          items: [
            ...currentUpload.items,
            createBulkPhotoAnalysisItem({
              errorMessage: t.map.readError,
              file,
              fileName: file.name,
              fileType: file.type,
              id,
              status: 'failed',
            }),
          ],
          processed: currentUpload.processed + 1,
        }))
      }
    }

    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      status: bulkCancelRef.current ? 'cancelled' : 'completed',
    }))
  }

  const handleCancelBulkAnalysis = () => {
    bulkCancelRef.current = true
  }

  const handleChangeBulkCollection = (collectionId) => {
    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      collectionId,
      saveResult: null,
    }))
  }

  const handleToggleBulkLocationTarget = (itemId) => {
    // 같은 위치 적용 대상
    setSelectedMissingLocationItemIds((currentIds) =>
      toggleBulkMissingLocationSelection(currentIds, itemId),
    )
  }

  const handleSelectAllBulkLocationTargets = () => {
    // 같은 위치 전체 선택
    setSelectedMissingLocationItemIds(
      selectAllBulkLocationAssignableItems(bulkUpload.items),
    )
  }

  const handleClearMissingLocationSelection = () => {
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
  }

  const applyBulkLocationToSelection = async (location) => {
    if (selectedMissingLocationItemIds.length === 0) {
      setError(t.map.bulkSelectLocationTargetsFirst)
      return
    }

    setError('')
    const selectedIdSet = new Set(selectedMissingLocationItemIds)
    const successfulIds = []
    const itemsWithPreview = []

    for (const item of bulkUpload.items) {
      if (!selectedIdSet.has(item.id) || item.status === 'failed') {
        itemsWithPreview.push(item)
        continue
      }

      try {
        const previewImage =
          item.previewImage?.blob || !item.file
            ? item.previewImage
            : await createPreviewImageBlob(item.file)

        if (!previewImage?.blob) {
          throw new Error('Missing preview image.')
        }

        successfulIds.push(item.id)
        itemsWithPreview.push({
          ...item,
          previewImage,
        })
      } catch {
        // 일부 실패 fallback
        itemsWithPreview.push({
          ...item,
          errorMessage: t.map.bulkPreviewCreateError,
          status: 'failed',
        })
      }
    }

    // 위치 적용 후 저장 후보
    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      items: applyLocationToBulkItems(itemsWithPreview, successfulIds, location),
      saveResult: null,
    }))
    setBulkAssignedLocation({
      ...location,
      appliedCount: successfulIds.length,
    })
    setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
  }

  const handleSelectBulkPlace = (place) => {
    // bulk 장소 검색 위치
    applyBulkLocationToSelection({
      latitude: place.latitude,
      locationSource: 'search',
      longitude: place.longitude,
    })
    setViewportRequest(createViewportRequest('search-select', place))
  }

  const handleSaveBulkLocatedPhotos = async () => {
    const recordInputs = createBulkPhotoRecordInputs(
      bulkUpload.items,
      bulkUpload.collectionId,
    )

    if (recordInputs.length === 0) {
      setError(t.map.bulkNoSaveCandidates)
      return
    }

    setError('')
    setBulkUpload((currentUpload) => ({
      ...currentUpload,
      status: 'saving',
    }))

    try {
      const results = await createPhotoRecords(recordInputs)
      const saveResult = createBulkPhotoSaveResult(results)
      const savedRecords = await getPhotoRecords()

      setRecords(savedRecords)
      setBulkSaveReport(saveResult)
      setBulkAssignedLocation(null)
      setSelectedMissingLocationItemIds(clearBulkMissingLocationSelection())
      setActiveRecordId(saveResult.savedRecords[0]?.id ?? '')
      setViewportRequest(createViewportRequest('fit-all'))
      setBulkUpload(createInitialBulkUploadState())
      setStatusMessage(
        t.map.bulkSaveComplete(saveResult.successCount, saveResult.failedCount),
      )
    } catch {
      setError(t.map.bulkSaveError)
      setBulkUpload((currentUpload) => ({
        ...currentUpload,
        status: 'completed',
      }))
    }
  }

  return {
    analyzeBulkPhotoFiles,
    applyBulkLocationToSelection,
    bulkAssignedLocation,
    bulkSaveReport,
    bulkUpload,
    handleCancelBulkAnalysis,
    handleChangeBulkCollection,
    handleClearMissingLocationSelection,
    handleSaveBulkLocatedPhotos,
    handleSelectAllBulkLocationTargets,
    handleSelectBulkPlace,
    handleToggleBulkLocationTarget,
    resetBulkUpload,
    selectedMissingLocationItemIds,
  }
}

export default useMapBulkUploadController
