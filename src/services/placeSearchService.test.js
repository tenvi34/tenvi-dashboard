import { describe, expect, it } from 'vitest'
import {
  clearPlaceSearchCache,
  createAddressSummary,
  getCountryCodeForSearchScope,
  normalizePlaceSearchResult,
  searchPlaces,
} from './placeSearchService.js'

describe('placeSearchService', () => {
  it('normalizes a Nominatim result into TENVI place data', () => {
    expect(
      normalizePlaceSearchResult({
        display_name: 'Hakata Station, Fukuoka, Japan',
        category: 'railway',
        type: 'station',
        address: {
          city: 'Fukuoka',
          state: 'Fukuoka Prefecture',
          country: 'Japan',
        },
        lat: '33.5903',
        lon: '130.4208',
        name: 'Hakata Station',
        place_id: 123,
      }),
    ).toEqual({
      displayName: 'Hakata Station, Fukuoka, Japan',
      addressSummary: 'Fukuoka, Fukuoka Prefecture, Japan',
      category: 'railway',
      extratags: {},
      id: '123',
      latitude: 33.5903,
      longitude: 130.4208,
      name: 'Hakata Station',
      namedetails: {},
      provider: 'nominatim',
      type: 'station',
    })
  })

  it('drops results without usable coordinates or display names', () => {
    expect(normalizePlaceSearchResult({ display_name: 'No coordinates' })).toBeNull()
    expect(normalizePlaceSearchResult({ lat: '33', lon: '130' })).toBeNull()
  })

  it('creates a compact address summary from Nominatim address fields', () => {
    expect(
      createAddressSummary({
        country: 'Japan',
        state: 'Fukuoka Prefecture',
        suburb: 'Tenjin',
        town: 'Fukuoka',
      }),
    ).toBe('Tenjin, Fukuoka, Fukuoka Prefecture, Japan')
  })

  it('maps search scope values to Nominatim country codes', () => {
    expect(getCountryCodeForSearchScope('all')).toBe('')
    expect(getCountryCodeForSearchScope('japan')).toBe('jp')
    expect(getCountryCodeForSearchScope('korea')).toBe('kr')
    expect(getCountryCodeForSearchScope('unknown')).toBe('')
  })

  it('adds free Nominatim search parameters and selected country scope', async () => {
    clearPlaceSearchCache()
    let requestedUrl = ''
    const fetcher = async (url) => {
      requestedUrl = url

      return {
        json: async () => [],
        ok: true,
      }
    }

    await searchPlaces('福岡三越', {
      fetcher,
      language: 'ko',
      scope: 'japan',
    })

    const searchParams = new URL(requestedUrl).searchParams

    expect(searchParams.get('addressdetails')).toBe('1')
    expect(searchParams.get('extratags')).toBe('1')
    expect(searchParams.get('namedetails')).toBe('1')
    expect(searchParams.get('countrycodes')).toBe('jp')
    expect(searchParams.get('limit')).toBe('5')
  })
})
