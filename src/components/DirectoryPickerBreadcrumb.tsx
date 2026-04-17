import { RotateCcw } from 'lucide-react'
import type { Breadcrumb } from '../types/directory'

export function renderBreadcrumb(
  breadcrumbs: Breadcrumb[],
  loadDirectory: (path: string) => void
) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      flex: 1,
      overflow: 'hidden',
      minWidth: 0,
    }}>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: index === breadcrumbs.length - 1 ? 0 : 1,
          minWidth: index === breadcrumbs.length - 1 ? 'auto' : '0',
          overflow: 'hidden',
        }}>
          {index > 0 && (
            <span style={{
              color: 'var(--text-muted)',
              margin: '0 4px',
              flexShrink: 0,
            }}>/
            </span>
          )}
          <button
            onClick={() => loadDirectory(crumb.path)}
style={{
               border: 'none',
               background: 'transparent',
               cursor: 'pointer',
               color: index === breadcrumbs.length - 1
                 ? 'var(--text-primary)'
                 : '#8b5cf6',
               fontSize: '13px',
               padding: '4px 4px',
               borderRadius: 'var(--radius-xs)',
               fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
               whiteSpace: 'nowrap',
               overflow: 'hidden',
               textOverflow: 'ellipsis',
               transition: 'all 0.15s',
               maxWidth: index === breadcrumbs.length - 1 ? '150px' : '80px',
             }}
            onMouseEnter={(e) => {
              if (index !== breadcrumbs.length - 1) {
                e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
              } else {
                e.currentTarget.style.background = 'var(--bg-tertiary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
            title={crumb.path}
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  )
}

export function renderRefreshButton(loadDirectory: (path: string) => void, currentPath: string) {
  return (
    <button
      onClick={() => loadDirectory(currentPath)}
style={{
         border: 'none',
         background: 'transparent',
         cursor: 'pointer',
         color: 'var(--text-muted)',
         padding: '4px',
         borderRadius: 'var(--radius-xs)',
         display: 'flex',
         alignItems: 'center',
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
      title="Refresh"
    >
      <RotateCcw size={14} />
    </button>
  )
}