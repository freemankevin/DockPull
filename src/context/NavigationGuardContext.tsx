import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'
import { useLanguage } from './LanguageContext'

interface NavigationGuardContextType {
  hasUnsavedChanges: boolean
  setHasUnsavedChanges: (has: boolean) => void
  onSaveHandler: (handler: () => Promise<boolean>) => void
}

const NavigationGuardContext = createContext<NavigationGuardContextType | undefined>(undefined)

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveHandlerRef = useRef<(() => Promise<boolean>) | null>(null)
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const isBlockingRef = useRef(false)

  const onSaveHandler = useCallback((handler: () => Promise<boolean>) => {
    saveHandlerRef.current = handler
  }, [])

  useEffect(() => {
    if (isBlockingRef.current) {
      isBlockingRef.current = false
      return
    }

    if (hasUnsavedChanges && location.pathname !== '/settings' && pendingPath === null) {
      setPendingPath(location.pathname)
      setShowDialog(true)
      window.history.pushState({}, '', '/settings')
    }
  }, [location.pathname, hasUnsavedChanges])

  const handleConfirm = useCallback(async () => {
    setSaving(true)
    try {
      if (saveHandlerRef.current) {
        const saved = await saveHandlerRef.current()
        if (saved && pendingPath) {
          setHasUnsavedChanges(false)
          setPendingPath(null)
          setShowDialog(false)
          isBlockingRef.current = true
          navigate(pendingPath)
        }
      } else if (pendingPath) {
        setHasUnsavedChanges(false)
        setPendingPath(null)
        setShowDialog(false)
        isBlockingRef.current = true
        navigate(pendingPath)
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setSaving(false)
    }
  }, [pendingPath, navigate])

  const handleDiscard = useCallback(() => {
    setHasUnsavedChanges(false)
    if (pendingPath) {
      setPendingPath(null)
      setShowDialog(false)
      isBlockingRef.current = true
      navigate(pendingPath)
    }
  }, [pendingPath, navigate])

  return (
    <NavigationGuardContext.Provider value={{
      hasUnsavedChanges,
      setHasUnsavedChanges,
      onSaveHandler
    }}>
      {children}
      {showDialog && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleDiscard()
            }
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-lg)',
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
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
                  {t('unsaved.title')}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDiscard()
                }}
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
              {t('unsaved.message')}
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
                className="btn btn-danger"
                onClick={handleDiscard}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  width: 'auto',
                  height: 'auto',
                }}
              >
                {t('unsaved.discard')}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  width: 'auto',
                  height: 'auto',
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? t('settings.saving') : t('unsaved.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext)
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider')
  }
  return context
}