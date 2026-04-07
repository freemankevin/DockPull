import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Download, RefreshCw, Clock,
  AlertCircle, CheckCircle, Loader2, Package,
  Layers, ChevronRight, FileText, Edit, Copy,
} from 'lucide-react'
import { useImages } from '../hooks/useImages'
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
    setFormData({ fullName: '', platforms: ['linux/amd64', 'linux/arm64'], is_auto_export: false })
    setBatchText('')
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setFormData({ fullName: '', platforms: ['linux/amd64', 'linux/arm64'], is_auto_export: false })
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
    <div>
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
            New Image
          </button>
        </div>
      </div>

      {/* ── Images Table ── */}
      <div className="table-container">
        {images.length > 0 ? (
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
        ) : (
          <div className="empty-state clickable" onClick={() => setShowModal(true)}>
            <div className="empty-state-icon">
              <Layers size={44} strokeWidth={1.25} />
            </div>
            <div className="empty-state-title">No images yet</div>
            <div className="empty-state-description">
              Pull and manage Docker images across multiple platforms. Click to add your first image.
            </div>
            <div className="empty-state-action">
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); setShowModal(true) }}>
                <Plus size={14} /> New Image
              </button>
            </div>
          </div>
        )}
      </div>

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
