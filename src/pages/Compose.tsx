import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Play, Square, ChevronDown, ChevronUp, FolderGit } from 'lucide-react'
import { composeApi } from '../api'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import type { ComposeProject, ComposeService } from '../types'

export default function Compose() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const { addNotification } = useNotification()
  const [projects, setProjects] = useState<ComposeProject[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [scanPath, setScanPath] = useState('.')
  const isFetchingRef = useRef(false)

  const fetchProjects = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (isInitial) {
      addNotification('info', 'Loading compose projects...')
    }
    try {
      const res = await composeApi.list(scanPath)
      setProjects(res.data || [])
      if (isInitial) {
        addNotification('success', `Loaded ${(res.data || []).length} compose projects`)
      }
    } catch (err: any) {
      if (isInitial) {
        const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
        addNotification('error', `Failed to load compose projects: ${errorMsg}`)
        showToast('error', t('compose.loadFailed'))
      }
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [showToast, t, addNotification, scanPath])

  useEffect(() => {
    fetchProjects(true)
    const interval = setInterval(() => {
      fetchProjects(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchProjects])

  const toggleExpand = (name: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleUp = async (project: ComposeProject) => {
    if (acting) return
    setActing(project.path)
    addNotification('info', `Starting ${project.name}...`)
    try {
      await composeApi.up(project.path)
      addNotification('success', `Started ${project.name}`)
      showToast('success', t('compose.upSuccess'))
      await fetchProjects(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to start ${project.name}: ${errorMsg}`)
      showToast('error', t('compose.upFailed'))
    } finally {
      setActing(null)
    }
  }

  const handleDown = async (project: ComposeProject) => {
    if (acting) return
    setActing(project.path)
    addNotification('info', `Stopping ${project.name}...`)
    try {
      await composeApi.down(project.path)
      addNotification('success', `Stopped ${project.name}`)
      showToast('success', t('compose.downSuccess'))
      await fetchProjects(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to stop ${project.name}: ${errorMsg}`)
      showToast('error', t('compose.downFailed'))
    } finally {
      setActing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: 'var(--green-500)',
      stopped: 'var(--text-muted)',
      partial: 'var(--orange-500)',
      unknown: 'var(--text-muted)',
    }
    return (
      <span style={{
        background: `${colors[status] || colors.unknown}15`,
        color: colors[status] || colors.unknown,
        borderRadius: 'var(--radius-card)',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 500,
        textTransform: 'capitalize',
      }}>
        {status}
      </span>
    )
  }

  return (
    <div className="content-center">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>{t('compose.title')}</h1>
          {projects.length > 0 && (
            <span style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-tertiary)',
              borderRadius: 'var(--radius-card)',
              padding: '2px 8px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {projects.length}
            </span>
          )}
        </div>
        <div className="page-header-actions">
          <input
            type="text"
            value={scanPath}
            onChange={e => setScanPath(e.target.value)}
            onBlur={() => fetchProjects(true)}
            placeholder={t('compose.scanPath')}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              width: '200px',
            }}
          />
          <button className="btn btn-secondary" onClick={() => fetchProjects(true)} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {t('compose.refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
              {t('compose.loading')}
            </div>
          </div>
        </div>
      ) : projects.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>{t('compose.table.name')}</th>
                <th>{t('compose.table.path')}</th>
                <th>{t('compose.table.status')}</th>
                <th>{t('compose.table.services')}</th>
                <th style={{ textAlign: 'right' }}>{t('compose.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <>
                  <tr key={project.name}>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => toggleExpand(project.name)}
                        style={{ padding: '4px' }}
                      >
                        {expandedRows.has(project.name) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderGit size={18} style={{ color: 'var(--text-muted)' }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {project.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {project.path}
                    </td>
                    <td>{getStatusBadge(project.status)}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {project.services?.length || 0}
                    </td>
                    <td>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleUp(project)}
                          disabled={acting === project.path || project.status === 'running'}
                          title={t('compose.up')}
                        >
                          {acting === project.path ? (
                            <RefreshCw size={13} className="spin" />
                          ) : (
                            <Play size={13} />
                          )}
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDown(project)}
                          disabled={acting === project.path || project.status === 'stopped'}
                          title={t('compose.down')}
                        >
                          {acting === project.path ? (
                            <RefreshCw size={13} className="spin" />
                          ) : (
                            <Square size={13} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(project.name) && project.services && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, background: 'var(--bg-tertiary)' }}>
                        <div style={{ padding: '12px 16px' }}>
                          <table style={{ width: '100%' }}>
                            <thead>
                              <tr>
                                <th style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left', padding: '4px 8px' }}>{t('compose.service.name')}</th>
                                <th style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left', padding: '4px 8px' }}>{t('compose.service.image')}</th>
                                <th style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left', padding: '4px 8px' }}>{t('compose.service.status')}</th>
                                <th style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'left', padding: '4px 8px' }}>{t('compose.service.ports')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {project.services.map((svc: ComposeService, idx: number) => (
                                <tr key={idx}>
                                  <td style={{ fontSize: '13px', padding: '4px 8px', color: 'var(--text-primary)' }}>{svc.name}</td>
                                  <td style={{ fontSize: '13px', padding: '4px 8px', color: 'var(--text-secondary)' }}>{svc.image}</td>
                                  <td style={{ fontSize: '13px', padding: '4px 8px' }}>
                                    <span style={{
                                      color: svc.state === 'running' ? 'var(--green-500)' : 'var(--text-muted)',
                                      fontSize: '12px',
                                    }}>
                                      {svc.state}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '13px', padding: '4px 8px', color: 'var(--text-secondary)' }}>{svc.ports || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <FolderGit size={48} style={{ color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {t('compose.empty.title')}
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {t('compose.empty.desc')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
