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
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo">
          <img src="/logo.png" alt="DockPull" className="logo-image" />
        </div>

        <ul className="nav-links">
          <li className="nav-top-divider">
            <NavLink to="/stats">
              <BarChart3 size={18} strokeWidth={1.75} />
              <span>Overview</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/" end>
              <Package size={18} strokeWidth={1.75} />
              <span>Images</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/logs">
              <FileText size={18} strokeWidth={1.75} />
              <span>Logs</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings">
              <Settings size={18} strokeWidth={1.75} />
              <span>Settings</span>
            </NavLink>
          </li>
        </ul>

        <div className="sidebar-footer">
          <UserMenu />
        </div>
      </aside>

      {/* ── Main Wrapper (右侧容器，带 margin) ── */}
      <main className="main-wrapper">
        {/* 独立的顶部通知区域 */}
        <div className="top-bar">
          <NotificationBell />
          <div className="top-bar-divider"></div>
          <div className="top-bar-date">
            {new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {/* ── Content Card (白色卡片容器) ── */}
        <div className="content-card">
          {/* Card Body */}
          <div className="card-body">
            <Routes>
              <Route path="/"         element={<Images />} />
              <Route path="/logs"    element={<Logs />} />
              <Route path="/stats"    element={<Stats />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </div>
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
