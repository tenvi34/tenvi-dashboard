import { Link } from 'react-router-dom'
import { getModulePath } from '../router/routes.js'
import ModuleIcon from './ModuleIcon.jsx'

function Sidebar({ activeModule, modules, t }) {
  return (
    <aside
      className="tenvi-sidebar"
      aria-label={t.sidebar.label}
    >
      <div className="sidebar-header">
        <p className="module-label">{t.sidebar.title}</p>
      </div>
      <nav className="sidebar-nav">
        {modules.map((module) => (
          <Link
            key={module.id}
            to={getModulePath(module.id)}
            className={`sidebar-button ${activeModule === module.id ? 'is-active' : ''} ${module.id === 'settings' ? 'sidebar-settings' : ''}`}
            aria-current={activeModule === module.id ? 'page' : undefined}
          >
            <ModuleIcon name={module.id} />
            <span>{t.modules[module.id]}</span>
          </Link>
        ))}
      </nav>
      <p className="sidebar-footnote">{t.app.personalSpace}</p>
    </aside>
  )
}

export default Sidebar
