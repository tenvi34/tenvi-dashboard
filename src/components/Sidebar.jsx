function Sidebar({ activeModule, modules, onModuleChange }) {
  return (
    <aside className="tenvi-sidebar" aria-label="TENVI modules">
      <div className="sidebar-header">
        <p className="module-label">MODULE INDEX</p>
        <h2>Control</h2>
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
            <span>{module.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
