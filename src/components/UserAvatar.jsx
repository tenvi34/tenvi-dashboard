import { useEffect, useState } from 'react'
import { fetchProfileImage } from '../api/profileApi.js'
import { readProfileSettingsStorageMode } from '../modules/profileSettingsStorageMode.js'
import { getProfileImage } from '../modules/profileImageStore.js'
import './UserAvatar.css'

// 프로필 아바타 크기 클래스 매핑
const AVATAR_SIZE_CLASS = {
  sm: 'user-avatar--sm',
  md: 'user-avatar--md',
  lg: 'user-avatar--lg',
}

// 이미지가 없을 때 닉네임 첫 글자 표시
const getFallbackInitial = (nickname) => {
  const normalizedNickname = String(nickname ?? '').trim()

  return (normalizedNickname || 'T').slice(0, 1).toUpperCase()
}

// IndexedDB 프로필 이미지를 표시하는 공용 아바타
function UserAvatar({
  avatarImageId = '',
  className = '',
  nickname = 'TENVI',
  size = 'md',
}) {
  const [loadedImage, setLoadedImage] = useState({ id: '', src: '' })
  const fallbackInitial = getFallbackInitial(nickname)
  const sizeClassName = AVATAR_SIZE_CLASS[size] ?? AVATAR_SIZE_CLASS.md
  const imageSource =
    avatarImageId && loadedImage.id === avatarImageId ? loadedImage.src : ''

  // avatarImageId 변경 시 저장소에서 data URL 복원
  useEffect(() => {
    let isMounted = true

    if (!avatarImageId) {
      return () => {
        isMounted = false
      }
    }

    const imageLoader =
      readProfileSettingsStorageMode() === 'remote'
        ? fetchProfileImage
        : getProfileImage

    imageLoader(avatarImageId)
      .then((imageRecord) => {
        if (isMounted) {
          setLoadedImage({
            id: avatarImageId,
            src: imageRecord?.dataUrl ?? '',
          })
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadedImage({ id: avatarImageId, src: '' })
        }
      })

    return () => {
      isMounted = false
    }
  }, [avatarImageId])

  return (
    <span className={`user-avatar ${sizeClassName} ${className}`.trim()}>
      {imageSource ? (
        <img
          className="user-avatar__image"
          src={imageSource}
          alt={`${nickname || 'TENVI'} profile`}
        />
      ) : (
        <span
          className="user-avatar__fallback"
          role="img"
          aria-label={`${nickname || 'TENVI'} profile`}
        >
          {fallbackInitial}
        </span>
      )}
    </span>
  )
}

export default UserAvatar
