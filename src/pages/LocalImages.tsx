import { useState, useEffect, useCallback } from 'react'
import { Trash2, Download, RefreshCw } from 'lucide-react'
import { localImagesApi } from '../api'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import { useNotification } from '../context/NotificationContext'
import { useConfig } from '../context/ConfigContext'
import { RegistryIcon, PlatformBadge } from '../components/ImageComponents'
import { ExpandableText } from '../components/LogComponents'
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
  const [exporting, setExporting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const fetchImages = useCallback(async (isInitial = false) => {
    if (isInitial) {
      addNotification('info', 'Loading local images...')
    }
    try {
      const res = await localImagesApi.list()
      const uniqueImages: LocalImage[] = []
      const seenIds = new Set<string>()
      for (const img of res.data || []) {
        if (!seenIds.has(img.id)) {
          seenIds.add(img.id)
          uniqueImages.push(img)
        }
      }
      setImages(uniqueImages)
    } catch (err: any) {
      if (isInitial) {
        const errorMsg = err.response?.data?.error || err.message || 'Unknown error'
        addNotification('error', `Failed to load local images: ${errorMsg}`)
        showToast('error', t('localImages.loadFailed'))
      }
    } finally {
      setLoading(false)
    }
  }, [showToast, t, addNotification])

  useEffect(() => {
    fetchImages(true)
    const interval = setInterval(() => fetchImages(false), 30000)
    return () => clearInterval(interval)
  }, [fetchImages])

  const handleDelete = async (imageId: string, repository: string, arch: string) => {
    if (deleting) return
    if (!window.confirm(t('localImages.deleteConfirm').replace('{image}', repository))) {
      return
    }
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
              fontSize: '12px',
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
      ) : images.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('localImages.table.image')}</th>
                <th>{t('localImages.table.arch')}</th>
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
                    <PlatformBadge platform={`linux/${img.architecture}`} />
                  </td>
                  <td>
                    <span style={{
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                    }}>
                      {formatSize(img.size)}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
                    {formatDate(img.created_at)}
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleExport(img.id, `${img.repository}:${img.tag}`, img.architecture)}
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
                        onClick={() => handleDelete(img.id, `${img.repository}:${img.tag}`, img.architecture)}
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
              <div className="icon-cell">
                <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.186v1.887a.185.185 0 00.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.186.186 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.184.184 0 00-.184.186v1.887c0 .102.083.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" fill="#2496ED"/>
                </svg>
              </div>
            </div>
            <div className="empty-state-content">
              <div className="empty-state-title">{t('localImages.empty.title')}</div>
              <div className="empty-state-description">
                {t('localImages.empty.desc')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}