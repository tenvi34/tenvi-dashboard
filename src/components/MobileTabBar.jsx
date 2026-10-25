import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getModulePath } from '../router/routes.js'
import ModuleIcon from './ModuleIcon.jsx'

function MobileTabBar({ activeModule, moreModules = [], modules, t }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const menuId = useId()
  const isMoreActive = moreModules.some((module) => module.id === activeModule)
  // 더보기 외부 클릭과 Escape 닫기, 키보드 사용자의 위치 복원
  useEffect(() => {
    if (!isMoreOpen) return
    const closeOutside = (event) => { if (!menuRef.current?.contains(event.target)) setIsMoreOpen(false) }
    const closeOnEscape = (event) => { if (event.key === 'Escape') { setIsMoreOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [isMoreOpen])
  const renderLink = (module, className) => <Link key={module.id} to={getModulePath(module.id)}
    className={`${className} ${activeModule === module.id ? 'is-active' : ''}`}
    aria-current={activeModule === module.id ? 'page' : undefined} onClick={() => setIsMoreOpen(false)}>
    <ModuleIcon name={module.id} /><span>{t.modules[module.id]}</span>
  </Link>
  return <nav className="mobile-tabbar" aria-label={t.sidebar.label}>
    {modules.map((module) => renderLink(module, 'mobile-tabbar-button'))}
    <div className="mobile-tabbar-more" ref={menuRef}>
      {isMoreOpen && <div className="mobile-tabbar-menu" id={menuId}>{moreModules.map((module) => renderLink(module, 'mobile-tabbar-menu-button'))}</div>}
      <button ref={triggerRef} className={`mobile-tabbar-button mobile-tabbar-more-button ${isMoreActive ? 'is-active' : ''}`}
        type="button" aria-expanded={isMoreOpen} aria-controls={isMoreOpen ? menuId : undefined} onClick={() => setIsMoreOpen((open) => !open)}>
        <ModuleIcon name="more" /><span>{t.app.moreLabel}</span>
      </button>
    </div>
  </nav>
}
export default MobileTabBar
