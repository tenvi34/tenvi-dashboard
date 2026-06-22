export const DEFAULT_USER_PROFILE_ID = 'local-user'
export const DEFAULT_USER_NICKNAME = 'TENVI'

// 로컬 사용자 프로필 기본 구조
export const createDefaultUserProfile = (createdAt = new Date().toISOString()) => ({
  id: DEFAULT_USER_PROFILE_ID,
  nickname: DEFAULT_USER_NICKNAME,
  bio: '',
  avatarImageId: '',
  createdAt,
  updatedAt: createdAt,
})

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// 저장소에서 읽은 프로필을 현재 구조로 보정
export const normalizeUserProfile = (profile, fallbackDate = new Date().toISOString()) => {
  const defaultProfile = createDefaultUserProfile(fallbackDate)

  if (!isPlainObject(profile)) {
    return defaultProfile
  }

  const nickname = String(profile.nickname ?? '').trim() || DEFAULT_USER_NICKNAME
  const createdAt = String(profile.createdAt ?? '').trim() || fallbackDate

  return {
    id: DEFAULT_USER_PROFILE_ID,
    nickname,
    bio: String(profile.bio ?? ''),
    avatarImageId: String(profile.avatarImageId ?? '').trim(),
    createdAt,
    updatedAt: String(profile.updatedAt ?? '').trim() || createdAt,
  }
}

// localStorage JSON parse 실패 시 기본 프로필로 복구
export const parseUserProfile = (rawProfile, fallbackDate) => {
  if (!rawProfile) {
    return createDefaultUserProfile(fallbackDate)
  }

  try {
    return normalizeUserProfile(JSON.parse(rawProfile), fallbackDate)
  } catch {
    return createDefaultUserProfile(fallbackDate)
  }
}

// Settings 저장 폼 입력값 반영
export const updateUserProfile = (
  currentProfile,
  updates,
  updatedAt = new Date().toISOString(),
) => {
  const normalizedProfile = normalizeUserProfile(currentProfile, updatedAt)

  return normalizeUserProfile(
    {
      ...normalizedProfile,
      ...updates,
      updatedAt,
    },
    updatedAt,
  )
}

export const resetUserProfile = (resetAt = new Date().toISOString()) =>
  createDefaultUserProfile(resetAt)
