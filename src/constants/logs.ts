export const ACTION_META_LABELS: Record<string, { color: string; bg: string; border: string }> = {
  CREATE:         { color: 'var(--blue-500)',   bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.2)' },
  UPDATE:         { color: 'var(--yellow-500)', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)' },
  PULL_START:     { color: 'var(--purple-500)', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.2)' },
  PULL_SUCCESS:   { color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)' },
  PULL_FAILED:    { color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)' },
  EXPORT_START:   { color: 'var(--purple-500)', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.2)' },
  EXPORT_SUCCESS: { color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)' },
  EXPORT_FAILED:  { color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)' },
  PLATFORM_CHANGED: { color: 'var(--yellow-500)', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)' },
  LOCAL_DELETE_START:   { color: 'var(--orange-500)', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.2)' },
  LOCAL_DELETE_SUCCESS: { color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)' },
  LOCAL_DELETE_FAILED:  { color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)' },
  LOCAL_EXPORT_START:   { color: 'var(--purple-500)', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.2)' },
  LOCAL_EXPORT_SUCCESS: { color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)' },
  LOCAL_EXPORT_FAILED:  { color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)' },
}

export const ACTION_LABEL_KEYS: Record<string, string> = {
  CREATE:         'action.created',
  UPDATE:         'action.updated',
  PULL_START:     'action.pulling',
  PULL_SUCCESS:   'action.success',
  PULL_FAILED:    'action.failed',
  EXPORT_START:   'action.exporting',
  EXPORT_SUCCESS: 'action.exported',
  EXPORT_FAILED:  'action.failed',
  PLATFORM_CHANGED: 'action.changed',
  LOCAL_DELETE_START:   'action.localDeleting',
  LOCAL_DELETE_SUCCESS: 'action.localDeleted',
  LOCAL_DELETE_FAILED:  'action.failed',
  LOCAL_EXPORT_START:   'action.exporting',
  LOCAL_EXPORT_SUCCESS: 'action.exported',
  LOCAL_EXPORT_FAILED:  'action.failed',
}

export const PAGE_SIZE = 20

export const ALL_ACTIONS_KEYS = [
  { value: 'all', labelKey: 'logs.allActions' },
  ...Object.keys(ACTION_META_LABELS).map(value => ({ value, labelKey: ACTION_LABEL_KEYS[value] }))
]

export const PLATFORM_OPTIONS_KEYS = [
  { value: 'all', labelKey: 'logs.allPlatforms' },
  { value: 'linux/amd64', labelKey: 'platform.amd64' },
  { value: 'linux/arm64', labelKey: 'platform.arm64' },
]