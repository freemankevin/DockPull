import { useState, useEffect } from 'react'
import { Trash2, Download, RefreshCw, CheckCircle, Plus } from 'lucide-react'
import { useImages } from '../hooks/useImages'
import { useConfig } from '../context/ConfigContext'
import { useNotification } from '../context/NotificationContext'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { imagesApi } from '../api'
import { detectRegistry, getShortName, parseImageName } from '../utils/imageUtils'
import { RegistryIcon, TokenRegistryIcon, CopyButton, PlatformBadge, StatusBadge } from '../components/ImageComponents'
import ImageModal from '../components/ImageModal'

export default function Images() {
  const { addNotification } = useNotification()
  const { showToast } = useToast()
  const { t } = useLanguage()
  const { images, loading, createImage, deleteImage, pullImage, exportImage } = useImages(addNotification)
  const { config } = useConfig()
  const [showModal, setShowModal] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    platforms: ['linux/amd64', 'linux/arm64'],
    is_auto_export: false,
  })
  const [batchText, setBatchText] = useState('')

  useEffect(() => {
    if (config?.default_platform) {
      const platforms = config.default_platform.split(',').filter(p => p.trim())
      if (platforms.length > 0) {
        setFormData(prev => ({ ...prev, platforms }))
      }
    }
  }, [config])

  const handlePlatformToggle = (platform: string) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      let platformsToPull = formData.platforms.length > 0 
        ? formData.platforms 
        : ['linux/amd64', 'linux/arm64']

      const firstImage = batchMode ? batchText.split('\n')[0].trim() : formData.fullName
      
      if (firstImage) {
        const { name } = parseImageName(firstImage)
        try {
          const authRes = await imagesApi.checkAuth(name)
          const authData = authRes.data
          if (authData.needs_auth && !authData.has_auth) {
            showToast('warning', t('toast.authRequired').replace('{registry}', authData.registry))
            addNotification('warning', authData.suggestion || `Please configure authentication for ${authData.registry} in Settings > Tokens`)
          }
        } catch {
        }
      }

      if (firstImage && platformsToPull.includes('linux/arm64')) {
        const { name, tag } = parseImageName(firstImage)
        try {
          const checkRes = await imagesApi.checkPlatforms(name, tag)
          const supportedPlatforms = checkRes.data.platforms || []
          if (!supportedPlatforms.includes('linux/arm64')) {
            showToast('info', t('toast.imageNoArm64'))
            platformsToPull = platformsToPull.filter(p => p !== 'linux/arm64')
          }
        } catch {
          showToast('info', t('toast.unableVerify'))
        }
      }

      let addedCount = 0
      let duplicateCount = 0
      
      if (platformsToPull.length === 0) {
        platformsToPull = ['linux/amd64']
      }

      if (batchMode) {
        const lines = batchText.split('\n').filter(line => line.trim())
        for (const line of lines) {
          const { name, tag } = parseImageName(line)
          for (const platform of platformsToPull) {
            const result = await createImage({ name, tag, platform, is_auto_export: formData.is_auto_export })
            if (result.success) {
              addedCount++
            } else if (result.duplicate) {
              duplicateCount++
            }
          }
        }
        if (duplicateCount > 0) {
          showToast('warning', t('toast.tasksSkipped').replace('{count}', String(duplicateCount)).replace('{added}', String(addedCount)))
        } else {
          showToast('success', t('toast.tasksAdded').replace('{count}', String(addedCount)))
        }
      } else {
        const { name, tag } = parseImageName(formData.fullName)
        for (const platform of platformsToPull) {
          const result = await createImage({ name, tag, platform, is_auto_export: formData.is_auto_export })
          if (result.success) {
            addedCount++
          } else if (result.duplicate) {
            duplicateCount++
          }
        }
        if (duplicateCount > 0) {
          showToast('warning', t('toast.tasksSkipped').replace('{count}', String(duplicateCount)).replace('{added}', String(addedCount)))
        } else {
          showToast('success', t('toast.tasksAdded').replace('{count}', String(addedCount)))
        }
      }

      setShowModal(false)
      setFormData({ 
        fullName: '', 
        platforms: config?.default_platform?.split(',').filter(p => p.trim()) || ['linux/amd64', 'linux/arm64'], 
        is_auto_export: false 
      })
      setBatchText('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({ 
      fullName: '', 
      platforms: config?.default_platform?.split(',').filter(p => p.trim()) || ['linux/amd64', 'linux/arm64'], 
      is_auto_export: false 
    })
    setBatchText('')
    setBatchMode(false)
  }

  return (
    <div className="content-center">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>{t('images.title')}</h1>
          {images.length > 0 && (
            <span style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-tertiary)',
              borderRadius: '20px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: 500,
            }}>
              {images.length}
            </span>
          )}
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            {t('images.add')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state-wrapper">
          <div className="empty-state">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
              {t('images.loading')}
            </div>
          </div>
        </div>
      ) : images.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t('images.table.image')}</th>
                <th>{t('images.table.platform')}</th>
                <th>{t('images.table.status')}</th>
                <th>{t('images.table.retries')}</th>
                <th>{t('images.table.exportStatus')}</th>
                <th>{t('images.table.created')}</th>
                <th style={{ textAlign: 'right' }}>{t('images.table.actions')}</th>
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
                        <RegistryIcon registry={detectRegistry(img.name)} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="image-name" style={{
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                        }}>
                          {getShortName(img.name)}:{img.tag}
                        </span>
                        <CopyButton text={img.full_name} />
                      </div>
                    </div>
                  </td>
                  <td><PlatformBadge platform={img.platform} /></td>
                  <td><StatusBadge status={img.status} /></td>
                  <td>
                    <span style={{ color: img.retry_count > 0 ? 'var(--yellow-500)' : 'var(--text-muted)', fontSize: '13px' }}>
                      {img.retry_count}
                    </span>
                  </td>
                  <td>
                    {img.export_path ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--green-500)',
                        fontSize: '13px',
                      }}>
                        <CheckCircle size={12} />
                        {t('images.exported')}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
                    {new Date(img.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      {img.status === 'failed' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => pullImage(img.id)}
                          title={t('images.retry')}
                        >
                          <RefreshCw size={13} />
                          {t('images.retry')}
                        </button>
                      )}
                      {img.status === 'success' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => exportImage(img.id)}
                          title={t('images.download')}
                        >
                          <Download size={13} />
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteImage(img.id)}
                        title={t('images.delete')}
                      >
                        <Trash2 size={13} />
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
          <div className="empty-state clickable" onClick={() => setShowModal(true)}>
<div className="empty-state-icon-grid">
              <div className="icon-cell"><TokenRegistryIcon tokenId="dockerhub" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="ghcr" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="quay" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="acr" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="ecr" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="gar" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="harbor" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="tencentcloud" /></div>
              <div className="icon-cell"><TokenRegistryIcon tokenId="huaweicloud" /></div>
            </div>
            <div className="empty-state-content" onClick={(e) => e.stopPropagation()}>
              <div className="empty-state-title">{t('images.empty.title')}</div>
              <div className="empty-state-description">
                {t('images.empty.desc1')}<br />{t('images.empty.desc2')}
              </div>
              <div className="empty-state-tags">
                <span className="empty-state-tag">Docker Hub</span>
                <span className="empty-state-tag">ghcr.io</span>
                <span className="empty-state-tag">Quay.io</span>
                <span className="empty-state-tag">ACR</span>
                <span className="empty-state-tag">ECR</span>
                <span className="empty-state-tag">GAR</span>
                <span className="empty-state-tag">Harbor</span>
                <span className="empty-state-tag">TCR</span>
                <span className="empty-state-tag">SWR</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <ImageModal
        showModal={showModal}
        batchMode={batchMode}
        setBatchMode={setBatchMode}
        formData={formData}
        setFormData={setFormData}
        batchText={batchText}
        setBatchText={setBatchText}
        handleSubmit={handleSubmit}
        handleCloseModal={handleCloseModal}
        isSubmitting={isSubmitting}
        handlePlatformToggle={handlePlatformToggle}
      />
    </div>
  )
}