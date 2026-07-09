import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout.jsx'
import BoardDetailView from '../views/BoardDetailView.jsx'
import BoardEditView from '../views/BoardEditView.jsx'
import BoardListView from '../views/BoardListView.jsx'
import BoardWriteView from '../views/BoardWriteView.jsx'
import CalendarView from '../views/CalendarView.jsx'
import CommandView from '../views/CommandView.jsx'
import DashboardView from '../views/DashboardView.jsx'
import MapView from '../views/MapView.jsx'
import NotesView from '../views/NotesView.jsx'
import SettingsView from '../views/SettingsView.jsx'
import StorageSettingsView from '../views/StorageSettingsView.jsx'
import TasksView from '../views/TasksView.jsx'
import { getModulePath } from './routes.js'

function AppRouter({ appContext }) {
  const defaultPath = getModulePath(appContext.startModule)

  return (
    <Routes>
      <Route element={<AppLayout appContext={appContext} />}>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/command" element={<CommandView />} />
        <Route path="/tasks" element={<TasksView />} />
        <Route path="/notes" element={<NotesView />} />
        <Route path="/board" element={<BoardListView />} />
        <Route path="/board/posts/new" element={<BoardWriteView />} />
        <Route path="/board/posts/:postId" element={<BoardDetailView />} />
        <Route path="/board/posts/:postId/edit" element={<BoardEditView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/settings/storage" element={<StorageSettingsView />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRouter
