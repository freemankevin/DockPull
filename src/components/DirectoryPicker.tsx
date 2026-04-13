import { useState, useEffect, useCallback } from 'react'
import { X, FolderOpen } from 'lucide-react'
import { browseApi } from '../api'
import type { Directory, SpecialDir, Breadcrumb, BrowseResponse } from '../types/directory'
import { renderSpecialDirButton } from './DirectoryPickerSidebar'
import { renderBreadcrumb, renderRefreshButton } from './DirectoryPickerBreadcrumb'
import { renderDirectoryList } from './DirectoryPickerContent'

interface DirectoryPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (path: string) => void
  initialPath?: string
}

export default function DirectoryPicker({ isOpen, onClose, onSelect, initialPath }: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '')
  const [directories, setDirectories] = useState<Directory[]>([])
  const [specialDirs, setSpecialDirs] = useState<SpecialDir[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await browseApi.list(path)
      const data: BrowseResponse = res.data
      setCurrentPath(data.current)
      setDirectories(data.dirs || [])
      setSpecialDirs(data.specials || [])
      setBreadcrumbs(data.breadcrumbs || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load directory')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || '.')
    }
  }, [isOpen, initialPath, loadDirectory])

  const handleSelect = () => {
    onSelect(currentPath)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      handleSelect()
    }
  }

  if (!isOpen) return null

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
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: 'var(--bg-primary)',
          borderRadius: '8px',
          width: '720px',
          maxWidth: '90vw',
          height: '560px',
          maxHeight: '90vh',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
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
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}>
              <FolderOpen size={18} />
            </div>
            <div>
              <div style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}>Select Directory</div>
              <div style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginTop: '1px',
              }}>Choose where to save exported images</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
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

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{
            width: '150px',
            borderRight: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '8px 6px 6px',
            }}>
              Quick Access
            </div>
            {specialDirs.map((special) => renderSpecialDirButton(special, currentPath, loadDirectory))}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--bg-primary)',
            }}>
              {renderBreadcrumb(breadcrumbs, loadDirectory)}
              {renderRefreshButton(loadDirectory, currentPath)}
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 12px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                userSelect: 'none',
              }}>
                <div style={{ flex: 1 }}>Name</div>
                <div style={{ width: '150px', textAlign: 'left', paddingRight: '12px' }}>Date modified</div>
                <div style={{ width: '70px', textAlign: 'left' }}>Type</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {renderDirectoryList(directories, loading, error, loadDirectory, currentPath)}
              </div>
            </div>
          </div>
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
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              width: 'auto',
              height: 'auto',
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSelect}
            disabled={loading}
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
            Select
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}