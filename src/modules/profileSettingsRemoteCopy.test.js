import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadRemoteAppSettings } from './profileSettingsRemoteCopy.js'
afterEach(() => vi.useRealTimers())
describe('Startup remote settings', () => {
  it('returns the remote start module before startup is released', async () => {
    const settings = await loadRemoteAppSettings({ fetchSettings: async () => [{ key: 'startModule', valueJson: '"board"' }] })
    expect(settings.startModule).toBe('board')
  })
  it('rejects an unavailable server so startup can fall back to local settings', async () => {
    await expect(loadRemoteAppSettings({ fetchSettings: async () => { throw new Error('offline') } })).rejects.toThrow('offline')
  })
  it('does not leave startup waiting forever for a stalled request', async () => {
    vi.useFakeTimers()
    const pending = loadRemoteAppSettings({ fetchSettings: () => new Promise(() => {}) })
    const rejected = expect(pending).rejects.toThrow('Settings timeout')
    await vi.advanceTimersByTimeAsync(8000)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
  })
})
