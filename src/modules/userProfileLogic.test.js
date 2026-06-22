import { describe, expect, it } from 'vitest'
import {
  createDefaultUserProfile,
  normalizeUserProfile,
  parseUserProfile,
  resetUserProfile,
  updateUserProfile,
} from './userProfileLogic.js'

describe('userProfileLogic', () => {
  it('creates a default local user profile', () => {
    expect(createDefaultUserProfile('2026-06-22T00:00:00.000Z')).toEqual({
      id: 'local-user',
      nickname: 'TENVI',
      bio: '',
      avatarImageId: '',
      createdAt: '2026-06-22T00:00:00.000Z',
      updatedAt: '2026-06-22T00:00:00.000Z',
    })
  })

  it('falls back safely when stored JSON is damaged', () => {
    expect(parseUserProfile('broken-json', '2026-06-22T00:00:00.000Z')).toEqual(
      createDefaultUserProfile('2026-06-22T00:00:00.000Z'),
    )
    expect(parseUserProfile('[]', '2026-06-22T00:00:00.000Z')).toEqual(
      createDefaultUserProfile('2026-06-22T00:00:00.000Z'),
    )
  })

  it('trims nickname and uses TENVI when nickname is empty', () => {
    expect(normalizeUserProfile({ nickname: '  Local Pilot  ' }).nickname).toBe(
      'Local Pilot',
    )
    expect(normalizeUserProfile({ nickname: '   ' }).nickname).toBe('TENVI')
  })

  it('keeps bio content while updating timestamps', () => {
    const profile = updateUserProfile(
      createDefaultUserProfile('2026-06-01T00:00:00.000Z'),
      { nickname: '  Archive  ', bio: 'Personal dashboard operator' },
      '2026-06-22T00:00:00.000Z',
    )

    expect(profile).toMatchObject({
      id: 'local-user',
      nickname: 'Archive',
      bio: 'Personal dashboard operator',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-22T00:00:00.000Z',
    })
  })

  it('keeps avatarImageId as a string and updates updatedAt', () => {
    const profile = updateUserProfile(
      createDefaultUserProfile('2026-06-01T00:00:00.000Z'),
      { avatarImageId: ' profile-image-1 ' },
      '2026-06-22T00:00:00.000Z',
    )

    expect(profile.avatarImageId).toBe('profile-image-1')
    expect(profile.updatedAt).toBe('2026-06-22T00:00:00.000Z')
  })

  it('resets the profile to the default structure', () => {
    expect(resetUserProfile('2026-06-22T00:00:00.000Z')).toEqual(
      createDefaultUserProfile('2026-06-22T00:00:00.000Z'),
    )
  })
})
