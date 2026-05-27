// Date 객체를 Calendar/Tasks가 공유하는 YYYY-MM-DD 키로 변환합니다.
export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// YYYY-MM-DD 키를 Date 생성에 맞는 year/month/day 값으로 분해합니다.
export const parseDateKey = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map((value) => Number(value))

  return { day, month: month - 1, year }
}

// 지정한 연월에 포함된 총 일수를 계산합니다.
export const getDaysInMonth = (year, month) =>
  new Date(year, month + 1, 0).getDate()

// 월 이동 시 존재하지 않는 날짜를 해당 월의 마지막 날로 보정한 날짜 키를 만듭니다.
export const getClampedDateKey = (year, month, day) => {
  const clampedDay = Math.min(Math.max(day, 1), getDaysInMonth(year, month))

  return getDateKey(new Date(year, month, clampedDay))
}

// 현재 연월에서 offset만큼 이동한 연월 값을 계산합니다.
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

// 지정한 날짜가 평균 삭망월 기준 보름달 근사일인지 판단합니다.
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

// 월간 달력 그리드에 사용할 빈 칸과 날짜 칸 배열을 생성합니다.
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

// localStorage에서 복원한 값이 Calendar 이벤트 형식인지 검증합니다.
const isCalendarEvent = (event) =>
  event !== null &&
  typeof event === 'object' &&
  !Array.isArray(event) &&
  typeof event.id === 'string' &&
  typeof event.date === 'string' &&
  typeof event.title === 'string' &&
  typeof event.memo === 'string' &&
  typeof event.createdAt === 'string'

// 저장된 JSON 문자열에서 유효한 Calendar 이벤트 목록만 복원합니다.
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

// 특정 날짜 키에 등록된 Calendar 이벤트만 필터링합니다.
export const getEventsForDate = (events, dateKey) =>
  events.filter((event) => event.date === dateKey)

// 오늘 날짜에 해당하는 Calendar 이벤트를 반환합니다.
export const getTodayEvents = (events, today = new Date()) =>
  getEventsForDate(events, getDateKey(today))

// 현재 날짜가 속한 월의 Calendar 이벤트만 반환합니다.
export const getMonthEvents = (events, currentDate = new Date()) => {
  const { month, year } = parseDateKey(getDateKey(currentDate))

  return events.filter((event) => {
    const eventDate = parseDateKey(event.date)

    return eventDate.year === year && eventDate.month === month
  })
}

// 이벤트가 하나 이상 있는 날짜의 개수를 계산합니다.
export const getScheduledDateCount = (events) =>
  new Set(events.map((event) => event.date)).size

// 오늘 이후 가장 가까운 Calendar 이벤트를 찾습니다.
export const getNextEvent = (events, currentDate = new Date()) => {
  const todayKey = getDateKey(currentDate)

  return [...events]
    .filter((event) => event.date > todayKey)
    .sort((firstEvent, secondEvent) => {
      if (firstEvent.date !== secondEvent.date) {
        return firstEvent.date.localeCompare(secondEvent.date)
      }

      return firstEvent.createdAt.localeCompare(secondEvent.createdAt)
    })[0]
}

// 날짜별 Calendar 이벤트 개수를 집계합니다.
export const countEventsByDate = (events) =>
  events.reduce((eventCounts, event) => {
    eventCounts[event.date] = (eventCounts[event.date] ?? 0) + 1

    return eventCounts
  }, {})

// 입력값을 정리해 새 Calendar 이벤트 객체를 생성합니다.
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

// 지정한 이벤트 id를 제외한 Calendar 이벤트 목록을 반환합니다.
export const removeCalendarEvent = (events, eventId) =>
  events.filter((event) => event.id !== eventId)
