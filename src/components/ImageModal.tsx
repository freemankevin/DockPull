import { Loader2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
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

function ToggleSwitch({ checked, onChange, label, t }: { checked: boolean; onChange: () => void; label: string; t: (key: string) => string }) {
  return (
    <div className="toggle-switch-row">
      <div className="toggle-switch-label">{label}</div>
      <label className="toggle-switch" data-checked={checked}>
        <div className={`toggle-track ${checked ? 'checked' : ''}`} onClick={onChange}>
          <div className={`toggle-thumb ${checked ? 'checked' : ''}`} />
        </div>
        <span className="toggle-status">{checked ? t('settings.webhook.enabled') : t('settings.webhook.disabled')}</span>
      </label>
    </div>
  )
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
  const { t } = useLanguage()
  if (!showModal) return null

  return (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('modal.addImage')}</h2>
          <button className="btn-close" onClick={handleCloseModal}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <ToggleSwitch
                checked={batchMode}
                onChange={() => setBatchMode(!batchMode)}
                label={t('modal.batchMode')}
                t={t}
              />
            </div>

            {batchMode ? (
              <div className="form-group">
                <label>{t('modal.images')}</label>
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
                <label>{t('modal.image')}</label>
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
              <label>{t('modal.platforms')}</label>
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
              <ToggleSwitch
                checked={formData.is_auto_export}
                onChange={() => setFormData({ ...formData, is_auto_export: !formData.is_auto_export })}
                label={t('modal.autoExport')}
                t={t}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formData.platforms.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="spin" />
                  {t('modal.saving')}
                </>
              ) : (
                <>Save</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}