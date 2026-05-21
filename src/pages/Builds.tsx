import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, RefreshCw, Hammer, FileText } from 'lucide-react'
import { buildsApi } from '../api'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import ConfirmDialog from '../components/ConfirmDialog'
import type { BuildTask } from '../types'

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  const mb = bytes / (1024 * 1024)
  if (gb >= 1) return `${gb.toFixed(2)} GB`
  return `${mb.toFixed(0)} MB`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Builds() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const { addNotification } = useNotification()
  const [images, setImages] = useState<BuildTask[]>([])
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [dockerfilePath, setDockerfilePath] = useState('')
  const [buildTag, setBuildTag] = useState('')
  const [buildArgs, setBuildArgs] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; imageId: string; repository: string } | null>(null)
  const isFetchingRef = useRef(false)

  const fetchImages = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (isInitial) {
      addNotification('info', 'Loading builds...')
    }
    try {
      const res = await buildsApi.list()
      const uniqueImages: BuildTask[] = []
      const seenIds = new Set<string>()
      for (const img of res.data || []) {
        if (!seenIds.has(img.id)) {
          seenIds.add(img.id)
          uniqueImages.push(img)
        }
      }
      setImages(uniqueImages)
      if (isInitial) {
        addNotification('success', `Loaded ${uniqueImages.length} builds`)
      }
    } catch (err: any) {
      if (isInitial) {
        const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
        addNotification('error', `Failed to load builds: ${errorMsg}`)
        showToast('error', t('builds.loadFailed'))
      }
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [showToast, t, addNotification])

  useEffect(() => {
    fetchImages(true)
    const interval = setInterval(() => {
      fetchImages(false)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchImages])

  const handleBuild = async () => {
    if (!dockerfilePath || !buildTag) return
    setBuilding(true)
    addNotification('info', `Building ${buildTag}...`)
    try {
      const args: Record<string, string> = {}
      if (buildArgs.trim()) {
        buildArgs.split('\n').forEach(line => {
          const idx = line.indexOf('=')
          if (idx > 0) {
            args[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
          }
        })
      }
      await buildsApi.build({ dockerfile_path: dockerfilePath, tag: buildTag, build_args: args })
      addNotification('success', `Built ${buildTag}`)
      showToast('success', t('builds.buildSuccess'))
      setShowModal(false)
      setDockerfilePath('')
      setBuildTag('')
      setBuildArgs('')
      await fetchImages(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to build ${buildTag}: ${errorMsg}`)
      showToast('error', t('builds.buildFailed'))
    } finally {
      setBuilding(false)
    }
  }

  const handleDelete = (imageId: string, repository: string) => {
    if (deleting) return
    setConfirmDialog({ open: true, imageId, repository })
  }

  const handleConfirmDelete = async () => {
    if (!confirmDialog) return
    const { imageId, repository } = confirmDialog
    setConfirmDialog(null)
    setDeleting(imageId)
    addNotification('info', `Deleting ${repository}...`)
    try {
      await buildsApi.delete(imageId, true)
      addNotification('success', `Deleted ${repository}`)
      await fetchImages(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to delete ${repository}: ${errorMsg}`)
      showToast('error', t('builds.deleteFailed'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="content-center">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>{t('builds.title')}</h1>
          {images.length > 0 && (
            <span style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-tertiary)',
              borderRadius: 'var(--radius-card)',
              padding: '2px 8px',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {images.length}
            </span>
          )}
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => fetchImages(true)} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            {t('builds.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Hammer size={16} />
            {t('builds.build')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
              {t('builds.loading')}
            </div>
          </div>
        </div>
      ) : images.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('builds.table.image')}</th>
                <th>{t('builds.table.platform')}</th>
                <th>{t('builds.table.size')}</th>
                <th>{t('builds.table.created')}</th>
                <th style={{ textAlign: 'right' }}>{t('builds.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.id}>
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
                        <FileText size={18} style={{ color: 'var(--text-muted)' }} />
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {img.repository}:{img.tag}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-card)',
                      padding: '2px 8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                    }}>
                      {img.platform}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                      {formatSize(img.size)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '13.5px' }}>
                    {formatDate(img.created_at)}
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(img.id, `${img.repository}:${img.tag}`)}
                        disabled={deleting === img.id}
                        title={t('builds.delete')}
                      >
                        {deleting === img.id ? (
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
              <Hammer size={48} style={{ color: 'var(--text-muted)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {t('builds.empty.title')}
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {t('builds.empty.desc')}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
                <Hammer size={14} />
                {t('builds.empty.action')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-card)',
            padding: '24px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
              {t('builds.modal.title')}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {t('builds.modal.dockerfilePath')}
                </label>
                <input
                  type="text"
                  value={dockerfilePath}
                  onChange={e => setDockerfilePath(e.target.value)}
                  placeholder={t('builds.modal.dockerfilePathPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {t('builds.modal.tag')}
                </label>
                <input
                  type="text"
                  value={buildTag}
                  onChange={e => setBuildTag(e.target.value)}
                  placeholder={t('builds.modal.tagPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {t('builds.modal.buildArgs')}
                </label>
                <textarea
                  value={buildArgs}
                  onChange={e => setBuildArgs(e.target.value)}
                  placeholder={t('builds.modal.buildArgsPlaceholder')}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-card)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                {t('modal.cancel')}
              </button>
              <button className="btn btn-primary" onClick={handleBuild} disabled={building || !dockerfilePath || !buildTag}>
                {building ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    {t('builds.modal.building')}
                  </>
                ) : (
                  <>
                    <Hammer size={14} />
                    {t('builds.modal.build')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog?.open && (
        <ConfirmDialog
          isOpen={true}
          title={t('modal.confirmDelete')}
          message={t('builds.deleteConfirm').replace('{image}', confirmDialog.repository)}
          confirmText={t('modal.confirm')}
          cancelText={t('modal.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDialog(null)}
          variant="danger"
        />
      )}
    </div>
  )
}
