import {
  createPhotoRecord,
  createPhotoRecords,
  deletePhotoRecord,
  getPhotoRecordCount,
  getPhotoRecords,
  updatePhotoRecord,
} from '../../../services/photoArchiveRepository.js'
import {
  createPhotoCollection,
  deletePhotoCollection,
  getPhotoCollections,
  updatePhotoCollection,
} from '../../../services/photoCollectionRepository.js'

export const localMapRepository = {
  createCollection: createPhotoCollection,
  createRecord: createPhotoRecord,
  createRecords: createPhotoRecords,
  deleteCollection: deletePhotoCollection,
  deleteRecord: deletePhotoRecord,
  fetchCollectionCount: async () => (await getPhotoCollections()).length,
  fetchCollections: getPhotoCollections,
  fetchRecordCount: getPhotoRecordCount,
  fetchRecords: getPhotoRecords,
  updateCollection: updatePhotoCollection,
  updateRecord: updatePhotoRecord,
}
