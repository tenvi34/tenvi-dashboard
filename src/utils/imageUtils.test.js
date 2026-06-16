import { describe, expect, it } from 'vitest'
import { calculatePreviewSize } from './imageUtils.js'

// 미리보기 리사이즈 규칙 검증
describe('imageUtils', () => {
  it('keeps small images at their original size', () => {
    expect(calculatePreviewSize(800, 600, 1200)).toEqual({
      height: 600,
      width: 800,
    })
  })

  it('scales wide images down by the longest side', () => {
    expect(calculatePreviewSize(4000, 2000, 1000)).toEqual({
      height: 500,
      width: 1000,
    })
  })

  it('scales tall images down by the longest side', () => {
    expect(calculatePreviewSize(2000, 4000, 1000)).toEqual({
      height: 1000,
      width: 500,
    })
  })
})
