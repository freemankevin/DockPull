export const ACTION_META_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  CREATE:         { label: 'Created',        color: 'var(--blue-500)',   bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.2)' },
  UPDATE:         { label: 'Updated',        color: 'var(--yellow-500)', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)' },
  PULL_START:     { label: 'Pulling',        color: 'var(--purple-500)', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.2)' },
  PULL_SUCCESS:   { label: 'Success',        color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)' },
  PULL_FAILED:    { label: 'Failed',         color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)' },
  EXPORT_START:   { label: 'Exporting',      color: 'var(--purple-500)', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.2)' },
  EXPORT_SUCCESS: { label: 'Exported',       color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)' },
  EXPORT_FAILED:  { label: 'Failed',         color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)' },
  PLATFORM_CHANGED: { label: 'Changed',     color: 'var(--yellow-500)', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)' },
}

export const PAGE_SIZE = 20

export const ALL_ACTIONS = [
  { value: 'all', label: 'All Actions' },
  ...Object.entries(ACTION_META_LABELS).map(([value, { label }]) => ({ value, label }))
]

export const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'linux/amd64', label: 'AMD64' },
  { value: 'linux/arm64', label: 'ARM64' },
]