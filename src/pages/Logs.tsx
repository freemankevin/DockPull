import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw, ChevronLeft, ChevronRight, FileText, ChevronDown, ChevronUp, Copy, CheckCircle, Plus, AlertCircle, Clock, ArrowRightLeft, Download, ArrowRightFromLine } from 'lucide-react'
import { imagesApi } from '../api'
import { useImages } from '../hooks/useImages'
import type { Image, ImageLog } from '../types'

const ACTION_META: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  CREATE:         { label: 'Created',        color: 'var(--blue-500)',   bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.2)',  icon: <Plus size={11} /> },
  UPDATE:         { label: 'Updated',        color: 'var(--yellow-500)', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)',  icon: <Clock size={11} /> },
  PULL_START:     { label: 'Pulling',        color: 'var(--purple-500)', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.2)',  icon: <Download size={11} /> },
  PULL_SUCCESS:   { label: 'Success',        color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)',   icon: <CheckCircle size={11} /> },
  PULL_FAILED:    { label: 'Failed',         color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)',   icon: <AlertCircle size={11} /> },
  EXPORT_START:   { label: 'Exporting',      color: 'var(--purple-500)', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.2)',  icon: <ArrowRightFromLine size={11} /> },
  EXPORT_SUCCESS: { label: 'Exported',       color: 'var(--green-500)',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.2)',   icon: <CheckCircle size={11} /> },
  EXPORT_FAILED:  { label: 'Failed',         color: 'var(--red-500)',    bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)',   icon: <AlertCircle size={11} /> },
  PLATFORM_CHANGED: { label: 'Changed',     color: 'var(--yellow-500)', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)',  icon: <ArrowRightLeft size={11} /> },
}

const PAGE_SIZE = 20

const ALL_ACTIONS = [
  { value: 'all', label: 'All Actions' },
  ...Object.entries(ACTION_META).map(([value, { label }]) => ({ value, label }))
]

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] || { 
    label: action, 
    color: 'var(--text-secondary)', 
    bg: 'var(--bg-tertiary)', 
    border: 'var(--border-color)',
    icon: null 
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 500,
      color: meta.color, background: meta.bg,
      border: `1px solid ${meta.border}`,
      whiteSpace: 'nowrap', flexShrink: 0,
      lineHeight: 1.5,
    }}>
      {meta.icon}
      {meta.label}
    </span>
  )
}

function FilterChip({
  label, value, options, onChange
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', height: '32px',
          border: value !== 'all' ? '1px solid var(--purple-600)' : '1px solid var(--border-color)',
          borderRadius: '6px', cursor: 'pointer',
          background: value !== 'all' ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
          color: value !== 'all' ? 'var(--purple-400)' : 'var(--text-secondary)',
          fontSize: '13px', fontWeight: 400,
          whiteSpace: 'nowrap', transition: 'all .12s',
        }}
      >
        {value === 'all' ? label : selected?.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: .5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .12s' }}>
          <path d="M5 7L1 3h8z"/>
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            minWidth: '200px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)', borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden',
            animation: 'fadeIn .12s ease',
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                color: opt.value === value ? 'var(--purple-400)' : 'var(--text-primary)',
                background: opt.value === value ? 'var(--accent-bg)' : 'transparent',
                transition: 'background .1s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
              onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpandableText({ 
  text, 
  expandKey, 
  expandedLogs, 
  setExpandedLogs,
  fontSize = '13px',
  fontFamily = 'inherit',
  color = 'var(--text-secondary)',
  showCopy = false
}: {
  text: string
  expandKey: string
  expandedLogs: Set<string>
  setExpandedLogs: React.Dispatch<React.SetStateAction<Set<string>>>
  fontSize?: string
  fontFamily?: string
  color?: string
  showCopy?: boolean
}) {
  const isExpanded = expandedLogs.has(expandKey)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth)
      }
    }
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [text])
  
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(expandedLogs)
    if (isExpanded) {
      newSet.delete(expandKey)
    } else {
      newSet.add(expandKey)
    }
    setExpandedLogs(newSet)
  }
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: isExpanded ? 'flex-start' : 'center', 
      gap: '4px',
      minWidth: 0,
    }}>
      <span 
        ref={textRef}
        style={{
          fontSize, fontFamily, color,
          overflow: isExpanded ? 'visible' : 'hidden',
          textOverflow: isExpanded ? 'clip' : 'ellipsis',
          whiteSpace: isExpanded ? 'normal' : 'nowrap',
          wordBreak: isExpanded ? 'break-word' : 'normal',
          flex: '1',
          minWidth: 0,
          lineHeight: 1.4,
        }}
        title={isExpanded ? undefined : text}
      >
        {text}
        {showCopy && (
          <button
            onClick={handleCopy}
            style={{
              border: 'none',
              background: copied ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              cursor: 'pointer',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              color: copied ? 'var(--green-500)' : 'var(--text-muted)',
              marginLeft: '4px',
              verticalAlign: 'middle',
              borderRadius: '3px',
            }}
            title={copied ? 'Copied!' : 'Copy message'}
          >
            {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          </button>
        )}
      </span>
      {isOverflowing && !isExpanded && (
        <button
          onClick={toggleExpand}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-muted)',
            flexShrink: 0,
            lineHeight: 1,
          }}
          title="Expand"
        >
          <ChevronDown size={12} />
        </button>
      )}
      {isExpanded && (
        <button
          onClick={toggleExpand}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-muted)',
            flexShrink: 0,
            lineHeight: 1,
          }}
          title="Collapse"
        >
          <ChevronUp size={12} />
        </button>
      )}
    </div>
  )
}

export default function Logs() {
  const [searchParams] = useSearchParams()
  const { images } = useImages()

  const [logs, setLogs] = useState<ImageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImageKey, setSelectedImageKey] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  useEffect(() => {
    const imageIdFromUrl = searchParams.get('imageId')
    if (imageIdFromUrl) {
      const img = images.find(i => String(i.id) === imageIdFromUrl)
      if (img) setSelectedImageKey(`${img.name}:${img.tag}`)
    }
  }, [searchParams, images])

  useEffect(() => {
    fetchLogs()
  }, [images.length])

  useEffect(() => { setPage(0) }, [searchQuery, selectedAction, selectedImageKey, selectedPlatform])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const all: ImageLog[] = []
      for (const img of images) {
        const res = await imagesApi.logs(img.id)
        all.push(...(res.data || []))
      }
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setLogs(all)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const getImageInfo = (id: number): Image | undefined => images.find(img => img.id === id)

const PLATFORM_OPTIONS = [
  { value: 'all', label: 'All Platforms' },
  { value: 'linux/amd64', label: 'AMD64' },
  { value: 'linux/arm64', label: 'ARM64' },
]

const uniqueImageKeys = [...new Set(images.map(img => `${img.name}:${img.tag}`))]
const imageOptions = [
  { value: 'all', label: 'All Images' },
  ...uniqueImageKeys.map(key => ({ value: key, label: key }))
]

const filtered = logs.filter(log => {
  const q = searchQuery.toLowerCase()
  const matchSearch = !q || log.message.toLowerCase().includes(q) || log.action.toLowerCase().includes(q)
  const matchAction = selectedAction === 'all' || log.action === selectedAction
  const img = getImageInfo(log.image_id)
  const matchImage = selectedImageKey === 'all' || (img && `${img.name}:${img.tag}` === selectedImageKey)
  const matchPlatform = selectedPlatform === 'all' || (img && img.platform === selectedPlatform)
  return matchSearch && matchAction && matchImage && matchPlatform
})

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const formatTime = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="content-center">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>Logs</h1>
          {!loading && filtered.length > 0 && (
            <span style={{
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
              color: 'var(--text-tertiary)', borderRadius: '20px',
              padding: '2px 8px', fontSize: '12px', fontWeight: 500,
            }}>{filtered.length}</span>
          )}
        </div>
        <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading} style={{ height: '32px', padding: '0 12px', fontSize: '13px' }}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Bar — Railway style */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '12px', flexWrap: 'nowrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={13} style={{
            position: 'absolute', left: '10px', top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            style={{
              width: '100%', height: '32px',
              padding: '0 10px 0 30px',
              border: '1px solid var(--border-color)', borderRadius: '6px',
              background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
              fontSize: '13px', outline: 'none',
              transition: 'border-color .15s',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--purple-600)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
          />
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', flexShrink: 0 }} />

        {/* Filters on the right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <FilterChip label="All Platforms" value={selectedPlatform} options={PLATFORM_OPTIONS} onChange={setSelectedPlatform} />
          <FilterChip label="All Images" value={selectedImageKey} options={imageOptions} onChange={setSelectedImageKey} />
          <FilterChip label="All Actions" value={selectedAction} options={ALL_ACTIONS} onChange={setSelectedAction} />

          {(selectedImageKey !== 'all' || selectedAction !== 'all' || selectedPlatform !== 'all') && (
            <button
              onClick={() => { setSelectedImageKey('all'); setSelectedAction('all'); setSelectedPlatform('all') }}
              style={{
                padding: '5px 10px', height: '32px', fontSize: '12px',
                border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: 'transparent', color: 'var(--text-muted)',
                transition: 'color .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Log Table */}
      <div style={{
        border: '1px solid var(--border-color)',
        borderRadius: '10px', overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1.2fr 100px 2fr',
          gap: '12px',
          padding: '8px 16px',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '11.5px', fontWeight: 500,
          color: 'var(--text-muted)', letterSpacing: '0.04em',
          textTransform: 'uppercase',
          alignItems: 'center',
        }}>
          <span style={{ textAlign: 'left' }}>Time</span>
          <span style={{ textAlign: 'left' }}>Image</span>
          <span style={{ textAlign: 'left' }}>Action</span>
          <span style={{ textAlign: 'left' }}>Message</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <RefreshCw size={15} className="spin" />
            Loading logs...
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <FileText size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block', strokeWidth: 1.25 }} />
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>No logs found</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {searchQuery || selectedAction !== 'all' || selectedImageKey !== 'all' || selectedPlatform !== 'all'
                ? 'Try adjusting your filters'
                : 'Logs will appear here as images are processed'}
            </div>
          </div>
        ) : (
          paginated.map((log, i) => {
            const img = getImageInfo(log.image_id)
            const messageExpanded = expandedLogs.has(`${log.id}-message`)
            return (
              <div
                key={log.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1.2fr 100px 2fr',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: i < paginated.length - 1 ? '1px solid var(--border-color)' : 'none',
                  alignItems: (expandedLogs.has(`${log.id}-image`) || messageExpanded) ? 'flex-start' : 'center',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Time */}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {formatTime(log.created_at)}
                </span>

                {/* Image */}
                {img ? (
                  <ExpandableText
                    text={`${img.name}:${img.tag}`}
                    expandKey={`${log.id}-image`}
                    expandedLogs={expandedLogs}
                    setExpandedLogs={setExpandedLogs}
                    fontSize="12px"
                    fontFamily="var(--font-mono)"
                    color="var(--text-tertiary)"
                    showCopy={false}
                  />
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                )}

                {/* Action badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <ActionBadge action={log.action} />
                </div>

                {/* Message */}
                <ExpandableText
                  text={log.message}
                  expandKey={`${log.id}-message`}
                  expandedLogs={expandedLogs}
                  setExpandedLogs={setExpandedLogs}
                  showCopy={true}
                />
              </div>
            )
          })
        )}

        {/* Pagination — Railway style */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
          }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px',
                  border: 'none', borderRadius: '5px',
                  background: 'transparent', cursor: page === 0 ? 'not-allowed' : 'pointer',
                  color: page === 0 ? 'var(--text-muted)' : 'var(--purple-500)',
                  opacity: page === 0 ? .4 : 1,
                  transition: 'all .12s',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px',
                  border: 'none', borderRadius: '5px',
                  background: 'transparent', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  color: page >= totalPages - 1 ? 'var(--text-muted)' : 'var(--purple-500)',
                  opacity: page >= totalPages - 1 ? .4 : 1,
                  transition: 'all .12s',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
