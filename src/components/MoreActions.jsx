import { useEffect, useRef } from 'react'
import ModuleIcon from './ModuleIcon.jsx'

// 보조 작업을 숨기되 키보드와 터치에서 같은 흐름으로 접근 가능한 disclosure
export default function MoreActions({ label, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const closeOutside = (event) => { if (!ref.current?.contains(event.target) && ref.current) ref.current.open = false }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && ref.current?.open) { ref.current.open = false; ref.current.querySelector('summary')?.focus() }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [])
  return <details className="more-actions" ref={ref}>
    <summary><ModuleIcon name="more" /><span>{label}</span></summary>
    <div className="more-actions-content" onClick={(event) => { if (event.target.closest('button, a')) ref.current.open = false }}>{children}</div>
  </details>
}
