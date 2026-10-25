import { useEffect, useId, useRef } from 'react'

// 편집기를 목록과 분리하고 native dialog로 포커스·Escape·배경 접근 차단 처리
export default function TravelEditorPanel({ title, t, onClose, children, description = t.editorHint }) {
  const dialog = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    element.showModal()
    element.querySelector('.travel-fields input, .travel-fields select, .travel-fields textarea')?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])
  return <dialog className="travel-editor-dialog" ref={dialog} aria-labelledby={titleId} onCancel={onClose}
    onClick={(event) => {
      if (event.target !== dialog.current) return
      const box = dialog.current.getBoundingClientRect()
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose()
    }}>
    <header className="travel-editor-heading"><div><h3 id={titleId}>{title}</h3><p>{description}</p></div>
      <button type="button" onClick={onClose} aria-label={t.cancel}>✕</button>
    </header>
    <div className="travel-editor-body">{children}</div>
  </dialog>
}
