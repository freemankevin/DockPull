import { Loader2 } from 'lucide-react'
import { PlatformOption, platformOptions } from './ImageComponents'

interface ImageModalProps {
  showModal: boolean
  batchMode: boolean
  setBatchMode: (mode: boolean) => void
  formData: { fullName: string; platforms: string[]; is_auto_export: boolean }
  setFormData: (data: any) => void
  batchText: string
  setBatchText: (text: string) => void
  handleSubmit: (e: React.FormEvent) => void
  handleCloseModal: () => void
  isSubmitting: boolean
  handlePlatformToggle: (platform: string) => void
}

export default function ImageModal({
  showModal,
  batchMode,
  setBatchMode,
  formData,
  setFormData,
  batchText,
  setBatchText,
  handleSubmit,
  handleCloseModal,
  isSubmitting,
  handlePlatformToggle,
}: ImageModalProps) {
  if (!showModal) return null

  return (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Image</h2>
          <button className="btn-close" onClick={handleCloseModal}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
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

            <div className="form-group">
              <label>Platforms</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {platformOptions.map(opt => (
                  <PlatformOption
                    key={opt.value}
                    platform={opt}
                    selected={formData.platforms.includes(opt.value)}
                    onChange={() => handlePlatformToggle(opt.value)}
                  />
                ))}
              </div>
            </div>

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
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formData.platforms.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin" />
                  Adding...
                </>
              ) : (
                <>Add</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}