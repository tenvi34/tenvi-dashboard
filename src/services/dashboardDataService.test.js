import { describe, expect, it, vi } from 'vitest'
import { loadDashboardData } from './dashboardDataService.js'
import { getMapArchiveSummary } from './photoArchiveSummaryService.js'

const setup = () => ({
  localBoard: { fetchPosts: vi.fn().mockResolvedValue([{ id: 'local' }]) },
  remoteBoard: { fetchPosts: vi.fn().mockResolvedValue([{ id: 'remote' }]) },
  fetchCalendar: vi.fn().mockResolvedValue([{ id: 'remote-event' }]),
  storage: { getItem: vi.fn().mockReturnValue('[]') },
})

describe('Dashboard storage selection', () => {
  it('reads remote sources without consulting local snapshots', async () => {
    const deps = setup()
    const result = await loadDashboardData({ ...deps, boardMode: 'remote', calendarMode: 'remote' })
    expect(result).toEqual({
      boardPosts: [{ id: 'remote' }],
      calendarEvents: [{ id: 'remote-event' }],
      failedModules: [],
    })
    expect(deps.localBoard.fetchPosts).not.toHaveBeenCalled()
    expect(deps.storage.getItem).not.toHaveBeenCalled()
  })

  it('keeps local mode offline', async () => {
    const deps = setup()
    const result = await loadDashboardData({ ...deps, boardMode: 'local', calendarMode: 'local' })
    expect(result.boardPosts).toEqual([{ id: 'local' }])
    expect(deps.remoteBoard.fetchPosts).not.toHaveBeenCalled()
    expect(deps.fetchCalendar).not.toHaveBeenCalled()
  })

  it('reports remote failure instead of displaying stale local data', async () => {
    const deps = setup()
    deps.remoteBoard.fetchPosts.mockRejectedValue(new Error('offline'))
    const result = await loadDashboardData({ ...deps, boardMode: 'remote', calendarMode: 'remote' })
    expect(result.failedModules).toEqual(['board'])
    expect(result.boardPosts).toEqual([])
    expect(result.calendarEvents).toHaveLength(1)
    expect(deps.localBoard.fetchPosts).not.toHaveBeenCalled()
  })

  it('uses the selected Map repository for counts and recent records', async () => {
    const localRepository = { fetchRecords: vi.fn(), fetchCollections: vi.fn() }
    const remoteRepository = {
      fetchRecords: vi.fn().mockResolvedValue([{ id: 'photo', title: 'Remote photo' }]),
      fetchCollections: vi.fn().mockResolvedValue([]),
    }
    const summary = await getMapArchiveSummary({
      mode: 'remote',
      localRepository,
      remoteRepository,
    })
    expect(summary.totalPhotoRecords).toBe(1)
    expect(summary.recentPhotoRecords[0].title).toBe('Remote photo')
    expect(localRepository.fetchRecords).not.toHaveBeenCalled()
  })
})
