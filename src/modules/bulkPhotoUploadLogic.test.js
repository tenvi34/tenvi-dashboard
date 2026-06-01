import { describe, expect, it } from 'vitest'
import {
  createBulkPhotoAnalysisItem,
  createBulkPhotoRecordInputs,
  createBulkPhotoSaveResult,
  createBulkUploadSummary,
  getBulkPhotoSaveCandidates,
} from './bulkPhotoUploadLogic.js'

const previewImage = {
  blob: new Blob(['preview'], { type: 'image/jpeg' }),
  height: 600,
  mimeType: 'image/jpeg',
  width: 900,
}

const createLocatedItem = (overrides = {}) => ({
  id: 'located-1',
  fileName: 'located.jpg',
  latitude: 33.5903,
  locationSource: 'exif',
  longitude: 130.4208,
  originalFileName: 'located.jpg',
  previewImage,
  status: 'located',
  takenAt: '2026:05:29 10:20:30',
  title: 'located',
  ...overrides,
})

describe('bulkPhotoUploadLogic', () => {
  it('classifies analysis results into located, missing-location, and failed items', () => {
    expect(
      createBulkPhotoAnalysisItem({
        fileName: 'gps.jpg',
        id: 'gps',
        location: {
          latitude: 33.5903,
          locationSource: 'exif',
          longitude: 130.4208,
          status: 'located',
        },
        previewImage,
      }),
    ).toMatchObject({ status: 'located' })

    expect(
      createBulkPhotoAnalysisItem({
        fileName: 'nogps.jpg',
        id: 'nogps',
        location: { status: 'missing-location' },
      }),
    ).toMatchObject({ status: 'missing-location' })

    expect(
      createBulkPhotoAnalysisItem({
        fileName: 'broken.jpg',
        id: 'broken',
        status: 'failed',
      }),
    ).toMatchObject({ status: 'failed' })
  })

  it('calculates upload summary counts safely', () => {
    expect(
      createBulkUploadSummary([
        createLocatedItem(),
        { id: 'missing', status: 'missing-location' },
        { id: 'failed', status: 'failed' },
        { id: 'unknown', status: 'legacy' },
      ]),
    ).toEqual({
      failed: 2,
      located: 1,
      missingLocation: 1,
      total: 4,
    })
  })

  it('selects only located photos with valid coordinates and preview blobs', () => {
    const candidates = getBulkPhotoSaveCandidates([
      createLocatedItem({ id: 'valid' }),
      createLocatedItem({ id: 'missing-preview', previewImage: null }),
      createLocatedItem({ id: 'bad-coordinate', latitude: 'bad' }),
      { id: 'missing', status: 'missing-location' },
    ])

    expect(candidates.map((item) => item.id)).toEqual(['valid'])
  })

  it('excludes photos without location from record inputs', () => {
    const inputs = createBulkPhotoRecordInputs([
      createLocatedItem({ id: 'valid' }),
      { id: 'missing', status: 'missing-location' },
    ])

    expect(inputs).toHaveLength(1)
    expect(inputs[0]).toMatchObject({
      latitude: 33.5903,
      longitude: 130.4208,
      originalFileName: 'located.jpg',
    })
  })

  it('applies the bulk collectionId to every saved record input', () => {
    const inputs = createBulkPhotoRecordInputs(
      [
        createLocatedItem({ id: 'first' }),
        createLocatedItem({ id: 'second', fileName: 'second.jpg' }),
      ],
      'fukuoka-2026',
    )

    expect(inputs).toHaveLength(2)
    expect(inputs.every((input) => input.collectionId === 'fukuoka-2026')).toBe(
      true,
    )
  })

  it('summarizes partial save failures while keeping successful records', () => {
    const result = createBulkPhotoSaveResult([
      { record: { id: 'saved-1' }, status: 'saved' },
      { fileName: 'failed.jpg', status: 'failed' },
    ])

    expect(result).toMatchObject({
      failedCount: 1,
      successCount: 1,
    })
    expect(result.savedRecords).toEqual([{ id: 'saved-1' }])
    expect(result.failedItems).toEqual([{ fileName: 'failed.jpg', status: 'failed' }])
  })
})
