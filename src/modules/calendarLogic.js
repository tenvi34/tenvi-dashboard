export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map((value) => Number(value))

  return { day, month: month - 1, year }
}

export const getDaysInMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate()

export const getClampedDateKey = (year, month, day) => {
  const clampedDay = Math.min(Math.max(day, 1), getDaysInMonth(year, month))

  return getDateKey(new Date(year, month, clampedDay))
}

export const getAdjacentMonth = (year, month, offset) => {
  const targetDate = new Date(year, month + offset, 1)

  return {
    month: targetDate.getMonth(),
    year: targetDate.getFullYear(),
  }
}

const SYNODIC_MONTH_DAYS = 29.530588853
const FULL_MOON_REFERENCE_UTC = Date.UTC(2000, 0, 21, 4, 40)
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export const isFullMoonDate = (dateKey) => {
  const { day, month, year } = parseDateKey(dateKey)
  const targetDateUtcNoon = Date.UTC(year, month, day, 12)
  const daysSinceReference =
    (targetDateUtcNoon - FULL_MOON_REFERENCE_UTC) / DAY_IN_MILLISECONDS
  const cyclePosition =
    ((daysSinceReference % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) %
    SYNODIC_MONTH_DAYS

  // 실제 천문 시각은 지역과 시간대에 따라 달라지므로, 날짜 셀 표시는 평균 삭망월 기반 근사값으로 처리합니다.
  return (
    cyclePosition <= 0.5 || cyclePosition >= SYNODIC_MONTH_DAYS - 0.5
  )
}

export const getMonthCalendarCells = (year, month) => {
  const firstWeekday = new Date(year, month, 1).getDay()
  const dayCount = getDaysInMonth(year, month)
  const cells = []

  // 월간 달력은 7열 고정이므로 시작 요일 전후 빈 칸도 명시적으로 채웁니다.
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= dayCount; day += 1) {
    cells.push({
      dateKey: getDateKey(new Date(year, month, day)),
      day,
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return cells
}

const isCalendarEvent = (event) =>
  event !== null &&
  typeof event === 'object' &&
  !Array.isArray(event) &&
  typeof event.id === 'string' &&
  typeof event.date === 'string' &&
  typeof event.title === 'string' &&
  typeof event.memo === 'string' &&
  typeof event.createdAt === 'string'

export const readCalendarEvents = (storageValue) => {
  if (!storageValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(storageValue)

    // Calendar 데이터는 새 key에만 저장하며, 손상된 항목은 화면 렌더링 전에 제외합니다.
    return Array.isArray(parsedValue) ? parsedValue.filter(isCalendarEvent) : []
  } catch {
    return []
  }
}

export const getEventsForDate = (events, dateKey) =>
  events.filter((event) => event.date === dateKey)

export const getTodayEvents = (events, today = new Date()) =>
  getEventsForDate(events, getDateKey(today))

export const countEventsByDate = (events) =>
  events.reduce((eventCounts, event) => {
    eventCounts[event.date] = (eventCounts[event.date] ?? 0) + 1

    return eventCounts
  }, {})

export const createCalendarEvent = ({ date, memo, title }) => {
  const normalizedTitle = title.trim()
  const normalizedMemo = memo.trim()

  if (!date || !normalizedTitle) {
    return null
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    title: normalizedTitle,
    memo: normalizedMemo,
    createdAt: new Date().toISOString(),
  }
}

export const removeCalendarEvent = (events, eventId) =>
  events.filter((event) => event.id !== eventId)
