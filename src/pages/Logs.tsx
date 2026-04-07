import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FileText, Search, Clock, Package,
  AlertCircle, CheckCircle, Loader2, RefreshCw,
} from 'lucide-react'
import { imagesApi } from '../api'
import { useImages } from '../hooks/useImages'
import Select from '../components/Select'
import type { Image, ImageLog } from '../types'

const actionColors: Record<string, string> = {
  CREATE: 'var(--blue-500)',
  UPDATE: 'var(--yellow-500)',
  PULL_START: 'var(--purple-500)',
  PULL_SUCCESS: 'var(--green-500)',
  PULL_FAILED: 'var(--red-500)',
  EXPORT_START: 'var(--purple-500)',
  EXPORT_SUCCESS: 'var(--green-500)',
  EXPORT_FAILED: 'var(--red-500)',
}

const actionLabels: Record<string, string> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  PULL_START: 'Pull Started',
  PULL_SUCCESS: 'Pull Success',
  PULL_FAILED: 'Pull Failed',
  EXPORT_START: 'Export Started',
  EXPORT_SUCCESS: 'Export Success',
  EXPORT_FAILED: 'Export Failed',
}

export default function Logs() {
  const [searchParams] = useSearchParams()
  const imageIdFromUrl = searchParams.get('imageId')
  const { images } = useImages()
  
  const [logs, setLogs] = useState<ImageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedImageId, setSelectedImageId] = useState<string>(imageIdFromUrl || 'all')
  const [selectedAction, setSelectedAction] = useState<string>('all')

  useEffect(() => {
    if (imageIdFromUrl) {
      setSelectedImageId(imageIdFromUrl)
    }
  }, [imageIdFromUrl])

  useEffect(() => {
    fetchLogs()
  }, [selectedImageId])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      if (selectedImageId === 'all') {
        const allLogs: ImageLog[] = []
        for (const img of images) {
          const res = await imagesApi.logs(img.id)
          allLogs.push(...(res.data || []))
        }
        allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setLogs(allLogs)
      } else {
        const res = await imagesApi.logs(parseInt(selectedImageId))
        const data = res.data || []
        data.sort((a: ImageLog, b: ImageLog) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setLogs(data)
      }
    } catch (err) {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAction = selectedAction === 'all' || log.action === selectedAction
    return matchesSearch && matchesAction
  })

  const getImageInfo = (imageId: number): Image | undefined => {
    return images.find(img => img.id === imageId)
  }

  const uniqueActions = Array.from(new Set(logs.map(log => log.action)))

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>Logs</h1>
          {logs.length > 0 && (
            <span style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-tertiary)',
              borderRadius: '20px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              {filteredLogs.length}
            </span>
          )}
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="content-box">
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>
          
          <Select
            value={selectedImageId}
            onChange={setSelectedImageId}
            options={[
              { value: 'all', label: 'All Images' },
              ...images.map(img => ({ value: String(img.id), label: `${img.name}:${img.tag}` }))
            ]}
            placeholder="Select image"
            style={{ width: '200px' }}
          />

          <Select
            value={selectedAction}
            onChange={setSelectedAction}
            options={[
              { value: 'all', label: 'All Actions' },
              ...uniqueActions.map(action => ({ value: action, label: actionLabels[action] || action }))
            ]}
            placeholder="Select action"
            style={{ width: '160px' }}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="spin" />
            <span style={{ marginLeft: '10px' }}>Loading logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={44} strokeWidth={1.25} />
            </div>
            <div className="empty-state-content">
              <div className="empty-state-title">No logs found</div>
              <div className="empty-state-description">
                {searchQuery || selectedAction !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Logs will appear here as images are processed'}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredLogs.map((log) => {
              const img = getImageInfo(log.image_id)
              return (
                <div 
                  key={log.id} 
                  style={{ 
                    padding: '14px 16px', 
                    background: 'var(--bg-tertiary)', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border-color)',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--accent-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Package size={15} style={{ color: 'var(--purple-400)' }} />
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: 600, 
                          color: actionColors[log.action] || 'var(--text-primary)',
                        }}>
                          {actionLabels[log.action] || log.action}
                        </span>
                        {img && (
                          <span style={{
                            fontSize: '12px',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-secondary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                          }}>
                            {img.name}:{img.tag}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {new Date(log.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {log.message}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}