import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { fetchCalendarEvents } from '../api/calendarApi.js'
import { readCalendarEvents } from '../modules/calendarLogic.js'
import { readCalendarStorageMode } from '../modules/calendarStorageMode.js'
import { readBoardStorageMode } from '../modules/board/boardStorageMode.js'
import { localBoardPostRepository, remoteBoardPostRepository } from '../modules/board/repositories/index.js'

// 모듈과 같은 저장소를 조회하며 REMOTE 실패를 오래된 LOCAL 값으로 숨기지 않음
export const loadDashboardData = async ({
  boardMode = readBoardStorageMode(), calendarMode = readCalendarStorageMode(),
  localBoard = localBoardPostRepository, remoteBoard = remoteBoardPostRepository,
  fetchCalendar = fetchCalendarEvents, storage = globalThis.localStorage,
} = {}) => {
  const results = await Promise.allSettled([
    (boardMode === 'remote' ? remoteBoard : localBoard).fetchPosts(),
    calendarMode === 'remote' ? fetchCalendar() : Promise.resolve(readCalendarEvents(storage.getItem(STORAGE_KEYS.calendarEvents))),
  ])
  return {
    boardPosts: results[0].status === 'fulfilled' ? results[0].value : [],
    calendarEvents: results[1].status === 'fulfilled' ? results[1].value : [],
    failedModules: results.flatMap((result, index) => result.status === 'rejected' ? [index === 0 ? 'board' : 'calendar'] : []),
  }
}
