function MobileTabBar({ activeModule, modules, onModuleChange, t }) {
  return (
    <nav className="mobile-tabbar" aria-label="TENVI mobile modules">
      {modules.map((module) => (
        <button
          className={`mobile-tabbar-button ${
            activeModule === module.id ? 'is-active' : ''
          }`}
          key={module.id}
          type="button"
          onClick={() => onModuleChange(module.id)}
        >
          <span>{t.modules[module.id]}</span>
        </button>
      ))}
    </nav>
  )
}

export default MobileTabBar
