import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_API_BASE_URL,
  getApiBaseUrl,
  joinApiPath,
} from './client.js'
import { fetchBackendHealth, getBackendHealthUrl } from './healthApi.js'

describe('API client', () => {
  it('falls back to the local backend URL when VITE_API_BASE_URL is missing', () => {
    expect(getApiBaseUrl({})).toBe(DEFAULT_API_BASE_URL)
  })

  it('uses VITE_API_BASE_URL when it is configured', () => {
    expect(
      getApiBaseUrl({ VITE_API_BASE_URL: 'http://localhost:6000/' }),
    ).toBe('http://localhost:6000/')
  })

  it('joins API paths without duplicate slashes', () => {
    expect(joinApiPath('http://localhost:5032/', '/api/health')).toBe(
      'http://localhost:5032/api/health',
    )
  })
})

describe('fetchBackendHealth', () => {
  it('returns JSON for a successful health response', async () => {
    const healthPayload = {
      ok: true,
      service: 'TENVI API',
      message: 'Backend is running',
    }
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(healthPayload),
    })

    await expect(
      fetchBackendHealth({ baseUrl: 'http://localhost:5032', fetcher }),
    ).resolves.toBe(healthPayload)
    expect(fetcher).toHaveBeenCalledWith(
      getBackendHealthUrl('http://localhost:5032'),
    )
  })

  it('throws when the health response is not ok', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(
      fetchBackendHealth({ baseUrl: 'http://localhost:5032', fetcher }),
    ).rejects.toThrow('Health API request failed with 500')
  })

  it('keeps network errors throwable for UI handling', async () => {
    const networkError = new TypeError('Failed to fetch')
    const fetcher = vi.fn().mockRejectedValue(networkError)

    await expect(
      fetchBackendHealth({ baseUrl: 'http://localhost:5032', fetcher }),
    ).rejects.toBe(networkError)
  })
})
