import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, RefreshCw, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { imagesApi } from '../api'
import { useImages } from '../hooks/useImages'
import type { Image, ImageLog } from '../types'
import { PAGE_SIZE, ALL_ACTIONS, PLATFORM_OPTIONS } from '../constants/logs'
import { ActionBadge, FilterChip, ExpandableText } from '../components/LogComponents'

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

      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '12px', flexWrap: 'nowrap',
      }}>
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

        <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', flexShrink: 0 }} />

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

      <div style={{
        border: '1px solid var(--border-color)',
        borderRadius: '10px', overflow: 'hidden',
        background: 'var(--bg-primary)',
      }}>
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
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {formatTime(log.created_at)}
                </span>

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

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                  <ActionBadge action={log.action} />
                </div>

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