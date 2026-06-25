import { describe, expect, it, vi } from 'vitest'
import { fetchTestEcho, getTestEchoUrl } from './testEchoApi.js'

describe('fetchTestEcho', () => {
  it('posts a message to the echo endpoint and returns JSON', async () => {
    const echoPayload = {
      message: 'TENVI ping',
      serverTime: '2026-06-25T00:00:00Z',
    }
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(echoPayload),
    })

    await expect(
      fetchTestEcho({
        message: 'TENVI ping',
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).resolves.toBe(echoPayload)
    expect(fetcher).toHaveBeenCalledWith(
      getTestEchoUrl('http://localhost:5032'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'TENVI ping' }),
      },
    )
  })

  it('throws the backend error message for a bad request', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({ message: 'Message is required.' }),
    })

    await expect(
      fetchTestEcho({
        message: '',
        baseUrl: 'http://localhost:5032',
        fetcher,
      }),
    ).rejects.toThrow('Message is required.')
  })
})
