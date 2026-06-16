import { describe, expect, it } from 'vitest'
import {
  applyManualLocationToDraft,
  applySearchLocationToDraft,
  COLLECTION_FILTER_ALL,
  COLLECTION_FILTER_UNASSIGNED,
  createEditDraft,
  createPhotoDraft,
  createPhotoRecordInput,
  createPhotoRecordUpdatePatch,
  filterPhotoRecordsByCollection,
  filterPhotoRecordsBySearchAndLocation,
  createManualLocation,
  LOCATION_SOURCE_FILTER_UNKNOWN,
  normalizePhotoRecordCollectionId,
  normalizeLocationSource,
  isPhotoDraftReadyToSave,
  normalizePhotoLocation,
} from './mapLogic.js'

// Map 순수 로직 회귀 검증
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
      collectionId: null,
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
      collectionId: null,
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

  it('normalizes missing collectionId to null for legacy records', () => {
    expect(normalizePhotoRecordCollectionId({}, [])).toBeNull()
    expect(normalizePhotoRecordCollectionId({ collectionId: '' }, [])).toBeNull()
  })

  it('treats records with missing collections as unassigned', () => {
    expect(
      normalizePhotoRecordCollectionId(
        { collectionId: 'missing-collection' },
        [{ id: 'trip-1' }],
      ),
    ).toBeNull()
  })

  it('filters records by all, unassigned, and a specific collection', () => {
    const collections = [{ id: 'trip-1' }]
    const records = [
      { id: 'photo-1', collectionId: 'trip-1' },
      { id: 'photo-2', collectionId: null },
      { id: 'photo-3', collectionId: 'deleted-collection' },
    ]

    expect(
      filterPhotoRecordsByCollection(records, collections, COLLECTION_FILTER_ALL),
    ).toHaveLength(3)
    expect(
      filterPhotoRecordsByCollection(
        records,
        collections,
        COLLECTION_FILTER_UNASSIGNED,
      ).map((record) => record.id),
    ).toEqual(['photo-2', 'photo-3'])
    expect(
      filterPhotoRecordsByCollection(records, collections, 'trip-1').map(
        (record) => record.id,
      ),
    ).toEqual(['photo-1'])
  })

  it('searches photo records by title, memo, and original file name without case sensitivity', () => {
    const records = [
      {
        id: 'title',
        title: 'Fukuoka Tower',
        memo: '',
        originalFileName: 'a.jpg',
      },
      {
        id: 'memo',
        title: 'Dinner',
        memo: 'Deku tree cafe',
        originalFileName: 'b.jpg',
      },
      {
        id: 'file',
        title: '',
        memo: '',
        originalFileName: 'Canal-City.JPG',
      },
    ]

    expect(
      filterPhotoRecordsBySearchAndLocation(records, {
        searchQuery: ' fukuoka ',
      }).map((record) => record.id),
    ).toEqual(['title'])
    expect(
      filterPhotoRecordsBySearchAndLocation(records, {
        searchQuery: 'DEKU',
      }).map((record) => record.id),
    ).toEqual(['memo'])
    expect(
      filterPhotoRecordsBySearchAndLocation(records, {
        searchQuery: 'canal',
      }).map((record) => record.id),
    ).toEqual(['file'])
  })

  it('does not apply search filtering when query is blank', () => {
    const records = [{ id: 'first' }, { id: 'second' }]

    expect(
      filterPhotoRecordsBySearchAndLocation(records, { searchQuery: '   ' }),
    ).toEqual(records)
  })

  it('filters photo records by location source including unknown fallback', () => {
    const records = [
      { id: 'exif', locationSource: 'exif' },
      { id: 'manual', locationSource: 'manual' },
      { id: 'search', locationSource: 'search' },
      { id: 'legacy', locationSource: 'legacy' },
      { id: 'missing' },
    ]

    expect(
      filterPhotoRecordsBySearchAndLocation(records, {
        locationSourceFilter: 'manual',
      }).map((record) => record.id),
    ).toEqual(['manual'])
    expect(
      filterPhotoRecordsBySearchAndLocation(records, {
        locationSourceFilter: LOCATION_SOURCE_FILTER_UNKNOWN,
      }).map((record) => record.id),
    ).toEqual(['legacy', 'missing'])
  })

  it('applies search and location filters after collection filtering', () => {
    const collections = [{ id: 'trip' }]
    const records = [
      {
        id: 'match',
        collectionId: 'trip',
        locationSource: 'manual',
        title: 'Deku slope',
      },
      {
        id: 'wrong-source',
        collectionId: 'trip',
        locationSource: 'exif',
        title: 'Deku bridge',
      },
      {
        id: 'wrong-collection',
        collectionId: null,
        locationSource: 'manual',
        title: 'Deku market',
      },
    ]
    const collectionFiltered = filterPhotoRecordsByCollection(
      records,
      collections,
      'trip',
    )

    expect(
      filterPhotoRecordsBySearchAndLocation(collectionFiltered, {
        locationSourceFilter: 'manual',
        searchQuery: 'deku',
      }).map((record) => record.id),
    ).toEqual(['match'])
  })

  it('returns an empty array when no record matches search and location filters', () => {
    expect(
      filterPhotoRecordsBySearchAndLocation(
        [{ id: 'photo', locationSource: 'exif', title: 'Beach' }],
        {
          locationSourceFilter: 'manual',
          searchQuery: 'mountain',
        },
      ),
    ).toEqual([])
  })
})
