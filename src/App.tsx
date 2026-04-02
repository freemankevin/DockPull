import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { Container, Settings, BarChart3 } from 'lucide-react'
import Images from './pages/Images'
import SettingsPage from './pages/Settings'
import Stats from './pages/Stats'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <Container size={32} />
            <span>Docker Pull Manager</span>
          </div>
          <ul className="nav-links">
            <li>
              <NavLink to="/" end>
                <Container size={20} />
                <span>镜像管理</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/stats">
                <BarChart3 size={20} />
                <span>统计</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings">
                <Settings size={20} />
                <span>设置</span>
              </NavLink>
            </li>
          </ul>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<Images />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
