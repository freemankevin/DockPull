import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, Sun, Moon, LogOut, MoreVertical, Languages } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'
import { useLanguage } from './LanguageContext'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function UserMenu() {
  const { user, logout, updateAvatar } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, handleClickOutside])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      alert(t('user.uploadValid'))
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(t('user.fileSize'))
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      if (result) updateAvatar(result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
    setOpen(false)
  }

  const handleLogout = () => {
    setOpen(false)
    logout()
  }

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      <div className="user-info">
        <div className="user-avatar-container">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="user-avatar-image" />
          ) : (
            <div className="user-avatar-placeholder">
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
          )}
        </div>
        <div className="user-details">
          <div className="user-name">{user?.username || 'Admin'}</div>
          <div className="user-role">{t('user.admin')}</div>
        </div>
        <button
          className="user-menu-trigger"
          onClick={() => setOpen(!open)}
          title="User menu"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {open && (
        <div className="user-menu-dropdown">
          <div className="user-menu-section user-menu-header-section">
            <div
              className="user-menu-avatar-large"
              onClick={() => fileInputRef.current?.click()}
              title="Change avatar"
              style={{ cursor: 'pointer' }}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="user-avatar-image" />
              ) : (
                <div className="user-avatar-placeholder">
                  {user?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              <div className="avatar-upload-overlay">
                <Camera size={18} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
              />
            </div>
            <div className="user-menu-info">
              <div className="user-menu-name">{user?.username || 'Admin'}</div>
              <div className="user-menu-role">{t('user.admin')}</div>
              <div className="user-menu-hint">{t('user.clickChange')}</div>
            </div>
          </div>

          <div className="user-menu-divider" />

          <button className="user-menu-item" onClick={() => { setOpen(false); window.open('/docs', '_blank') }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
            <span>Documentation</span>
          </button>

          <button className="user-menu-item" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? t('theme.light') : t('theme.dark')}</span>
          </button>

          <button className="user-menu-item" onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}>
            <Languages size={16} />
            <span>{language === 'zh' ? 'English' : '简体中文'}</span>
          </button>

          <div className="user-menu-divider" />

          <button className="user-menu-item user-menu-danger" onClick={handleLogout}>
            <LogOut size={16} />
            <span>{t('user.logout')}</span>
          </button>
        </div>
      )}
    </div>
  )
}