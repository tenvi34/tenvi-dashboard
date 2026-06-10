import { useState } from 'react'

function MobileTabBar({
  activeModule,
  moreModules = [],
  modules,
  onModuleChange,
  t,
}) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const isMoreActive = moreModules.some((module) => module.id === activeModule)
  const handleModuleChange = (moduleId) => {
    onModuleChange(moduleId)
    setIsMoreOpen(false)
  }

  return (
    <nav className="mobile-tabbar" aria-label="TENVI mobile modules">
      {modules.map((module) => (
        <button
          className={`mobile-tabbar-button ${
            activeModule === module.id ? 'is-active' : ''
          }`}
          key={module.id}
          type="button"
          onClick={() => handleModuleChange(module.id)}
        >
          <span>{t.modules[module.id]}</span>
        </button>
      ))}

      <div className="mobile-tabbar-more">
        {isMoreOpen ? (
          <div className="mobile-tabbar-menu" role="menu">
            {moreModules.map((module) => (
              <button
                className={`mobile-tabbar-menu-button ${
                  activeModule === module.id ? 'is-active' : ''
                }`}
                key={module.id}
                type="button"
                role="menuitem"
                onClick={() => handleModuleChange(module.id)}
              >
                {t.modules[module.id]}
              </button>
            ))}
          </div>
        ) : null}
        <button
          className={`mobile-tabbar-button mobile-tabbar-more-button ${
            isMoreActive ? 'is-active' : ''
          }`}
          type="button"
          aria-expanded={isMoreOpen}
          onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
        >
          <span>{t.app.moreLabel}</span>
        </button>
      </div>
    </nav>
  )
}

export default MobileTabBar
