import { Package, Settings, BarChart3, FileText } from 'lucide-react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Images from './pages/Images'
import SettingsPage from './pages/Settings'
import Stats from './pages/Stats'
import Logs from './pages/Logs'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { NotificationBell } from './context/NotificationBell'
import { ThemeProvider } from './context/ThemeContext'
import { UserMenu } from './context/UserMenu'
import './App.css'

function MainApp() {
  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <nav className="sidebar">
        {/* Brand */}
        <div className="logo">
          <img src="/logo.png" alt="DockPull" className="logo-image" />
        </div>

        {/* Navigation */}
<ul className="nav-links">
          <li className="nav-top-divider">
            <NavLink to="/stats">
              <BarChart3 size={16} strokeWidth={1.75} />
              <span>Overview</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/" end>
              <Package size={16} strokeWidth={1.75} />
              <span>Images</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/logs">
              <FileText size={16} strokeWidth={1.75} />
              <span>Logs</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings">
              <Settings size={16} strokeWidth={1.75} />
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>

        {/* User / Footer */}
        <div className="sidebar-footer">
          <UserMenu />
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="content">
        {/* Top bar */}
        <div className="content-header">
          <div className="content-header-spacer" />
          <NotificationBell />
        </div>

        {/* Page Routes */}
<Routes>
          <Route path="/"         element={<Images />} />
          <Route path="/logs"    element={<Logs />} />
          <Route path="/stats"    element={<Stats />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  )
}

function AppContent() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <NotificationProvider>
          <Login />
        </NotificationProvider>
      </ThemeProvider>
    )
  }

  return (
    <NotificationProvider>
      <MainApp />
    </NotificationProvider>
  )
}

export default App
