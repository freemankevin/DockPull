import { Folder } from 'lucide-react'
import type { Directory } from '../types/directory'

export function renderDirectoryList(
  directories: Directory[],
  loading: boolean,
  error: string,
  loadDirectory: (path: string) => void,
  currentPath: string
) {
  if (loading) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          border: '2px solid var(--border-color)',
          borderTopColor: '#8b5cf6',
          borderRadius: '50%',
          margin: '0 auto 12px',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: '13px' }}>Loading directories...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: '#ef4444',
      }}>
        <div style={{ fontSize: '13px', marginBottom: '12px' }}>{error}</div>
        <button
          onClick={() => loadDirectory(currentPath)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (directories.length === 0) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: 'var(--text-muted)',
      }}>
        <Folder size={40} style={{
          marginBottom: '12px',
          opacity: 0.5,
        }} />
        <div style={{ fontSize: '13px' }}>
          No folders in this directory
        </div>
      </div>
    )
  }

  return (
    <div>
      {directories.map((dir) => (
        <div
          key={dir.path}
          onClick={() => loadDirectory(dir.path)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color)',
            cursor: 'pointer',
            transition: 'all 0.12s',
            background: 'var(--bg-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-primary)'
          }}
          title={dir.name}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            gap: '8px',
            minWidth: 0,
          }}>
            <Folder size={16} style={{
              color: '#8b5cf6',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {dir.name}
            </span>
          </div>
          <div style={{
            width: '150px',
            textAlign: 'left',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            paddingRight: '12px',
            whiteSpace: 'nowrap',
          }}>
            {dir.modTime ? new Date(dir.modTime).toLocaleString() : '--'}
          </div>
          <div style={{
            width: '70px',
            textAlign: 'left',
            fontSize: '12px',
            color: 'var(--text-muted)',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            File folder
          </div>
        </div>
      ))}
    </div>
  )
}