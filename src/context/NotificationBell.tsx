import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useNotification } from './NotificationContext'

export function NotificationBell() {
  const { notifications, removeNotification, clearNotifications } = useNotification()
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return (
          <div className="notification-icon-bg notification-icon-success">
            <CheckCircle size={14} />
          </div>
        )
      case 'error':
        return (
          <div className="notification-icon-bg notification-icon-error">
            <AlertCircle size={14} />
          </div>
        )
      case 'warning':
        return (
          <div className="notification-icon-bg notification-icon-warning">
            <AlertTriangle size={14} />
          </div>
        )
      default:
        return (
          <div className="notification-icon-bg notification-icon-info">
            <Info size={14} />
          </div>
        )
    }
  }

  const formatTime = (time: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(time).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="notification-wrapper" ref={notificationRef}>
      <button
        className="btn btn-ghost notification-btn"
        onClick={() => setShowNotifications(!showNotifications)}
        title="Notifications"
      >
        <Bell size={18} strokeWidth={1.75} />
        {notifications.length > 0 && (
          <span className="notification-badge">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>
      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span className="notification-title">
              Notifications
              {notifications.length > 0 && (
                <span className="notification-count">{notifications.length}</span>
              )}
            </span>
            {notifications.length > 0 && (
              <button
                className="notification-clear-btn"
                onClick={clearNotifications}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <Bell size={28} strokeWidth={1.5} />
                </div>
                <div className="notification-empty-title">No notifications</div>
                <div className="notification-empty-desc">You're all caught up!</div>
              </div>
            ) : (
              notifications.map(notification => (
                <div key={notification.id} className={`notification-item notification-item-${notification.type}`}>
                  <div className="notification-item-content">
                    {getIcon(notification.type)}
                    <div className="notification-item-body">
                      <div className="notification-item-message">
                        {notification.message}
                      </div>
                      <div className="notification-item-time">
                        {formatTime(notification.time)}
                      </div>
                    </div>
                  </div>
                  <button
                    className="notification-close"
                    onClick={() => removeNotification(notification.id)}
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
