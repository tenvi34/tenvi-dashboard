import {
  createRemoteCalendarEvent,
  fetchCalendarEvents,
} from '../api/calendarApi.js'
import { STORAGE_KEYS } from '../constants/storageKeys.js'
import { readCalendarEvents } from './calendarLogic.js'

const createCopyResult = (total) => ({
  total,
  copied: 0,
  skipped: 0,
  failed: 0,
})

const readLocalCalendarEvents = (storage = globalThis.localStorage) =>
  readCalendarEvents(storage?.getItem(STORAGE_KEYS.calendarEvents))

const toRemotePayload = (calendarEvent) => ({
  id: calendarEvent.id,
  date: calendarEvent.date ?? calendarEvent.startDate,
  title: calendarEvent.title,
  memo: calendarEvent.memo,
  startDate: calendarEvent.startDate ?? calendarEvent.date,
  endDate: calendarEvent.endDate ?? calendarEvent.startDate ?? calendarEvent.date,
  color: calendarEvent.color ?? '',
  createdAt: calendarEvent.createdAt,
  updatedAt: calendarEvent.updatedAt,
  deletedAt: calendarEvent.deletedAt,
})

// LOCAL Calendar 원본 보존 후 REMOTE에 없는 일정만 복사
export const copyLocalCalendarEventsToRemote = async ({
  createEvent = createRemoteCalendarEvent,
  fetchEvents = fetchCalendarEvents,
  storage = globalThis.localStorage,
} = {}) => {
  const localEvents = readLocalCalendarEvents(storage)
  const result = createCopyResult(localEvents.length)

  if (localEvents.length === 0) {
    return result
  }

  const remoteEvents = await fetchEvents()
  const remoteIds = new Set(remoteEvents.map((event) => String(event.id)))

  for (const calendarEvent of localEvents) {
    if (remoteIds.has(String(calendarEvent.id))) {
      result.skipped += 1
      continue
    }

    try {
      const createdEvent = await createEvent(toRemotePayload(calendarEvent))
      remoteIds.add(String(createdEvent?.id ?? calendarEvent.id))
      result.copied += 1
    } catch {
      result.failed += 1
    }
  }

  return result
}
