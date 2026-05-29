import { describe, expect, it, vi } from 'vitest'
import {
  preparePhotoCollectionsForRestore,
  preparePhotoRecordsForRestore,
  serializePhotoCollectionsForBackup,
  serializePhotoRecordsForBackup,
  validateMapCollectionBackupRecordShape,
  validateMapBackupRecordShape,
} from './photoArchiveBackupService.js'

const createMapBackupRecord = (overrides = {}) => ({
  id: 'photo-1',
  previewImageDataUrl: 'data:image/jpeg;base64,cHJldmlldw==',
  previewImageHeight: 600,
  previewImageMimeType: 'image/jpeg',
  previewImageWidth: 900,
  originalFileName: 'photo.jpg',
  fileType: 'image/jpeg',
  takenAt: '2026-05-29T00:00:00.000Z',
  latitude: 33.5903,
  longitude: 130.4208,
  locationSource: 'search',
  collectionId: 'trip-1',
  title: 'Hakata',
  memo: 'memo',
  createdAt: '2026-05-29T00:00:00.000Z',
  updatedAt: '2026-05-29T00:00:00.000Z',
  ...overrides,
})

describe('photoArchiveBackupService', () => {
  it('validates a normal Map backup record shape', () => {
    expect(validateMapBackupRecordShape(createMapBackupRecord())).toMatchObject({
      id: 'photo-1',
      latitude: 33.5903,
      longitude: 130.4208,
      locationSource: 'search',
      title: 'Hakata',
    })
  })

  it('serializes Map records with preview image data URLs', async () => {
    const OriginalFileReader = globalThis.FileReader

    globalThis.FileReader = class {
      readAsDataURL(blob) {
        this.result = `data:${blob.type};base64,cHJldmlldw==`
        this.onload()
      }
    }

    try {
      const [serializedRecord] = await serializePhotoRecordsForBackup([
        {
          id: 'photo-1',
          previewImageBlob: new Blob(['preview'], { type: 'image/jpeg' }),
          previewImageHeight: 600,
          previewImageMimeType: 'image/jpeg',
          previewImageWidth: 900,
          originalFileName: 'photo.jpg',
          fileType: 'image/jpeg',
          takenAt: '2026-05-29T00:00:00.000Z',
          latitude: 33.5903,
          longitude: 130.4208,
          locationSource: 'exif',
          collectionId: 'trip-1',
          title: 'Hakata',
          memo: 'memo',
          createdAt: '2026-05-29T00:00:00.000Z',
          updatedAt: '2026-05-29T00:00:00.000Z',
        },
      ])

      expect(serializedRecord.previewImageDataUrl).toBe(
        'data:image/jpeg;base64,cHJldmlldw==',
      )
      expect(serializedRecord.locationSource).toBe('exif')
      expect(serializedRecord.collectionId).toBe('trip-1')
    } finally {
      globalThis.FileReader = OriginalFileReader
    }
  })

  it('rejects damaged image data URL records', () => {
    expect(
      validateMapBackupRecordShape(
        createMapBackupRecord({ previewImageDataUrl: 'not-image' }),
      ),
    ).toBeNull()
  })

  it('keeps exif, manual, and search location sources', () => {
    expect(
      validateMapBackupRecordShape(
        createMapBackupRecord({ locationSource: 'exif' }),
      ).locationSource,
    ).toBe('exif')
    expect(
      validateMapBackupRecordShape(
        createMapBackupRecord({ locationSource: 'manual' }),
      ).locationSource,
    ).toBe('manual')
    expect(
      validateMapBackupRecordShape(
        createMapBackupRecord({ locationSource: 'search' }),
      ).locationSource,
    ).toBe('search')
  })

  it('falls back unknown location sources to manual', () => {
    expect(
      validateMapBackupRecordShape(
        createMapBackupRecord({ locationSource: 'legacy' }),
      ).locationSource,
    ).toBe('manual')
  })

  it('restores missing collection links as null when collection backup is absent', () => {
    expect(
      validateMapBackupRecordShape(createMapBackupRecord(), null).collectionId,
    ).toBeNull()
  })

  it('keeps collection links that exist in restored collections', () => {
    expect(
      validateMapBackupRecordShape(createMapBackupRecord(), [{ id: 'trip-1' }])
        .collectionId,
    ).toBe('trip-1')
  })

  it('serializes and validates Map collections', () => {
    const [collection] = serializePhotoCollectionsForBackup([
      {
        id: 'trip-1',
        name: 'Fukuoka 2026',
        description: 'trip',
        startDate: '2026-05-01',
        endDate: '2026-05-05',
        createdAt: '2026-05-29T00:00:00.000Z',
        updatedAt: '2026-05-29T00:00:00.000Z',
      },
    ])

    expect(collection).toMatchObject({
      id: 'trip-1',
      name: 'Fukuoka 2026',
    })
    expect(validateMapCollectionBackupRecordShape(collection)).toMatchObject({
      id: 'trip-1',
    })
  })

  it('summarizes damaged collection records before restore', () => {
    const result = preparePhotoCollectionsForRestore([
      { id: 'trip-1', name: 'Fukuoka 2026' },
      { id: 'broken', name: '' },
    ])

    expect(result.totalCount).toBe(2)
    expect(result.validCount).toBe(1)
    expect(result.damagedCount).toBe(1)
  })

  it('summarizes valid and damaged records before restore', async () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = vi.fn(async () => ({
      blob: async () => new Blob(['preview'], { type: 'image/jpeg' }),
      ok: true,
    }))

    try {
      const result = await preparePhotoRecordsForRestore([
        createMapBackupRecord(),
        createMapBackupRecord({ id: 'broken', previewImageDataUrl: 'broken' }),
      ])

      expect(result.totalCount).toBe(2)
      expect(result.validCount).toBe(1)
      expect(result.damagedCount).toBe(1)
      expect(result.restoredRecords[0].previewImageBlob).toBeInstanceOf(Blob)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
