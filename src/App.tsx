import { useRef } from 'react'
import { Package, Settings, BarChart3, LogOut, Camera, FileText } from 'lucide-react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Images from './pages/Images'
import SettingsPage from './pages/Settings'
import Stats from './pages/Stats'
import Logs from './pages/Logs'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { NotificationBell } from './context/NotificationBell'
import './App.css'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
const MAX_FILE_SIZE = 10 * 1024 * 1024

function MainApp() {
  const { user, logout, updateAvatar } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, WebP, BMP)')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be less than 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) {
        updateAvatar(result)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <nav className="sidebar">
        {/* Brand */}
        <div className="logo">
          <img src="/logo.png" alt="DockPull" className="logo-image" />
          <span>DockPull</span>
        </div>

        {/* Navigation */}
<ul className="nav-links">
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
            <NavLink to="/stats">
              <BarChart3 size={16} strokeWidth={1.75} />
              <span>Overview</span>
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
          <div className="user-info">
            <div className="user-avatar-container" onClick={handleAvatarClick} title="Change avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="user-avatar-image" />
              ) : (
                <div className="user-avatar-placeholder">
                  {user?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <div className="user-avatar-overlay">
                <Camera size={12} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username || 'Admin'}</div>
              <div className="user-role">Administrator</div>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
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
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

function AppContent() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <NotificationProvider>
        <Login />
      </NotificationProvider>
    )
  }

  return (
    <NotificationProvider>
      <MainApp />
    </NotificationProvider>
  )
}

export default App
