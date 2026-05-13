import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './modules/Dashboard.jsx'
import Notes from './modules/Notes.jsx'
import Settings from './modules/Settings.jsx'
import Tasks from './modules/Tasks.jsx'
import Timer from './modules/Timer.jsx'
import './App.css'

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
  { id: 'timer', label: 'Timer' },
  { id: 'settings', label: 'Settings' },
]

const MODULE_COMPONENTS = {
  dashboard: <Dashboard />,
  tasks: <Tasks />,
  notes: <Notes />,
  timer: <Timer />,
  settings: <Settings />,
}

function App() {
  const [activeModule, setActiveModule] = useState('tasks')
  const activeModuleLabel =
    MODULES.find((module) => module.id === activeModule)?.label ?? 'Tasks'

  return (
    <main className="tenvi-dashboard">
      <div className="tenvi-grid" aria-hidden="true"></div>

      <section className="tenvi-shell" aria-labelledby="tenvi-title">
        <header className="tenvi-header">
          <div>
            {/* <p className="tenvi-kicker">Personal AI Command Dashboard</p> */}
            <h1 id="tenvi-title">TENVI</h1>
          </div>
          <div className="system-status" aria-label="System status">
            <span className="status-dot"></span>
            <span>ONLINE</span>
          </div>
        </header>

        <section className="tenvi-workspace">
          <Sidebar
            activeModule={activeModule}
            modules={MODULES}
            onModuleChange={setActiveModule}
          />

          <section
            className="module-stage"
            aria-label={`${activeModuleLabel} module`}
          >
            {MODULE_COMPONENTS[activeModule]}
          </section>
        </section>
      </section>
    </main>
  )
}

export default App
