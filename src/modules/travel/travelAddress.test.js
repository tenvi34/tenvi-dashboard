import { describe, expect, it } from 'vitest'
import { parseTravelAddress } from './travelAddress.js'

describe('copied travel address parsing', () => {
  it('fills the user-provided address and city without postal code or country in region', () => {
    const address = '5 Chome-52-15 Nakano, Nakano City, Tokyo 164-0001 일본'
    expect(parseTravelAddress(address)).toEqual({ address, region: 'Nakano City, Tokyo' })
  })
  it('handles line breaks, Japanese commas and a separate country segment', () => {
    expect(parseTravelAddress('1-2 Street， Shinjuku City，\n Tokyo 160-0022， Japan')?.region).toBe('Shinjuku City, Tokyo')
  })
  it('extracts local administrative names for supported unseparated formats', () => {
    expect(parseTravelAddress('日本、〒164-0001 東京都中野区中野5丁目52-15')?.region).toBe('東京都中野区')
    expect(parseTravelAddress('〒164-0001 東京都中野区中野5丁目52-15')?.region).toBe('東京都中野区')
    expect(parseTravelAddress('서울특별시 마포구 양화로 10')?.region).toBe('서울특별시 마포구')
  })
  it('keeps an unfamiliar address without inventing a region', () => {
    expect(parseTravelAddress('Some building 12')).toEqual({ address: 'Some building 12', region: '' })
  })
  it.each(['', '  ', 'https://maps.app.goo.gl/example', 'x'.repeat(1001)])('rejects empty, link or oversized input', (input) => {
    expect(parseTravelAddress(input)).toBeNull()
  })
})
