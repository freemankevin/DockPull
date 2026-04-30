import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCircle2, XCircle, AlertTriangle, Info, Zap, Trash2 } from 'lucide-react'
import { useNotification } from './NotificationContext'

export function NotificationBell() {
  const { notifications, removeNotification, clearNotifications } = useNotification()
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getTypeIcon = (type: string) => {
    const props = { size: 15, strokeWidth: 2 }
    switch (type) {
      case 'success': return <CheckCircle2 {...props} style={{ color: 'var(--green-500)' }} />
      case 'error':   return <XCircle      {...props} style={{ color: 'var(--red-500)' }} />
      case 'warning': return <AlertTriangle {...props} style={{ color: 'var(--yellow-500)' }} />
      default:        return <Info          {...props} style={{ color: 'var(--blue-500)' }} />
    }
  }

  const formatTime = (time: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(time).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const typeLabel: Record<string, string> = {
    success: 'Success',
    error:   'Error',
    warning: 'Warning',
    info:    'Info',
  }

  return (
    <div className="notif-wrapper" ref={notificationRef}>
      {/* ── Bell Trigger ── */}
      <button
        className={`notif-trigger ${showNotifications ? 'notif-trigger--active' : ''}`}
        onClick={() => setShowNotifications(prev => !prev)}
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-label={`${unreadCount} notifications`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {showNotifications && (
        <div className="notif-panel" role="dialog" aria-label="Notifications panel">
          {/* Panel Header */}
          <div className="notif-panel-header">
            <div className="notif-panel-title">
              <Zap size={13} strokeWidth={2.5} className="notif-zap-icon" />
              <span>Activity</span>
              {unreadCount > 0 && (
                <span className="notif-panel-count">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="notif-clear-btn"
                onClick={clearNotifications}
                title="Clear all notifications"
              >
                <Trash2 size={12} strokeWidth={2} />
                <span>Clear all</span>
              </button>
            )}
          </div>

          {/* Panel Body */}
          <div className="notif-list" role="list">
            {unreadCount === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon-wrap">
                  <Bell size={20} strokeWidth={1.5} />
                </div>
                <p className="notif-empty-title">All caught up</p>
                <p className="notif-empty-desc">No new notifications</p>
              </div>
            ) : (
              notifications.map((n, idx) => (
                <div
                  key={n.id}
                  className={`notif-item notif-item--${n.type}`}
                  role="listitem"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="notif-item-body">
                    <div className="notif-item-header-row">
                      <span className="notif-item-icon">{getTypeIcon(n.type)}</span>
                      <span className="notif-item-type-label">{typeLabel[n.type] ?? 'Info'}</span>
                      <span className="notif-item-time">{formatTime(n.time)}</span>
                    </div>
                    <p className="notif-item-message">{n.message}</p>
                  </div>

                  <button
                    className="notif-item-dismiss"
                    onClick={() => removeNotification(n.id)}
                    title="Dismiss"
                    aria-label="Dismiss notification"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Panel Footer */}
          {unreadCount > 0 && (
            <div className="notif-panel-footer">
              <span className="notif-footer-hint">
                {unreadCount} event{unreadCount !== 1 ? 's' : ''} recorded this session
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
