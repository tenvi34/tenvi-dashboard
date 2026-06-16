import { describe, expect, it } from 'vitest'
import { createMapArchiveSummary } from './photoArchiveSummaryService.js'

// Dashboard Map 요약용 record fixture
const createRecord = (overrides = {}) => ({
  id: `record-${Math.random()}`,
  title: 'Photo record',
  createdAt: '2026-01-01T00:00:00.000Z',
  locationSource: 'manual',
  collectionId: null,
  ...overrides,
})

// Dashboard Map 요약용 collection fixture
const createCollection = (overrides = {}) => ({
  id: `collection-${Math.random()}`,
  name: 'Collection',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('createMapArchiveSummary', () => {
  it('returns a safe empty summary when records and collections are empty', () => {
    expect(createMapArchiveSummary([], [])).toEqual({
      totalPhotoRecords: 0,
      totalCollections: 0,
      recentPhotoRecords: [],
      representativeCollection: null,
      locationSourceCounts: {
        exif: 0,
        manual: 0,
        search: 0,
        unknown: 0,
      },
    })
  })

  it('calculates photo and collection totals', () => {
    const summary = createMapArchiveSummary(
      [createRecord(), createRecord()],
      [createCollection(), createCollection(), createCollection()],
    )

    expect(summary.totalPhotoRecords).toBe(2)
    expect(summary.totalCollections).toBe(3)
  })

  it('sorts the three most recent photo records by createdAt', () => {
    const summary = createMapArchiveSummary(
      [
        createRecord({ id: 'old', title: 'Old', createdAt: '2026-01-01T00:00:00.000Z' }),
        createRecord({ id: 'newest', title: 'Newest', createdAt: '2026-01-04T00:00:00.000Z' }),
        createRecord({ id: 'middle', title: 'Middle', createdAt: '2026-01-03T00:00:00.000Z' }),
        createRecord({ id: 'newer', title: 'Newer', createdAt: '2026-01-02T00:00:00.000Z' }),
      ],
      [],
    )

    expect(summary.recentPhotoRecords.map((record) => record.id)).toEqual([
      'newest',
      'middle',
      'newer',
    ])
  })

  it('counts records by locationSource and sends unknown values to unknown', () => {
    const summary = createMapArchiveSummary(
      [
        createRecord({ locationSource: 'exif' }),
        createRecord({ locationSource: 'manual' }),
        createRecord({ locationSource: 'manual' }),
        createRecord({ locationSource: 'search' }),
        createRecord({ locationSource: 'legacy' }),
        createRecord({ locationSource: undefined }),
      ],
      [],
    )

    expect(summary.locationSourceCounts).toEqual({
      exif: 1,
      manual: 2,
      search: 1,
      unknown: 2,
    })
  })

  it('selects the collection with the most linked photos as representative', () => {
    const collections = [
      createCollection({ id: 'solo', name: 'Solo' }),
      createCollection({ id: 'main', name: 'Main' }),
    ]
    const summary = createMapArchiveSummary(
      [
        createRecord({ collectionId: 'solo' }),
        createRecord({ collectionId: 'main' }),
        createRecord({ collectionId: 'main' }),
      ],
      collections,
    )

    expect(summary.representativeCollection).toMatchObject({
      id: 'main',
      name: 'Main',
      photoCount: 2,
    })
  })

  it('uses updatedAt as a tie breaker for representative collection', () => {
    const collections = [
      createCollection({
        id: 'older',
        name: 'Older',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      createCollection({
        id: 'newer',
        name: 'Newer',
        updatedAt: '2026-01-02T00:00:00.000Z',
      }),
    ]
    const summary = createMapArchiveSummary(
      [
        createRecord({ collectionId: 'older' }),
        createRecord({ collectionId: 'newer' }),
      ],
      collections,
    )

    expect(summary.representativeCollection).toMatchObject({
      id: 'newer',
      name: 'Newer',
      photoCount: 1,
    })
  })

  it('ignores missing collectionId references for representative collection', () => {
    const summary = createMapArchiveSummary(
      [
        createRecord({ collectionId: 'missing' }),
        createRecord({ collectionId: null }),
      ],
      [createCollection({ id: 'known', name: 'Known' })],
    )

    expect(summary.representativeCollection).toBeNull()
    expect(summary.recentPhotoRecords[0].collectionName).toBe('')
  })
})
