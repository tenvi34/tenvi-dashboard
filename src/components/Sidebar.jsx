function Sidebar({ activeModule, modules, onModuleChange, t }) {
  return (
    <aside className="tenvi-sidebar" aria-label="TENVI modules">
      <div className="sidebar-header">
        <p className="module-label">{t.sidebar.label}</p>
        <h2>{t.sidebar.title}</h2>
      </div>

      <nav className="sidebar-nav">
        {modules.map((module) => (
          <button
            className={`sidebar-button ${
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
    </aside>
  )
}

export default Sidebar
