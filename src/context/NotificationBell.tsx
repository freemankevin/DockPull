import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCircle, AlertCircle, Info } from 'lucide-react'
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
      case 'success': return <CheckCircle size={13} className="notification-success" />
      case 'error':   return <AlertCircle size={13} className="notification-error" />
      default:        return <Info size={13} className="notification-info" />
    }
  }

  return (
    <div className="notification-wrapper" ref={notificationRef}>
      <button
        className="btn btn-ghost notification-btn"
        onClick={() => setShowNotifications(!showNotifications)}
        title="Notifications"
      >
        <Bell size={16} strokeWidth={1.75} />
        {notifications.length > 0 && (
          <span className="notification-badge">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>
      {showNotifications && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={clearNotifications}
                style={{ fontSize: '11.5px', padding: '2px 6px' }}
              >
                Clear all
              </button>
            )}
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div key={notification.id} className="notification-item">
                  <div className="notification-content">
                    {getIcon(notification.type)}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: 1.4 }}>
                      {notification.message}
                    </span>
                  </div>
                  <button
                    className="notification-close"
                    onClick={() => removeNotification(notification.id)}
                    title="Dismiss"
                  >
                    <X size={12} />
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