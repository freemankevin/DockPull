import { useState, useEffect, useCallback, useRef } from 'react'
import { Trash2, Download, RefreshCw, AlertTriangle, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { localImagesApi } from '../api'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import { useConfig } from '../context/ConfigContext'
import { RegistryIcon, PlatformBadge, TokenRegistryIcon } from '../components/ImageComponents'
import { ExpandableText } from '../components/LogComponents'
import ConfirmDialog from '../components/ConfirmDialog'
import { detectRegistry } from '../utils/imageUtils'
import type { LocalImage } from '../types'

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

export default function LocalImages() {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const { addNotification } = useNotification()
  const { config } = useConfig()
  const [images, setImages] = useState<LocalImage[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [busyMessage, setBusyMessage] = useState('')
  const [exporting, setExporting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; imageId: string; repository: string; arch: string } | null>(null)
  const hasShownInitialError = useRef(false)
  const isFetchingRef = useRef(false)

  const fetchImages = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (isInitial) {
      addNotification('info', 'Loading local images...')
    }
    try {
      const res = await localImagesApi.list()
      if (res.status === 202 && res.data?.status === 'busy') {
        setBusy(true)
        setBusyMessage(res.data.message || 'Container runtime is busy')
        setImages([])
        if (isInitial) {
          addNotification('warning', res.data.message || 'Container runtime is busy')
        }
        return
      }
      setBusy(false)
      setBusyMessage('')
      const uniqueImages: LocalImage[] = []
      const seenIds = new Set<string>()
      for (const img of res.data || []) {
        if (!seenIds.has(img.id)) {
          seenIds.add(img.id)
          uniqueImages.push(img)
        }
      }
      setImages(uniqueImages)
      if (isInitial) {
        addNotification('success', `Loaded ${uniqueImages.length} local images`)
      }
    } catch (err: any) {
      if (isInitial && !hasShownInitialError.current) {
        hasShownInitialError.current = true
        const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
        addNotification('error', `Failed to load local images: ${errorMsg}`)
        showToast('error', t('localImages.loadFailed'))
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

  const handleDelete = (imageId: string, repository: string, arch: string) => {
    if (deleting) return
    setConfirmDialog({ open: true, imageId, repository, arch })
  }

  const handleConfirmDelete = async () => {
    if (!confirmDialog) return
    const { imageId, repository, arch } = confirmDialog
    setConfirmDialog(null)
    setDeleting(imageId)
    addNotification('info', `Deleting ${repository} (${arch})...`)
    try {
      await localImagesApi.delete(imageId, true)
      addNotification('success', `Deleted ${repository} (${arch})`)
      await fetchImages(false)
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to delete ${repository}: ${errorMsg}`)
      showToast('error', t('localImages.deleteFailed'))
    } finally {
      setDeleting(null)
    }
  }

  const handleExport = async (imageId: string, repository: string, arch: string) => {
    if (exporting) return
    setExporting(imageId)
    addNotification('info', `Exporting ${repository} (${arch})...`)
    try {
      const res = await localImagesApi.export(imageId, config?.export_path)
      addNotification('success', `Exported ${repository} (${arch}) to ${res.data.path || config?.export_path}`)
      showToast('success', t('localImages.exportSuccess'))
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
      addNotification('error', `Failed to export ${repository}: ${errorMsg}`)
      showToast('error', t('localImages.exportFailed'))
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="content-center">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>{t('localImages.title')}</h1>
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
            {t('localImages.refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
              {t('localImages.loading')}
            </div>
          </div>
        </div>
      ) : busy ? (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <AlertTriangle size={48} style={{ color: 'var(--orange-500)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {t('localImages.busy.title')}
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {busyMessage}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  <Clock size={14} />
                  {t('localImages.busy.autoRetry')}
                </div>
              </div>
              <button 
                className="btn btn-secondary"
                onClick={() => fetchImages(true)}
                style={{ marginTop: '8px' }}
              >
                <RefreshCw size={14} />
                {t('localImages.busy.retryNow')}
              </button>
            </div>
          </div>
        </div>
      ) : images.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('localImages.table.image')}</th>
                <th>{t('localImages.table.platform')}</th>
                <th>{t('localImages.table.size')}</th>
                <th>{t('localImages.table.created')}</th>
                <th style={{ textAlign: 'right' }}>{t('localImages.table.actions')}</th>
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
                       }}>
                        <RegistryIcon registry={detectRegistry(img.repository)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', flex: '1', minWidth: 0 }}>
                        <ExpandableText
                          text={`${img.repository}:${img.tag}`}
                          expandKey={`${img.id}-image`}
                          expandedLogs={expandedRows}
                          setExpandedLogs={setExpandedRows}
                          fontSize="13px"
                          color="var(--text-primary)"
                          showCopy={true}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <PlatformBadge platform={img.platform.startsWith('linux/') ? img.platform : `linux/${img.platform}`} />
                  </td>
                  <td>
                    <span style={{
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                    }}>
                      {formatSize(img.size)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '13.5px' }}>
                    {formatDate(img.created_at)}
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleExport(img.id, `${img.repository}:${img.tag}`, img.platform)}
                        disabled={exporting === img.id}
                        title={t('localImages.export')}
                      >
                        {exporting === img.id ? (
                          <RefreshCw size={13} className="spin" />
                        ) : (
                          <Download size={13} />
                        )}
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(img.id, `${img.repository}:${img.tag}`, img.platform)}
                        disabled={deleting === img.id}
                        title={t('localImages.delete')}
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
            <div className="empty-state-icon-grid">
              {['dockerhub', 'ghcr', 'quay', 'acr', 'ecr', 'gar', 'harbor', 'tencentcloud', 'huaweicloud'].map((id) => (
                <div key={id} className="icon-cell">
                  <TokenRegistryIcon tokenId={id} />
                </div>
              ))}
            </div>
            <div className="empty-state-content">
              <div className="empty-state-title">{t('localImages.empty.title')}</div>
              <div className="empty-state-description">
                {t('localImages.empty.desc')}
              </div>
              <div className="empty-state-tags" style={{ marginBottom: '16px' }}>
                {['Docker Hub', 'GHCR', 'Quay', 'ACR', 'ECR', 'GAR'].map((tag) => (
                  <span key={tag} className="empty-state-tag">{tag}</span>
                ))}
              </div>
              <Link to="/images" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                {t('localImages.empty.action')}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {confirmDialog?.open && (
        <ConfirmDialog
          isOpen={true}
          title={t('modal.confirmDelete')}
          message={t('localImages.deleteConfirm').replace('{image}', confirmDialog.repository)}
          confirmText={t('localImages.delete')}
          cancelText={t('modal.cancel')}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDialog(null)}
          variant="danger"
        />
      )}
    </div>
  )
}