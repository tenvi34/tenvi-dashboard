// 분 단위 설정값을 카운트다운에 사용할 초 단위 값으로 변환합니다.
export const minutesToSeconds = (minutes) => Math.max(1, minutes) * 60

// Timer 표시는 여러 UI 위치에서 재사용되므로 순수 함수로 분리해 포맷 계약을 테스트합니다.
// 카운트다운 초 값을 mm:ss 형식의 표시 문자열로 변환합니다.
export const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// 스톱워치 밀리초 값을 mm:ss.mmm 형식의 표시 문자열로 변환합니다.
export const formatStopwatchTime = (totalMilliseconds) => {
  const minutes = Math.floor(totalMilliseconds / 60000)
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000)
  const milliseconds = totalMilliseconds % 1000

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(milliseconds).padStart(3, '0')}`
}

// 사용자가 입력한 분 값을 허용 범위 안의 숫자로 정규화합니다.
export const normalizeMinutes = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10)

  if (Number.isNaN(parsedValue)) {
    return fallback
  }

  return Math.min(Math.max(parsedValue, 1), 240)
}
