import { describe, expect, it } from 'vitest'
import { createManualLocation, normalizePhotoLocation } from './mapLogic.js'

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
      source: 'exif',
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
      source: 'manual',
      status: 'located',
      takenAt: '2026:05:29 10:20:30',
    })
  })
})
