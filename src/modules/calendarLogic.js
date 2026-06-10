// YYYY-MM-DD 변환
export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 날짜 key 분해
export const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map((value) => Number(value))

  return { day, month: month - 1, year }
}

const isDateKey = (dateKey) => {
  if (typeof dateKey !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false
  }

  const { day, month, year } = parseDateKey(dateKey)

  return getDateKey(new Date(year, month, day)) === dateKey
}

// 월 일수 계산
export const getDaysInMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate()

// 월 이동 날짜 보정
export const getClampedDateKey = (year, month, day) => {
  const clampedDay = Math.min(Math.max(day, 1), getDaysInMonth(year, month))

  return getDateKey(new Date(year, month, clampedDay))
}

// 월 offset 계산
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

// 보름달 근사 판단
export const isFullMoonDate = (dateKey) => {
  const { day, month, year } = parseDateKey(dateKey)
  const targetDateUtcNoon = Date.UTC(year, month, day, 12)
  const daysSinceReference =
    (targetDateUtcNoon - FULL_MOON_REFERENCE_UTC) / DAY_IN_MILLISECONDS
  const cyclePosition =
    ((daysSinceReference % SYNODIC_MONTH_DAYS) + SYNODIC_MONTH_DAYS) %
    SYNODIC_MONTH_DAYS

  // 평균 주기 근사값
  return (
    cyclePosition <= 0.5 || cyclePosition >= SYNODIC_MONTH_DAYS - 0.5
  )
}

// 월간 그리드 생성
export const getMonthCalendarCells = (year, month) => {
  const firstWeekday = new Date(year, month, 1).getDay()
  const dayCount = getDaysInMonth(year, month)
  const cells = []

  // 7열 빈 칸 채움
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

// 시작일/종료일 검증
export const isValidCalendarDateRange = (startDate, endDate = startDate) =>
  isDateKey(startDate) && isDateKey(endDate) && endDate >= startDate

export const getCalendarEventStartDate = (event) => event.startDate || event.date

export const getCalendarEventEndDate = (event) =>
  event.endDate || event.startDate || event.date

// 기존 일정 호환 처리
export const normalizeCalendarEvent = (event) => {
  if (
    event === null ||
    typeof event !== 'object' ||
    Array.isArray(event) ||
    typeof event.id !== 'string' ||
    !isDateKey(event.date) ||
    typeof event.title !== 'string' ||
    typeof event.memo !== 'string' ||
    typeof event.createdAt !== 'string'
  ) {
    return null
  }

  const startDate = getCalendarEventStartDate(event)
  const endDate = getCalendarEventEndDate(event)

  if (!isValidCalendarDateRange(startDate, endDate)) {
    return null
  }

  return {
    ...event,
    startDate,
    endDate,
  }
}

const isCalendarEvent = (event) => normalizeCalendarEvent(event) !== null

// Calendar 이벤트 복원
export const readCalendarEvents = (storageValue) => {
  if (!storageValue) {
    return []
  }

  try {
    const parsedValue = JSON.parse(storageValue)

    // 렌더 전 유효성 검증
    return Array.isArray(parsedValue) ? parsedValue.filter(isCalendarEvent) : []
  } catch {
    return []
  }
}

export const isRangedCalendarEvent = (event) =>
  getCalendarEventEndDate(event) !== getCalendarEventStartDate(event)

export const RANGE_POSITION = {
  end: 'end',
  middle: 'middle',
  single: 'single',
  start: 'start',
}

export const PERIOD_CLASS_BY_POSITION = {
  [RANGE_POSITION.end]: 'period-end',
  [RANGE_POSITION.middle]: 'period-middle',
  [RANGE_POSITION.start]: 'period-start',
}

export const formatCalendarDate = (dateKey) => dateKey.replaceAll('-', '.')

export const getCalendarEventDateLabel = (event) =>
  isRangedCalendarEvent(event)
    ? `${formatCalendarDate(getCalendarEventStartDate(event))} ~ ${formatCalendarDate(
        getCalendarEventEndDate(event),
      )}`
    : formatCalendarDate(getCalendarEventStartDate(event))

// 기간 포함 판단
export const eventOccursOnDate = (event, dateKey) =>
  getCalendarEventStartDate(event) <= dateKey &&
  getCalendarEventEndDate(event) >= dateKey

export const getDateKeysBetween = (startDateKey, endDateKey = startDateKey) => {
  if (!isValidCalendarDateRange(startDateKey, endDateKey)) {
    return []
  }

  const { day, month, year } = parseDateKey(startDateKey)
  const currentDate = new Date(year, month, day)
  const dateKeys = []

  while (getDateKey(currentDate) <= endDateKey) {
    dateKeys.push(getDateKey(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dateKeys
}

export const getCalendarEventDateKeys = (event) =>
  getDateKeysBetween(getCalendarEventStartDate(event), getCalendarEventEndDate(event))

export const getEventsForDate = (events, dateKey) =>
  events.filter((event) => eventOccursOnDate(event, dateKey))

// 기간 일정 표시 class 계산
export const getCalendarEventRangePosition = (event, dateKey) => {
  if (!eventOccursOnDate(event, dateKey)) {
    return null
  }

  const startDate = getCalendarEventStartDate(event)
  const endDate = getCalendarEventEndDate(event)

  if (startDate === endDate) {
    return RANGE_POSITION.single
  }

  if (dateKey === startDate) {
    return RANGE_POSITION.start
  }

  if (dateKey === endDate) {
    return RANGE_POSITION.end
  }

  return RANGE_POSITION.middle
}

export const getCalendarDayRangeMeta = (events, dateKey) => {
  const positions = events
    .map((event) => getCalendarEventRangePosition(event, dateKey))
    .filter(Boolean)
  const rangePositions = positions.filter(
    (position) => position !== RANGE_POSITION.single,
  )
  const periodPosition = [
    RANGE_POSITION.start,
    RANGE_POSITION.end,
    RANGE_POSITION.middle,
  ].find((position) => rangePositions.includes(position))

  return {
    classNames: [
      rangePositions.length > 0 ? 'has-range-events' : '',
      periodPosition ? PERIOD_CLASS_BY_POSITION[periodPosition] : '',
    ].filter(Boolean),
    hasRangeEvents: rangePositions.length > 0,
    hasSingleDayEvents: positions.includes(RANGE_POSITION.single),
    periodPosition: periodPosition ?? null,
    rangeEventCount: rangePositions.length,
  }
}

// 오늘 이벤트 반환
export const getTodayEvents = (events, today = new Date()) =>
  getEventsForDate(events, getDateKey(today))

// 현재 월 이벤트 반환
export const getMonthEvents = (events, currentDate = new Date()) => {
  const { month, year } = parseDateKey(getDateKey(currentDate))
  const firstDateKey = getDateKey(new Date(year, month, 1))
  const lastDateKey = getDateKey(new Date(year, month, getDaysInMonth(year, month)))

  return events.filter(
    (event) =>
      getCalendarEventStartDate(event) <= lastDateKey &&
      getCalendarEventEndDate(event) >= firstDateKey,
  )
}

// 이벤트 날짜 수 계산
export const getScheduledDateCount = (events) =>
  new Set(events.flatMap(getCalendarEventDateKeys)).size

// 다음 Calendar 이벤트
export const getNextEvent = (events, currentDate = new Date()) => {
  const todayKey = getDateKey(currentDate)

  return [...events]
    .filter((event) => getCalendarEventEndDate(event) > todayKey)
    .sort((firstEvent, secondEvent) => {
      const firstStartDate = getCalendarEventStartDate(firstEvent)
      const secondStartDate = getCalendarEventStartDate(secondEvent)
      const firstNextDate = firstStartDate > todayKey ? firstStartDate : todayKey
      const secondNextDate =
        secondStartDate > todayKey ? secondStartDate : todayKey

      if (firstNextDate !== secondNextDate) {
        return firstNextDate.localeCompare(secondNextDate)
      }

      return firstEvent.createdAt.localeCompare(secondEvent.createdAt)
    })[0]
}

// 달력 날짜별 일정 표시 계산
export const countEventsByDate = (events) =>
  events.reduce((eventCounts, event) => {
    getCalendarEventDateKeys(event).forEach((dateKey) => {
      eventCounts[dateKey] = (eventCounts[dateKey] ?? 0) + 1
    })

    return eventCounts
  }, {})

// Calendar 이벤트 생성
export const createCalendarEvent = ({
  date,
  endDate = date,
  memo,
  startDate = date,
  title,
}) => {
  const normalizedTitle = title.trim()
  const normalizedMemo = memo.trim()
  const normalizedStartDate = startDate || date
  const normalizedEndDate = endDate || normalizedStartDate

  if (
    !isValidCalendarDateRange(normalizedStartDate, normalizedEndDate) ||
    !normalizedTitle
  ) {
    return null
  }

  const createdAt = new Date().toISOString()

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: normalizedStartDate,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    title: normalizedTitle,
    memo: normalizedMemo,
    createdAt,
    updatedAt: createdAt,
  }
}

// Calendar 이벤트 제외
export const removeCalendarEvent = (events, eventId) =>
  events.filter((event) => event.id !== eventId)
