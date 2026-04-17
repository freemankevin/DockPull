import { Home, Monitor, FileText, Download, HardDrive, Folder } from 'lucide-react'

export const iconMap: Record<string, React.ReactNode> = {
  home: <Home size={16} />,
  desktop: <Monitor size={16} />,
  documents: <FileText size={16} />,
  downloads: <Download size={16} />,
  drive: <HardDrive size={16} />,
  root: <HardDrive size={16} />,
}

export function renderSpecialDirButton(
  special: { name: string; path: string; icon: string },
  currentPath: string,
  loadDirectory: (path: string) => void
) {
  const isActive = currentPath === special.path
  return (
    <button
      key={special.path}
      onClick={() => loadDirectory(special.path)}
style={{
         display: 'flex',
         alignItems: 'center',
         gap: '8px',
         padding: '8px 6px',
         borderRadius: 'var(--radius-xs)',
         border: 'none',
         background: isActive ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
         color: isActive ? '#8b5cf6' : 'var(--text-secondary)',
         fontSize: '13px',
         cursor: 'pointer',
         transition: 'all 0.15s',
         textAlign: 'left',
         fontWeight: isActive ? 500 : 400,
       }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'var(--bg-tertiary)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }
      }}
    >
      <span style={{
        color: isActive ? '#8b5cf6' : 'var(--text-muted)',
        display: 'flex',
        flexShrink: 0,
      }}>
        {iconMap[special.icon] || <Folder size={16} />}
      </span>
      {special.name}
    </button>
  )
}