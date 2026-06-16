import { useRef, useState } from 'react'

const createEditorBlockId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const createTextBlock = () => ({
  id: createEditorBlockId(),
  type: 'text',
  content: '',
})

function BoardEditor({ blocks, onChange, t }) {
  const fileInputRef = useRef(null)
  const [activeBlockId, setActiveBlockId] = useState(blocks[0]?.id ?? '')
  const textBlockCount = blocks.filter((block) => block.type === 'text').length

  const getInsertIndex = () => {
    const activeIndex = blocks.findIndex((block) => block.id === activeBlockId)

    // 포커스 블록 아래 삽입
    return activeIndex >= 0 ? activeIndex + 1 : blocks.length
  }

  const insertBlocks = (newBlocks) => {
    const insertIndex = getInsertIndex()
    onChange([
      ...blocks.slice(0, insertIndex),
      ...newBlocks,
      ...blocks.slice(insertIndex),
    ])
  }

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

  const addTextBlock = () => {
    const nextBlock = createTextBlock()

    insertBlocks([nextBlock])
    setActiveBlockId(nextBlock.id)
  }

  const addImageBlock = (file) => {
    if (!file) {
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const nextTextBlock = createTextBlock()

      // Board 이미지: data URL 저장, 많으면 IndexedDB 권장
      insertBlocks([
        {
          id: createEditorBlockId(),
          type: 'image',
          src: String(reader.result ?? ''),
          name: file.name,
        },
        nextTextBlock,
      ])
      setActiveBlockId(nextTextBlock.id)
    }

    reader.readAsDataURL(file)
  }

  const removeBlock = (blockId) => {
    const targetBlock = blocks.find((block) => block.id === blockId)

    if (targetBlock?.type === 'text' && textBlockCount <= 1) {
      return
    }

    onChange(blocks.filter((block) => block.id !== blockId))
  }

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
        {blocks.map((block, index) => (
          <div
            className={`board-editor-block board-editor-${block.type}-block`}
            key={block.id}
            onFocus={() => setActiveBlockId(block.id)}
            onMouseEnter={() => setActiveBlockId(block.id)}
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
                <img
                  className="board-editor-image"
                  src={block.src}
                  alt={block.name}
                />
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
        ))}
      </div>
    </div>
  )
}

export default BoardEditor
