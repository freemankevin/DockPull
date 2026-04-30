import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'warning' | 'danger' | 'info'
  middleText?: string
  onMiddle?: () => void
  middleVariant?: 'secondary' | 'danger'
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'warning',
  middleText,
  onMiddle,
  middleVariant = 'secondary'
}: ConfirmDialogProps) {

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    } else if (e.key === 'Enter') {
      onConfirm()
    }
  }

  const iconColors = {
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    danger: 'linear-gradient(135deg, #ef4444, #dc2626)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
  }

  const buttonVariant = variant === 'danger' ? 'btn-danger' : variant === 'warning' ? 'btn-warning' : 'btn-primary'

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-card)',
          width: '460px',
          maxWidth: '90vw',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
<div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-card)',
              background: iconColors[variant],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <AlertTriangle size={20} />
            </div>
            <div style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              {title}
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: 'var(--radius-xs)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          padding: '20px',
          color: 'var(--text-secondary)',
          fontSize: '14px',
          lineHeight: '1.6',
        }}>
          {message}
        </div>

        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end',
        }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              width: 'auto',
              height: 'auto',
            }}
          >
            {cancelText}
          </button>
          {middleText && onMiddle && (
            <button
              className={`btn ${middleVariant === 'danger' ? 'btn-danger' : 'btn-secondary'}`}
              onClick={onMiddle}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                width: 'auto',
                height: 'auto',
              }}
            >
              {middleText}
            </button>
          )}
          <button
            className={`btn ${buttonVariant}`}
            onClick={onConfirm}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              width: 'auto',
              height: 'auto',
              minWidth: '72px',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}