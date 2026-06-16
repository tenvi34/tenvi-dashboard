import { describe, expect, it } from 'vitest'
import {
  formatStopwatchTime,
  formatTime,
  minutesToSeconds,
  normalizeMinutes,
} from './timerLogic.js'

// Timer 표시 포맷 회귀 방지
describe('timerLogic', () => {
  it('formats countdown seconds as mm:ss', () => {
    expect(formatTime(0)).toBe('00:00')
    expect(formatTime(65)).toBe('01:05')
    expect(formatTime(1500)).toBe('25:00')
  })

  it('formats stopwatch milliseconds as mm:ss.mmm', () => {
    expect(formatStopwatchTime(0)).toBe('00:00.000')
    expect(formatStopwatchTime(62345)).toBe('01:02.345')
  })

  it('normalizes timer minutes to the allowed range', () => {
    expect(minutesToSeconds(25)).toBe(1500)
    expect(minutesToSeconds(0)).toBe(60)
    expect(normalizeMinutes('abc', 25)).toBe(25)
    expect(normalizeMinutes('0', 25)).toBe(1)
    expect(normalizeMinutes('999', 25)).toBe(240)
  })
})
