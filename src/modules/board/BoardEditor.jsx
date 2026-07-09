import { useEffect, useRef, useState } from 'react'
import { getBoardImages, saveBoardImage } from './boardImageRepository.js'

// 에디터 블록 고유 ID 생성
// 에디터 블록 id 생성
const createEditorBlockId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  // randomUUID 미지원 환경 fallback
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// 기본 텍스트 블록 생성
// 텍스트 블록 기본값 생성
const createTextBlock = () => ({
  id: createEditorBlockId(),
  type: 'text',
  content: '',
})

// 텍스트 내용 길이에 따른 textarea 높이
// 텍스트 줄 수 기반 높이 계산
const getTextBlockRows = (content = '') =>
  Math.max(String(content).split('\n').length, 2)

// Board 블록 에디터
function BoardEditor({ blocks, onChange, t }) {
  const fileInputRef = useRef(null)
  const activeBlockIdRef = useRef('')
  const pendingImageInsertRef = useRef({
    appendTextBlock: false,
    targetBlockId: '',
  })
  const dragStateRef = useRef({
    blockId: '',
    position: '',
    targetId: '',
  })
  const [, setActiveBlockId] = useState('')
  const [dragState, setDragState] = useState({
    blockId: '',
    position: '',
    targetId: '',
  })
  const [imagePreviews, setImagePreviews] = useState({})
  const textBlockCount = blocks.filter((block) => block.type === 'text').length

  // 실제 선택된 블록 기준 유지
  // 현재 선택 블록 기록
  const selectActiveBlock = (blockId) => {
    activeBlockIdRef.current = blockId
    setActiveBlockId(blockId)
  }

  // 드래그 상태 ref/state 동기화
  // 드래그 상태 동기화
  const updateDragState = (nextState) => {
    dragStateRef.current = nextState
    setDragState(nextState)
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
        if (!isMounted || Object.keys(imagesById).length === 0) {
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

  // 기준 블록 바로 아래 삽입 위치 계산
  // 삽입 위치 계산
  const getInsertIndex = (targetBlockId = activeBlockIdRef.current) => {
    const activeIndex = blocks.findIndex((block) => block.id === targetBlockId)

    return activeIndex >= 0 ? activeIndex + 1 : blocks.length
  }

  // 기준 블록 다음 위치에 삽입
  // 블록 배열 삽입
  const insertBlocks = (newBlocks, targetBlockId) => {
    const insertIndex = getInsertIndex(targetBlockId)
    onChange([
      ...blocks.slice(0, insertIndex),
      ...newBlocks,
      ...blocks.slice(insertIndex),
    ])
  }

  // 단일 블록 내용 갱신
  // 블록 내용 갱신
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

  // 텍스트 블록 추가 후 포커스 이동
  // 텍스트 블록 추가
  const addTextBlock = (targetBlockId) => {
    const nextBlock = createTextBlock()

    insertBlocks([nextBlock], targetBlockId)
    selectActiveBlock(nextBlock.id)
  }

  // 이미지 선택 위치 예약
  // 이미지 삽입 위치 예약
  const openImagePicker = (
    targetBlockId = activeBlockIdRef.current,
    appendTextBlock = false,
  ) => {
    pendingImageInsertRef.current = {
      appendTextBlock,
      targetBlockId,
    }
    fileInputRef.current?.click()
  }

  // 이미지 파일을 IndexedDB 이미지 블록으로 변환
  // 이미지 파일 저장 후 블록 추가
  const addImageBlock = async (file, options = {}) => {
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
    const insertedBlocks = options.appendTextBlock
      ? [nextImageBlock, createTextBlock()]
      : [nextImageBlock]

    insertBlocks(insertedBlocks, options.targetBlockId)
    selectActiveBlock(insertedBlocks[insertedBlocks.length - 1].id)

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
  // 블록 삭제
  const removeBlock = (blockId) => {
    const targetBlock = blocks.find((block) => block.id === blockId)

    if (targetBlock?.type === 'text' && textBlockCount <= 1) {
      return
    }

    onChange(blocks.filter((block) => block.id !== blockId))
  }

  // 블록 순서 이동
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

  // 드롭 위치 기준 블록 재정렬
  // 드래그 기준 블록 재배치
  const reorderBlock = (draggedBlockId, targetBlockId, position) => {
    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      return
    }

    const draggedIndex = blocks.findIndex((block) => block.id === draggedBlockId)
    const targetIndex = blocks.findIndex((block) => block.id === targetBlockId)

    if (draggedIndex < 0 || targetIndex < 0) {
      return
    }

    const nextBlocks = [...blocks]
    const [draggedBlock] = nextBlocks.splice(draggedIndex, 1)
    const adjustedTargetIndex =
      draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
    const insertIndex =
      position === 'after' ? adjustedTargetIndex + 1 : adjustedTargetIndex

    nextBlocks.splice(insertIndex, 0, draggedBlock)
    onChange(nextBlocks)
    selectActiveBlock(draggedBlock.id)
  }

  // 블록 위/아래 절반으로 드롭 위치 계산
  // 포인터 위치의 대상 블록과 삽입 방향 계산
  // 포인터 위치의 드롭 대상 계산
  const getPointerDropTarget = (event) => {
    const targetElement = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest('[data-board-block-id]')

    if (!targetElement) {
      return { position: '', targetId: '' }
    }

    const rect = targetElement.getBoundingClientRect()
    const position = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'

    return {
      position,
      targetId: targetElement.dataset.boardBlockId,
    }
  }

  return (
    <div className="board-editor">
      <div className="board-editor-toolbar">
        <button
          type="button"
          className="board-secondary-button"
          onClick={() => addTextBlock()}
        >
          {t.board.addTextBlock}
        </button>
        <button
          type="button"
          className="board-secondary-button"
          onClick={() => openImagePicker()}
        >
          {t.board.addImageBlock}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="board-editor-file-input"
          onChange={(event) => {
            addImageBlock(event.target.files?.[0], pendingImageInsertRef.current)
            pendingImageInsertRef.current = {
              appendTextBlock: false,
              targetBlockId: '',
            }
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
          const dropClass =
            dragState.targetId === block.id && dragState.position
              ? ` is-drop-${dragState.position}`
              : ''
          const dragClass = dragState.blockId === block.id ? ' is-dragging' : ''

          return (
            <div
              className={`board-editor-block board-editor-${block.type}-block${dropClass}${dragClass}`}
              key={block.id}
              data-board-block-id={block.id}
              onClick={() => selectActiveBlock(block.id)}
              onFocus={() => selectActiveBlock(block.id)}
            >
              <div className="board-editor-floating-actions">
                <button
                  type="button"
                  className="board-editor-action-button board-editor-drag-handle"
                  onPointerCancel={() =>
                    updateDragState({ blockId: '', position: '', targetId: '' })
                  }
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    selectActiveBlock(block.id)
                    event.currentTarget.setPointerCapture?.(event.pointerId)
                    updateDragState({
                      blockId: block.id,
                      position: '',
                      targetId: '',
                    })
                  }}
                  onPointerMove={(event) => {
                    const currentDragState = dragStateRef.current

                    if (!currentDragState.blockId) {
                      return
                    }

                    const dropTarget = getPointerDropTarget(event)

                    if (
                      !dropTarget.targetId ||
                      dropTarget.targetId === currentDragState.blockId
                    ) {
                      updateDragState({
                        ...currentDragState,
                        position: '',
                        targetId: '',
                      })
                      return
                    }

                    updateDragState({
                      ...currentDragState,
                      position: dropTarget.position,
                      targetId: dropTarget.targetId,
                    })
                  }}
                  onPointerUp={(event) => {
                    const currentDragState = dragStateRef.current

                    event.currentTarget.releasePointerCapture?.(event.pointerId)

                    if (currentDragState.targetId && currentDragState.position) {
                      reorderBlock(
                        currentDragState.blockId,
                        currentDragState.targetId,
                        currentDragState.position,
                      )
                    }

                    updateDragState({ blockId: '', position: '', targetId: '' })
                  }}
                >
                  이동
                </button>
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
                  rows={getTextBlockRows(block.content)}
                />
              )}

              <div className="board-editor-insert-row">
                <button
                  type="button"
                  className="board-editor-insert-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    addTextBlock(block.id)
                  }}
                >
                  {t.board.addTextBlock}
                </button>
                <button
                  type="button"
                  className="board-editor-insert-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openImagePicker(block.id, true)
                  }}
                >
                  {t.board.addImageBlock}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BoardEditor
