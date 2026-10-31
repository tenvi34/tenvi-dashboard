import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTripData } from '../travel/travelLogic.js'
import { travelRepository } from '../travel/travelRepository.js'
import { getAllProfileImages, replaceProfileImages } from '../profileImageStore.js'
import { captureBackupExtras, restoreBackupExtras, validateBackupExtras } from './backupExtras.js'
import {
  BACKUP_APP,
  BACKUP_TYPE,
  BACKUP_VERSION,
  validateBackupPayload,
} from '../settingsBackup.js'

vi.mock('../travel/travelRepository.js', () => ({
  travelRepository: { list: vi.fn(), replaceAll: vi.fn() },
}))

vi.mock('../profileImageStore.js', () => ({
  getAllProfileImages: vi.fn(),
  replaceProfileImages: vi.fn(),
}))
beforeEach(() => vi.resetAllMocks())

const payload = (extra) => ({
  app: BACKUP_APP,
  type: BACKUP_TYPE,
  version: BACKUP_VERSION,
  data: { language: 'ko', startModule: 'dashboard', ...extra },
})

describe('Local backup extension compatibility', () => {
  it('keeps older backups from touching additional databases', async () => {
    const backup = validateBackupPayload(payload({}))
    expect(backup).not.toBeNull()
    expect(await captureBackupExtras(backup)).toEqual({})
    await restoreBackupExtras(backup)
    expect(travelRepository.list).not.toHaveBeenCalled()
    expect(travelRepository.replaceAll).not.toHaveBeenCalled()
    expect(getAllProfileImages).not.toHaveBeenCalled()
    expect(replaceProfileImages).not.toHaveBeenCalled()
  })

  it('preserves trip IDs and validates all extended fields', () => {
    const trip = createTripData({ name: 'Tokyo' })
    const extra = {
      travelTrips: [trip],
      profileImages: [{ id: 'avatar', dataUrl: 'data:image/png;base64,YQ==' }],
      timerCompletedSessions: 3,
    }
    expect(validateBackupPayload(payload(extra))).toMatchObject(extra)
    expect(validateBackupExtras(extra).travelTrips[0].trip.id).toBe(trip.trip.id)
  })

  it.each([
    { travelTrips: [{}] },
    { travelTrips: null },
    { profileImages: [{}] },
    { profileImages: [{ id: 'avatar', dataUrl: 'https://invalid/image.png' }] },
    { timerCompletedSessions: -1 },
    { timerCompletedSessions: 1.5 },
  ])('rejects malformed fields before restore: %j', (extra) => {
    expect(validateBackupPayload(payload(extra))).toBeNull()
  })

  it('rejects duplicate trip IDs instead of silently losing records', () => {
    const trip = createTripData({ name: 'Trip' })
    expect(validateBackupPayload(payload({ travelTrips: [trip, trip] }))).toBeNull()
  })

  it('treats explicit empty lists as replacement requests', async () => {
    await restoreBackupExtras({ travelTrips: [], profileImages: [] })
    expect(travelRepository.replaceAll).toHaveBeenCalledExactlyOnceWith([])
    expect(replaceProfileImages).toHaveBeenCalledExactlyOnceWith([])
  })

  it('attempts both database recoveries even if the first one fails', async () => {
    travelRepository.replaceAll.mockRejectedValue(new Error('quota'))
    await expect(restoreBackupExtras({ travelTrips: [], profileImages: [] })).rejects.toThrow(
      'quota',
    )
    expect(replaceProfileImages).toHaveBeenCalledExactlyOnceWith([])
  })
})
