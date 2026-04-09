import { createContext, useContext, useState, ReactNode } from 'react'

export interface Notification {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  time: Date
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (type: Notification['type'], message: string) => void
  removeNotification: (id: number) => void
  clearNotifications: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider')
  }
  return context
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = (type: Notification['type'], message: string) => {
    const notification: Notification = {
      id: Date.now(),
      type,
      message,
      time: new Date()
    }
    setNotifications(prev => [notification, ...prev])
  }

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearNotifications }}>
      {children}
    </NotificationContext.Provider>
  )
}