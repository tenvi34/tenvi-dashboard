import { describe, expect, it } from 'vitest'
import {
  applyManualLocationToDraft,
  applySearchLocationToDraft,
  createEditDraft,
  createPhotoDraft,
  createPhotoRecordInput,
  createPhotoRecordUpdatePatch,
  createManualLocation,
  normalizeLocationSource,
  isPhotoDraftReadyToSave,
  normalizePhotoLocation,
} from './mapLogic.js'

describe('mapLogic', () => {
  it('normalizes GPS metadata into a map marker payload', () => {
    expect(
      normalizePhotoLocation('sample.jpg', {
        DateTimeOriginal: '2026:05:29 10:20:30',
        latitude: 37.5665,
        longitude: 126.978,
      }),
    ).toEqual({
      fileName: 'sample.jpg',
      latitude: 37.5665,
      longitude: 126.978,
      locationSource: 'exif',
      status: 'located',
      takenAt: '2026:05:29 10:20:30',
    })
  })

  it('returns a missing-location result when GPS metadata is absent', () => {
    expect(normalizePhotoLocation('no-gps.jpg', {})).toEqual({
      fileName: 'no-gps.jpg',
      status: 'missing-location',
      takenAt: '',
    })
  })

  it('creates a manual location while preserving photo context', () => {
    expect(
      createManualLocation(
        {
          fileName: 'manual.jpg',
          status: 'missing-location',
          takenAt: '2026:05:29 10:20:30',
        },
        35.1796,
        129.0756,
      ),
    ).toEqual({
      fileName: 'manual.jpg',
      latitude: 35.1796,
      longitude: 129.0756,
      locationSource: 'manual',
      status: 'located',
      takenAt: '2026:05:29 10:20:30',
    })
  })

  it('creates a save-ready draft from a photo file and detected location', () => {
    const draft = createPhotoDraft(
      { name: 'trip.jpg', type: 'image/jpeg' },
      {
        latitude: 37.5,
        locationSource: 'exif',
        longitude: 127.1,
        status: 'located',
        takenAt: '2026:05:29 10:20:30',
      },
      {
        blob: new Blob(['preview'], { type: 'image/jpeg' }),
        height: 600,
        mimeType: 'image/jpeg',
        width: 900,
      },
    )

    expect(isPhotoDraftReadyToSave(draft)).toBe(true)
    expect(createPhotoRecordInput(draft)).toMatchObject({
      fileType: 'image/jpeg',
      latitude: 37.5,
      locationSource: 'exif',
      longitude: 127.1,
      originalFileName: 'trip.jpg',
      previewImageHeight: 600,
      previewImageMimeType: 'image/jpeg',
      previewImageWidth: 900,
      title: 'trip',
    })
  })

  it('applies manual map coordinates to an existing draft', () => {
    const draft = {
      originalFileName: 'no-gps.jpg',
      status: 'missing-location',
      takenAt: '',
    }

    expect(applyManualLocationToDraft(draft, 33.4507, 126.5707)).toEqual({
      originalFileName: 'no-gps.jpg',
      latitude: 33.4507,
      locationSource: 'manual',
      longitude: 126.5707,
      status: 'located',
      takenAt: '',
    })
  })

  it('applies search result coordinates to a draft', () => {
    expect(
      applySearchLocationToDraft(
        {
          originalFileName: 'search.jpg',
          status: 'located',
        },
        {
          latitude: '33.5903',
          longitude: '130.4208',
        },
      ),
    ).toMatchObject({
      latitude: 33.5903,
      locationSource: 'search',
      longitude: 130.4208,
      status: 'located',
    })
  })

  it('creates an edit draft without mutating the original record', () => {
    const record = {
      id: 'record-1',
      latitude: 35.1796,
      longitude: 129.0756,
      memo: 'before',
      originalFileName: 'busan.jpg',
      title: 'Busan',
    }
    const editDraft = createEditDraft(record)

    editDraft.title = 'Changed'

    expect(record.title).toBe('Busan')
    expect(createPhotoRecordUpdatePatch(editDraft)).toMatchObject({
      latitude: 35.1796,
      locationSource: 'manual',
      longitude: 129.0756,
      memo: 'before',
      title: 'Changed',
    })
  })

  it('falls back unknown location sources for existing records', () => {
    expect(normalizeLocationSource()).toBe('manual')
    expect(normalizeLocationSource('legacy')).toBe('manual')
    expect(normalizeLocationSource('search')).toBe('search')
  })
})
