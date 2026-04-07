import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, Sun, Moon, Power, MoreVertical } from 'lucide-react'
import { useAuth } from './AuthContext'
import { useTheme } from './ThemeContext'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function UserMenu() {
  const { user, logout, updateAvatar } = useAuth()
  const { theme, toggleTheme } = useTheme()
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
          <div className="user-role">Administrator</div>
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
              <div className="user-menu-role">Administrator</div>
              <div className="user-menu-hint">Click avatar to change</div>
            </div>
          </div>

          <button className="user-menu-item" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button className="user-menu-item user-menu-danger" onClick={handleLogout}>
            <Power size={16} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  )
}