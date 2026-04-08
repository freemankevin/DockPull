import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Download, RefreshCw, Clock,
  AlertCircle, CheckCircle, Loader2, Package,
  ChevronRight, FileText, Edit, Copy,
} from 'lucide-react'
import { useImages } from '../hooks/useImages'
import { useConfig } from '../hooks/useConfig'
import { useNotification } from '../context/NotificationContext'
import { imagesApi } from '../api'
import type { Image } from '../types'

const platformOptions = [
  { value: 'linux/amd64', label: 'Linux/AMD64' },
  { value: 'linux/arm64', label: 'Linux/ARM64' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback for older browsers
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
    <button
      onClick={handleCopy}
      className="copy-btn"
      title={copied ? 'Copied!' : 'Copy image name'}
      style={{
        padding: '4px',
        border: 'none',
        background: copied ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: copied ? 'var(--green-500)' : 'var(--text-tertiary)',
        transition: 'all 0.15s ease',
        marginLeft: '6px',
      }}
    >
      {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
    </button>
  )
}

function StatusBadge({ status }: { status: Image['status'] }) {
  switch (status) {
    case 'pending':
      return (
        <span className="badge badge-pending">
          <Clock size={11} />
          Pending
        </span>
      )
    case 'pulling':
      return (
        <span className="badge badge-pulling">
          <Loader2 size={11} className="spin" />
          Pulling
        </span>
      )
    case 'success':
      return (
        <span className="badge badge-success">
          <CheckCircle size={11} />
          Success
        </span>
      )
    case 'failed':
      return (
        <span className="badge badge-failed">
          <AlertCircle size={11} />
          Failed
        </span>
      )
    default:
      return <span className="badge">{status}</span>
  }
}

export default function Images() {
  const navigate = useNavigate()
  const { images, createImage, updateImage, deleteImage, pullImage, exportImage } = useImages()
  const { config } = useConfig()
  const { addNotification } = useNotification()
  const [showModal, setShowModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingImage, setEditingImage] = useState<Image | null>(null)
  const [batchMode, setBatchMode] = useState(false)
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

  const parseImageName = (fullName: string) => {
    const parts = fullName.split(':')
    const name = parts[0].trim()
    const tag = parts[1]?.trim() || 'latest'
    return { name, tag }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let platformsToPull = formData.platforms

    const firstImage = batchMode ? batchText.split('\n')[0].trim() : formData.fullName
    if (firstImage && platformsToPull.includes('linux/arm64')) {
      const { name, tag } = parseImageName(firstImage)
      try {
        const checkRes = await imagesApi.checkPlatforms(name, tag)
        const supportedPlatforms = checkRes.data.platforms || []
        if (!supportedPlatforms.includes('linux/arm64')) {
          addNotification('error', 'Image does not support linux/arm64, pulling linux/amd64 only')
          platformsToPull = platformsToPull.filter(p => p !== 'linux/arm64')
        }
      } catch {
        addNotification('info', 'Unable to verify image architecture, continuing with selected platforms')
      }
    }

    if (batchMode) {
      const lines = batchText.split('\n').filter(line => line.trim())
      for (const line of lines) {
        const { name, tag } = parseImageName(line)
        for (const platform of platformsToPull) {
          await createImage({ name, tag, platform, is_auto_export: formData.is_auto_export })
        }
      }
      addNotification('success', `Added ${lines.length * platformsToPull.length} image task(s)`)
    } else {
      const { name, tag } = parseImageName(formData.fullName)
      for (const platform of platformsToPull) {
        await createImage({ name, tag, platform, is_auto_export: formData.is_auto_export })
      }
      addNotification('success', `Added ${platformsToPull.length} image task(s)`)
    }

    setShowModal(false)
    setFormData({ 
      fullName: '', 
      platforms: config?.default_platform?.split(',').filter(p => p.trim()) || ['linux/amd64', 'linux/arm64'], 
      is_auto_export: false 
    })
    setBatchText('')
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
    setEditMode(false)
    setEditingImage(null)
  }

  const handleEditImage = (img: Image) => {
    setEditMode(true)
    setEditingImage(img)
    setFormData({
      fullName: img.full_name,
      platforms: [img.platform],
      is_auto_export: img.is_auto_export,
    })
    setBatchMode(false)
    setShowModal(true)
  }

  const handleUpdateImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingImage) return

    const { name, tag } = parseImageName(formData.fullName)
    
    // Update the original image with first platform
    const success = await updateImage(editingImage.id, {
      name,
      tag,
      platform: formData.platforms[0],
      is_auto_export: formData.is_auto_export,
    })

    if (!success) {
      addNotification('error', 'Failed to update image')
      return
    }

    // If multiple platforms selected, create new images for additional platforms
    if (formData.platforms.length > 1) {
      const additionalPlatforms = formData.platforms.slice(1)
      let createdCount = 0
      for (const platform of additionalPlatforms) {
        const created = await createImage({ name, tag, platform, is_auto_export: formData.is_auto_export })
        if (created) createdCount++
      }
      addNotification('success', `Image updated + ${createdCount} new platform(s) added`)
    } else {
      addNotification('success', 'Image updated successfully')
    }
    
    handleCloseModal()
  }

  return (
    <div className="content-center">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1>Images</h1>
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
            <Plus size={14} />
            New
          </button>
        </div>
      </div>

      {/* ── Images Table ── */}
      {images.length > 0 ? (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Retries</th>
                <th>Export Path</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {images.map((img) => (
                <tr key={img.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: 'var(--accent-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Package size={14} style={{ color: 'var(--purple-400)' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                        }}>
                          {img.name}:{img.tag}
                        </span>
                        <CopyButton text={`${img.name}:${img.tag}`} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      padding: '2px 7px',
                      borderRadius: '4px',
                    }}>
                      {img.platform}
                    </span>
                  </td>
                  <td><StatusBadge status={img.status} /></td>
                  <td>
                    <span style={{ color: img.retry_count > 0 ? 'var(--yellow-500)' : 'var(--text-muted)', fontSize: '13px' }}>
                      {img.retry_count}
                    </span>
                  </td>
                  <td>
                    {img.export_path ? (
                      <span
                        className="truncate text-sm"
                        title={img.export_path}
                        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                      >
                        <ChevronRight size={12} style={{ display: 'inline', marginRight: '2px', opacity: 0.5 }} />
                        {img.export_path.split('/').pop()}
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
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => navigate(`/logs?imageId=${img.id}`)}
                        title="View logs"
                      >
                        <FileText size={13} />
                      </button>
                      {img.status !== 'pulling' && (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleEditImage(img)}
                          title="Edit"
                        >
                          <Edit size={13} />
                        </button>
                      )}
                      {img.status === 'failed' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => pullImage(img.id)}
                          title="Retry pull"
                        >
                          <RefreshCw size={13} />
                          Retry
                        </button>
                      )}
                      {img.status === 'success' && !img.export_path && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => exportImage(img.id)}
                          title="Export image"
                        >
                          <Download size={13} />
                          Export
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteImage(img.id)}
                        title="Delete"
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
              <div className="icon-cell">
                <svg width="26" height="26" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.186v1.887c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.186v1.887c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.186v1.887a.185.185 0 00.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.186.186 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.184.184 0 00-.184.186v1.887c0 .102.083.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288z" fill="#2496ED"/>
                </svg>
              </div>
              <div className="icon-cell">
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" fill="var(--text-primary)"/>
                </svg>
              </div>
              <div className="icon-cell">
                <i className="fab fa-redhat" style={{ color: '#EE0000', fontSize: '24px' }}></i>
              </div>
              <div className="icon-cell">
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.48 10.92v2.72h4.91c-.2 1.27-.82 2.35-1.74 3.07l2.81 2.18c1.64-1.51 2.58-3.73 2.58-6.37 0-.63-.06-1.24-.17-1.82l-8.39.22z" fill="#4285F4"/>
                  <path d="M5.61 14.28A7.1 7.1 0 014.96 12c0-.79.14-1.55.38-2.26L2.54 7.58A11.94 11.94 0 002 12c0 1.92.46 3.73 1.28 5.33l2.33-3.05z" fill="#FBBC05"/>
                  <path d="M12 4.9c1.77 0 3.35.61 4.6 1.8l2.74-2.74C17.51 1.99 14.93 1 12 1 7.7 1 3.99 3.47 2.54 7.58l2.8 2.16C6.14 6.86 8.85 4.9 12 4.9z" fill="#EA4335"/>
                  <path d="M12 19.1c-3.15 0-5.86-1.96-7.06-4.82l-2.8 2.16C3.59 20.52 7.47 23 12 23c2.93 0 5.4-.97 7.19-2.56l-2.81-2.18c-.96.64-2.18 1.02-3.56.84H12z" fill="#34A853"/>
                </svg>
              </div>
            </div>
            <div className="empty-state-content" onClick={(e) => e.stopPropagation()}>
              <div className="empty-state-title">Pull from any container registry</div>
              <div className="empty-state-description">
                Add images from Docker Hub, GitHub, Quay, or GCR<br />
                to manage and distribute centrally.
              </div>
              <div className="empty-state-tags">
                <span className="empty-state-tag">docker.io</span>
                <span className="empty-state-tag">ghcr.io</span>
                <span className="empty-state-tag">quay.io</span>
                <span className="empty-state-tag">gcr.io</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Image Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? 'Edit Image' : 'Add Image'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={editMode ? handleUpdateImage : handleSubmit}>
              <div className="modal-body">
                {/* Batch toggle - only show in create mode */}
                {!editMode && (
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={batchMode}
                        onChange={(e) => setBatchMode(e.target.checked)}
                      />
                      <span>Batch mode — one image per line</span>
                    </label>
                  </div>
                )}

                {/* Image input */}
                {batchMode ? (
                  <div className="form-group">
                    <label>Images</label>
                    <textarea
                      className="form-control"
                      rows={6}
                      value={batchText}
                      onChange={(e) => setBatchText(e.target.value)}
                      placeholder={'nginx:latest\nredis:7-alpine\npostgres:15'}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Image</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="nginx:latest"
                      required
                      autoFocus
                    />
                  </div>
                )}

                {/* Platforms */}
                <div className="form-group">
                  <label>Platforms</label>
                  <div className="platform-options">
                    {platformOptions.map(opt => (
                      <label
                        key={opt.value}
                        className={`platform-option ${formData.platforms.includes(opt.value) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.platforms.includes(opt.value)}
                          onChange={() => handlePlatformToggle(opt.value)}
                        />
                        <span className="platform-option-label">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Auto-export */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_auto_export}
                      onChange={(e) => setFormData({ ...formData, is_auto_export: e.target.checked })}
                    />
                    <span>Auto-export after pull completes</span>
                  </label>
                </div>

                {editMode && editingImage?.status === 'success' && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(234, 179, 8, 0.1)',
                    border: '1px solid rgba(234, 179, 8, 0.2)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--yellow-500)',
                    marginBottom: '12px',
                  }}>
                    Editing will reset the image to pending state for re-pulling.
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formData.platforms.length === 0}
                >
                  {editMode ? <Edit size={14} /> : <Plus size={14} />}
                  {editMode ? 'Save Changes' : batchMode ? 'Add Batch' : 'Add Image'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
