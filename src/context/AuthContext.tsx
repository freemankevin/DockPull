import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const SESSION_TIMEOUT = 2 * 60 * 60 * 1000

interface User {
  id: number
  username: string
  avatar: string | null
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  updateAvatar: (avatar: string) => void
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEFAULT_AVATAR = '/avatar.jpg'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('dockpull_user')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
    return null
  })

  const isAuthenticated = !!user

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('dockpull_token')
    localStorage.removeItem('dockpull_user')
    localStorage.removeItem('dockpull_config')
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('dockpull_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('dockpull_user')
      localStorage.removeItem('dockpull_token')
      localStorage.removeItem('dockpull_config')
    }
  }, [user])

  const getToken = () => localStorage.getItem('dockpull_token')

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      localStorage.setItem('dockpull_token', data.token)
      setUser({
        id: data.user.id,
        username: data.user.username,
        avatar: localStorage.getItem('dockpull_avatar') || DEFAULT_AVATAR
      })
      return true
    } catch {
      return false
    }
  }

  const updateAvatar = (avatar: string) => {
    if (user) {
      const updatedUser = { ...user, avatar }
      setUser(updatedUser)
      localStorage.setItem('dockpull_avatar', avatar)
    }
  }

  useEffect(() => {
    const storedAvatar = localStorage.getItem('dockpull_avatar')
    if (storedAvatar && user) {
      setUser(prev => prev ? { ...prev, avatar: storedAvatar } : null)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const resetTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        logout()
      }, SESSION_TIMEOUT)
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      resetTimer()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    resetTimer()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [isAuthenticated, logout])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateAvatar, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}