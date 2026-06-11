import { useState } from 'react'
import {
  COLLECTION_FILTER_UNASSIGNED,
  isPhotoCollectionInputValid,
  normalizePhotoCollectionInput,
} from '../mapLogic.js'
import {
  createPhotoCollection,
  deletePhotoCollection,
  updatePhotoCollection,
} from '../../services/photoCollectionRepository.js'

function useMapCollectionController({
  getCollectionRecordCount,
  setCollections,
  setError,
  setRecords,
  setSelectedCollectionFilter,
  setStatusMessage,
  t,
}) {
  const [collectionDraft, setCollectionDraft] = useState(() =>
    normalizePhotoCollectionInput(),
  )
  const [editingCollectionId, setEditingCollectionId] = useState('')

  const handleChangeCollectionDraft = (patch) => {
    setCollectionDraft((currentDraft) => ({ ...currentDraft, ...patch }))
  }

  const resetCollectionDraft = () => {
    setCollectionDraft(normalizePhotoCollectionInput())
    setEditingCollectionId('')
  }

  const handleStartCollectionEdit = (collection) => {
    setCollectionDraft(normalizePhotoCollectionInput(collection))
    setEditingCollectionId(collection.id)
  }

  const handleSaveCollection = async () => {
    const normalizedInput = normalizePhotoCollectionInput(collectionDraft)

    if (!isPhotoCollectionInputValid(normalizedInput)) {
      setError(t.map.collectionNameRequired)
      return
    }

    setError('')

    try {
      if (editingCollectionId) {
        const updatedCollection = await updatePhotoCollection(
          editingCollectionId,
          normalizedInput,
        )

        if (!updatedCollection) {
          throw new Error('Missing collection.')
        }

        setCollections((currentCollections) =>
          currentCollections.map((collection) =>
            collection.id === updatedCollection.id ? updatedCollection : collection,
          ),
        )
        setStatusMessage(t.map.collectionUpdated)
      } else {
        const createdCollection = await createPhotoCollection(normalizedInput)

        setCollections((currentCollections) => [
          createdCollection,
          ...currentCollections,
        ])
        setStatusMessage(t.map.collectionCreated)
      }

      resetCollectionDraft()
    } catch {
      setError(t.map.collectionSaveError)
    }
  }

  const handleDeleteCollection = async (collection) => {
    const affectedRecordCount = getCollectionRecordCount(collection.id)
    const confirmed = window.confirm(
      t.map.deleteCollectionConfirm(collection.name, affectedRecordCount),
    )

    if (!confirmed) {
      return
    }

    setError('')

    try {
      // 컬렉션 삭제 transaction
      await deletePhotoCollection(collection.id)
      setCollections((currentCollections) =>
        currentCollections.filter((item) => item.id !== collection.id),
      )
      setRecords((currentRecords) =>
        currentRecords.map((record) =>
          record.collectionId === collection.id
            ? { ...record, collectionId: null }
            : record,
        ),
      )
      setSelectedCollectionFilter((currentFilter) =>
        currentFilter === collection.id ? COLLECTION_FILTER_UNASSIGNED : currentFilter,
      )
      if (editingCollectionId === collection.id) {
        resetCollectionDraft()
      }
      setStatusMessage(t.map.collectionDeleted)
    } catch {
      setError(t.map.collectionDeleteError)
    }
  }

  return {
    collectionDraft,
    editingCollectionId,
    handleChangeCollectionDraft,
    handleDeleteCollection,
    handleSaveCollection,
    handleStartCollectionEdit,
    resetCollectionDraft,
  }
}

export default useMapCollectionController
