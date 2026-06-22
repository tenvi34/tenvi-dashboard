import { useEffect, useState } from 'react'
import { getProfileImage } from '../modules/profileImageStore.js'
import './UserAvatar.css'

const AVATAR_SIZE_CLASS = {
  sm: 'user-avatar--sm',
  md: 'user-avatar--md',
  lg: 'user-avatar--lg',
}

const getFallbackInitial = (nickname) => {
  const normalizedNickname = String(nickname ?? '').trim()

  return (normalizedNickname || 'T').slice(0, 1).toUpperCase()
}

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

  useEffect(() => {
    let isMounted = true

    if (!avatarImageId) {
      return () => {
        isMounted = false
      }
    }

    getProfileImage(avatarImageId)
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
