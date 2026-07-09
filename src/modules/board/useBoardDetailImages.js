import { useEffect, useState } from 'react'
import { getBoardImages } from './boardImageRepository.js'
import { getBoardImageIds } from '../boardLogic.js'

function useBoardDetailImages(selectedPost) {
  // 상세 화면 전용 이미지 preview와 lightbox 상태
  const [detailImagePreviews, setDetailImagePreviews] = useState({})
  const [imageViewer, setImageViewer] = useState(null)

  // 상세 화면 imageId preview 복원
  useEffect(() => {
    if (!selectedPost) {
      return
    }

    const imageIds = getBoardImageIds(selectedPost.blocks)

    if (imageIds.length === 0) {
      return
    }

    let isMounted = true

    getBoardImages(imageIds)
      .then((imagesById) => {
        if (!isMounted) {
          return
        }

        setDetailImagePreviews(
          Object.fromEntries(
            Object.entries(imagesById).map(([imageId, image]) => [
              imageId,
              image.dataUrl,
            ]),
          ),
        )
      })
      .catch(() => {
        if (isMounted) {
          // 이미지 조회 실패 시 상세 텍스트는 계속 표시
          setDetailImagePreviews({})
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedPost])

  // 상세 이미지 확대 보기 중 배경 스크롤 잠금
  useEffect(() => {
    if (!imageViewer) {
      return undefined
    }

    document.body.classList.add('tenvi-modal-open')

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setImageViewer(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('tenvi-modal-open')
    }
  }, [imageViewer])

  return {
    detailImagePreviews,
    imageViewer,
    setImageViewer,
  }
}

export default useBoardDetailImages
