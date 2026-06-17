import { useEffect, useRef, useState } from 'react'
import { getBoardImages, saveBoardImage } from './boardImageStore.js'

// 에디터 블록 고유 ID 생성
const createEditorBlockId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  // randomUUID 미지원 환경 fallback
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 기본 텍스트 블록 생성
const createTextBlock = () => ({
  id: createEditorBlockId(),
  type: 'text',
  content: '',
})

function BoardEditor({ blocks, onChange, t }) {
  const fileInputRef = useRef(null)
  const activeBlockIdRef = useRef('')
  const [, setActiveBlockId] = useState('')
  const [imagePreviews, setImagePreviews] = useState({})
  const textBlockCount = blocks.filter((block) => block.type === 'text').length

  // 실제 선택된 블록 기준 유지
  const selectActiveBlock = (blockId) => {
    activeBlockIdRef.current = blockId
    setActiveBlockId(blockId)
  }

  // imageId 기반 preview 복원
  useEffect(() => {
    const imageIds = blocks
      .filter((block) => block.type === 'image' && block.imageId)
      .map((block) => block.imageId)
    const missingImageIds = imageIds.filter((imageId) => !imagePreviews[imageId])

    if (missingImageIds.length === 0) {
      return
    }

    let isMounted = true

    getBoardImages(missingImageIds)
      .then((imagesById) => {
        if (!isMounted) {
          return
        }

        if (Object.keys(imagesById).length === 0) {
          return
        }

        setImagePreviews((currentPreviews) => {
          const nextPreviews = { ...currentPreviews }

          Object.entries(imagesById).forEach(([imageId, image]) => {
            nextPreviews[imageId] = image.dataUrl
          })

          return nextPreviews
        })
      })
      .catch(() => {
        // preview 실패 시 legacy src fallback만 사용
      })

    return () => {
      isMounted = false
    }
  }, [blocks, imagePreviews])

  // 현재 선택된 블록 기준 삽입 위치 계산
  const getInsertIndex = () => {
    const activeIndex = blocks.findIndex(
      (block) => block.id === activeBlockIdRef.current,
    )

    // 포커스 블록 아래 삽입
    return activeIndex >= 0 ? activeIndex + 1 : blocks.length
  }

  // 활성 블록 다음 위치에 삽입
  const insertBlocks = (newBlocks) => {
    const insertIndex = getInsertIndex()
    onChange([
      ...blocks.slice(0, insertIndex),
      ...newBlocks,
      ...blocks.slice(insertIndex),
    ])
  }

  // 단일 블록 내용 갱신
  const updateBlock = (blockId, patch) => {
    onChange(
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...patch,
            }
          : block,
      ),
    )
  }

  // 새 텍스트 블록 추가 후 포커스 이동
  const addTextBlock = () => {
    const nextBlock = createTextBlock()

    insertBlocks([nextBlock])
    selectActiveBlock(nextBlock.id)
  }

  // 이미지 파일을 IndexedDB 이미지 블록으로 변환
  const addImageBlock = async (file) => {
    if (!file) {
      return
    }

    const savedImage = await saveBoardImage(file)
    const nextImageBlock = {
      id: createEditorBlockId(),
      type: 'image',
      imageId: savedImage.imageId,
      name: savedImage.name,
    }

    insertBlocks([nextImageBlock])
    selectActiveBlock(nextImageBlock.id)

    // 새 이미지도 저장소 조회를 통해 즉시 preview 연결
    const imagesById = await getBoardImages([savedImage.imageId])
    const savedImageRecord = imagesById[savedImage.imageId]

    if (savedImageRecord?.dataUrl) {
      setImagePreviews((currentPreviews) => ({
        ...currentPreviews,
        [savedImage.imageId]: savedImageRecord.dataUrl,
      }))
    }
  }

  // 최소 1개 텍스트 블록 보존 삭제
  const removeBlock = (blockId) => {
    const targetBlock = blocks.find((block) => block.id === blockId)

    if (targetBlock?.type === 'text' && textBlockCount <= 1) {
      return
    }

    onChange(blocks.filter((block) => block.id !== blockId))
  }

  // 블록 순서 이동
  const moveBlock = (blockId, direction) => {
    const blockIndex = blocks.findIndex((block) => block.id === blockId)
    const nextIndex = blockIndex + direction

    if (blockIndex < 0 || nextIndex < 0 || nextIndex >= blocks.length) {
      return
    }

    const nextBlocks = [...blocks]
    const [movingBlock] = nextBlocks.splice(blockIndex, 1)
    nextBlocks.splice(nextIndex, 0, movingBlock)
    onChange(nextBlocks)
  }

  return (
    <div className="board-editor">
      <div className="board-editor-toolbar">
        <button
          type="button"
          className="board-secondary-button"
          onClick={addTextBlock}
        >
          {t.board.addTextBlock}
        </button>
        <button
          type="button"
          className="board-secondary-button"
          onClick={() => fileInputRef.current?.click()}
        >
          {t.board.addImageBlock}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="board-editor-file-input"
          onChange={(event) => {
            addImageBlock(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </div>

      <div className="board-editor-canvas">
        {blocks.map((block, index) => {
          const imageSource =
            block.type === 'image'
              ? block.src || imagePreviews[block.imageId] || ''
              : ''

          return (
            <div
              className={`board-editor-block board-editor-${block.type}-block`}
              key={block.id}
              onClick={() => selectActiveBlock(block.id)}
              onFocus={() => selectActiveBlock(block.id)}
            >
              <div className="board-editor-floating-actions">
                <button
                  type="button"
                  className="board-editor-action-button"
                  onClick={() => moveBlock(block.id, -1)}
                  disabled={index === 0}
                >
                  {t.board.moveBlockUp}
                </button>
                <button
                  type="button"
                  className="board-editor-action-button"
                  onClick={() => moveBlock(block.id, 1)}
                  disabled={index === blocks.length - 1}
                >
                  {t.board.moveBlockDown}
                </button>
                <button
                  type="button"
                  className="board-editor-action-button is-danger"
                  onClick={() => removeBlock(block.id)}
                  disabled={block.type === 'text' && textBlockCount <= 1}
                >
                  {t.board.deleteBlock}
                </button>
              </div>

              {block.type === 'image' ? (
                <figure className="board-editor-image-block">
                  {imageSource ? (
                    <img
                      className="board-editor-image"
                      src={imageSource}
                      alt={block.name}
                    />
                  ) : null}
                </figure>
              ) : (
                <textarea
                  className="board-editor-textarea"
                  value={block.content}
                  onChange={(event) =>
                    updateBlock(block.id, { content: event.target.value })
                  }
                  placeholder={t.board.contentPlaceholder}
                  rows={5}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BoardEditor
