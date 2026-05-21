import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Square, RotateCw, Trash2, RefreshCw, Terminal, Container as ContainerIcon } from 'lucide-react'
import { containersApi } from '../api'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import type { Container as ContainerType, ContainerPort } from '../types'

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPorts(ports: ContainerPort[]): string {
  if (!ports || ports.length === 0) return '-'
  return ports.map(p => {
    if (p.public_port) {
      return `${p.ip}:${p.public_port}:${p.private_port}/${p.type}`
    }
    return `${p.private_port}/${p.type}`
  }).join(', ')
}

export default function Containers() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const { addNotification } = useNotification()
  const [containers, setContainers] = useState<ContainerType[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(true)
  const [logModal, setLogModal] = useState<{ id: string; name: string; logs: string } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string; name: string } | null>(null)
  const isFetchingRef = useRef(false)

  const fetchContainers = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (isInitial) {
      addNotification('info', 'Loading containers...')
    }
    try {
      const res = await containersApi.list(showAll)
      setContainers(res.data || [])
      if (isInitial) {
        addNotification('success', `Loaded ${(res.data || []).length} containers`)
      }
    } catch (err: any) {
      if (isInitial) {
        const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
        addNotification('error', `Failed to load containers: ${errorMsg}`)
        showToast('error', t('containers.loadFailed'))
      }
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [showToast, t, addNotification, showAll])

  useEffect(() => {
    fetchContainers(true)
    const interval = setInterval(() => {
      fetchContainers(false)
    }, 15000)
    return () => clearInterval(interval)
  }, [fetchContainers])

  const handleStart = async (id: string, name: string) => {
    if (acting) return
    setActing(id)
    addNotification('info', `Starting ${name}...`)
    try {
      await containersApi.start(id)
      addNotification('success', `Started ${name}`)
      await fetchContainers(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to start ${name}: ${errorMsg}`)
      showToast('error', t('containers.startFailed'))
    } finally {
      setActing(null)
    }
  }

  const handleStop = async (id: string, name: string) => {
    if (acting) return
    setActing(id)
    addNotification('info', `Stopping ${name}...`)
    try {
      await containersApi.stop(id)
      addNotification('success', `Stopped ${name}`)
      await fetchContainers(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to stop ${name}: ${errorMsg}`)
      showToast('error', t('containers.stopFailed'))
    } finally {
      setActing(null)
    }
  }

  const handleRestart = async (id: string, name: string) => {
    if (acting) return
    setActing(id)
    addNotification('info', `Restarting ${name}...`)
    try {
      await containersApi.restart(id)
      addNotification('success', `Restarted ${name}`)
      await fetchContainers(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to restart ${name}: ${errorMsg}`)
      showToast('error', t('containers.restartFailed'))
    } finally {
      setActing(null)
    }
  }

  const handleRemove = (id: string, name: string) => {
    if (acting) return
    setConfirmDialog({ open: true, id, name })
  }

  const handleConfirmRemove = async () => {
    if (!confirmDialog) return
    const { id, name } = confirmDialog
    setConfirmDialog(null)
    setActing(id)
    addNotification('info', `Removing ${name}...`)
    try {
      await containersApi.remove(id, true)
      addNotification('success', `Removed ${name}`)
      await fetchContainers(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to remove ${name}: ${errorMsg}`)
      showToast('error', t('containers.removeFailed'))
    } finally {
      setActing(null)
    }
  }

  const handleViewLogs = async (id: string, name: string) => {
    try {
      const res = await containersApi.logs(id, 200)
      setLogModal({ id, name, logs: res.data.logs || '' })
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to get logs for ${name}: ${errorMsg}`)
    }
  }

  const getStateBadge = (state: string) => {
    const colors: Record<string, string> = {
      running: 'var(--green-500)',
      exited: 'var(--text-muted)',
      paused: 'var(--orange-500)',
      restarting: 'var(--blue-500)',
      dead: 'var(--red-500)',
      created: 'var(--purple-500)',
    }
    return (
      <span style={{
        background: `${colors[state] || colors.exited}15`,
        color: colors[state] || colors.exited,
        borderRadius: 'var(--radius-card)',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 500,
        textTransform: 'capitalize',
      }}>
        {state}
      </span>
    )
  }

  return (
    <div className="content-center">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>{t('containers.title')}</h1>
          {containers.length > 0 && (
            <span style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-tertiary)',
              borderRadius: 'var(--radius-card)',
              padding: '2px 8px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {containers.length}
            </span>
          )}
        </div>
        <div className="page-header-actions">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showAll}
              onChange={e => setShowAll(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {t('containers.showAll')}
          </label>
          <button className="btn btn-secondary" onClick={() => fetchContainers(true)} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {t('containers.refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
              {t('containers.loading')}
            </div>
          </div>
        </div>
      ) : containers.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('containers.table.name')}</th>
                <th>{t('containers.table.image')}</th>
                <th>{t('containers.table.status')}</th>
                <th>{t('containers.table.ports')}</th>
                <th>{t('containers.table.created')}</th>
                <th style={{ textAlign: 'right' }}>{t('containers.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container) => (
                <tr key={container.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-card)',
                      }}>
                        <ContainerIcon size={18} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {container.names[0] || container.id.slice(0, 12)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {container.id.slice(0, 12)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {container.image}
                  </td>
                  <td>
                    {getStateBadge(container.state)}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatPorts(container.ports)}
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '13.5px' }}>
                    {formatDate(container.created)}
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleStart(container.id, container.names[0] || container.id.slice(0, 12))}
                        disabled={acting === container.id || container.state === 'running'}
                        title={t('containers.start')}
                      >
                        {acting === container.id ? (
                          <RefreshCw size={13} className="spin" />
                        ) : (
                          <Play size={13} />
                        )}
                      </button>
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={() => handleStop(container.id, container.names[0] || container.id.slice(0, 12))}
                        disabled={acting === container.id || container.state !== 'running'}
                        title={t('containers.stop')}
                        style={{ background: 'var(--orange-500)', color: 'white', border: 'none' }}
                      >
                        {acting === container.id ? (
                          <RefreshCw size={13} className="spin" />
                        ) : (
                          <Square size={13} />
                        )}
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleRestart(container.id, container.names[0] || container.id.slice(0, 12))}
                        disabled={acting === container.id}
                        title={t('containers.restart')}
                      >
                        {acting === container.id ? (
                          <RefreshCw size={13} className="spin" />
                        ) : (
                          <RotateCw size={13} />
                        )}
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleViewLogs(container.id, container.names[0] || container.id.slice(0, 12))}
                        title={t('containers.logs')}
                        style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                      >
                        <Terminal size={13} />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemove(container.id, container.names[0] || container.id.slice(0, 12))}
                        disabled={acting === container.id}
                        title={t('containers.remove')}
                      >
                        {acting === container.id ? (
                          <RefreshCw size={13} className="spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <ContainerIcon size={48} style={{ color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {t('containers.empty.title')}
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {t('containers.empty.desc')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {logModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setLogModal(null)}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-card)',
            padding: '24px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
                {t('containers.logsTitle')} — {logModal.name}
              </h2>
              <button className="btn btn-sm btn-ghost" onClick={() => setLogModal(null)}>
                ✕
              </button>
            </div>
            <pre style={{
              flex: 1,
              overflow: 'auto',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-card)',
              padding: '12px',
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: '200px',
            }}>
              {logModal.logs || t('containers.noLogs')}
            </pre>
          </div>
        </div>
      )}

      {confirmDialog?.open && (
        <ConfirmDialog
          isOpen={true}
          title={t('modal.confirmDelete')}
          message={t('containers.deleteConfirm').replace('{container}', confirmDialog.name)}
          confirmText={t('containers.remove')}
          cancelText={t('modal.cancel')}
          onConfirm={handleConfirmRemove}
          onCancel={() => setConfirmDialog(null)}
          variant="danger"
        />
      )}
    </div>
  )
}
