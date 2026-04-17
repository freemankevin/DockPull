import { Package, Settings, BarChart3, Terminal, ArrowUpRight, MessageSquare } from 'lucide-react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Images from './pages/Images'
import SettingsPage from './pages/Settings'
import Stats from './pages/Stats'
import Logs from './pages/Logs'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { NotificationBell } from './context/NotificationBell'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider, useLanguage } from './context/LanguageContext'
import { UserMenu } from './context/UserMenu'
import { DocLayout } from './docs'
import {
  Introduction,
  QuickStart,
  Installation,
  ImageManagement,
  MultiPlatform,
  AutoExport,
  Webhooks,
  Settings as DocSettings,
  Registries,
  Tokens,
  ApiReference
} from './docs/pages'
import './App.css'

function MainApp() {
  const { t, language } = useLanguage()
  
  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="logo">
          <img src="/logo.png" alt="DockerPull" className="logo-image" />
        </div>

        <ul className="nav-links">
          <li className="nav-top-divider">
            <NavLink to="/stats">
              <BarChart3 size={18} strokeWidth={1.75} />
              <span>{t('nav.overview')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/" end>
              <Package size={18} strokeWidth={1.75} />
              <span>{t('nav.images')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/logs">
              <Terminal size={18} strokeWidth={1.75} />
              <span>{t('nav.logs')}</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings">
              <Settings size={18} strokeWidth={1.75} />
              <span>{t('nav.settings')}</span>
            </NavLink>
          </li>
          <li className="nav-divider">
            <a
              href="/docs/introduction"
              className="docs-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
              <span>{t('nav.docs')}</span>
              <ArrowUpRight size={14} strokeWidth={2} className="docs-link-icon ml-[3px]" />
            </a>
          </li>
          <li>
            <a
              href="https://github.com/freemankevin/DockerPull/issues"
              className="docs-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare size={18} strokeWidth={1.75} />
              <span>{t('nav.support')}</span>
              <ArrowUpRight size={14} strokeWidth={2} className="docs-link-icon ml-[3px]" />
            </a>
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
            {new Date().toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
              year: 'numeric',
              month: language === 'zh' ? 'long' : 'short',
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
              <Route path="/logs"     element={<Logs />} />
              <Route path="/stats"    element={<Stats />} />
              <Route path="/settings" element={<SettingsPage />} />
              {/* Docs routes - independent layout */}
              <Route path="/docs" element={<DocLayout />}>
                <Route index element={<Introduction />} />
                <Route path="introduction"    element={<Introduction />} />
                <Route path="quick-start"     element={<QuickStart />} />
                <Route path="installation"    element={<Installation />} />
                <Route path="image-management" element={<ImageManagement />} />
                <Route path="multi-platform"  element={<MultiPlatform />} />
                <Route path="auto-export"     element={<AutoExport />} />
                <Route path="webhooks"        element={<Webhooks />} />
                <Route path="settings"        element={<DocSettings />} />
                <Route path="registries"      element={<Registries />} />
                <Route path="tokens"          element={<Tokens />} />
                <Route path="api-reference"   element={<ApiReference />} />
              </Route>
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
          <LanguageProvider>
            <AppContent />
          </LanguageProvider>
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
        <LanguageProvider>
          <ToastProvider>
            <NotificationProvider>
              <Login />
            </NotificationProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    )
  }

  return (
    <ToastProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </ToastProvider>
  )
}

export default App
