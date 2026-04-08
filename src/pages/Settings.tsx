import { useState } from 'react'
import { Save, FlaskConical, Folder, CheckCircle, AlertCircle } from 'lucide-react'
import { useConfig } from '../hooks/useConfig'
import { webhookApi } from '../api'
import Select from '../components/Select'

type ToastType = 'success' | 'error' | null

export default function Settings() {
  const { config, loading, updateConfig } = useConfig()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  if (loading || !config) {
    return (
      <div className="content-center">
        <div className="page-header">
          <h1>Settings</h1>
        </div>
        <div className="content-box">
          <div className="empty-state">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div className="spin" style={{ width: '16px', height: '16px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
              Loading configuration...
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateConfig({ ...config, ...formData })
      setFormData({})
      showToast('success', 'Settings saved successfully')
    } catch {
      showToast('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    try {
      await webhookApi.test()
      showToast('success', 'Test webhook sent successfully')
    } catch (err: any) {
      showToast('error', 'Failed to send: ' + err.message)
    }
  }

  const handleBrowseFolder = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker?.()
      if (dirHandle) {
        setFormData({ ...formData, export_path: dirHandle.name })
      }
    } catch {
      // User cancelled or API not supported
    }
  }

  const getValue = (key: string) => formData[key] ?? config[key as keyof typeof config]

  return (
<div className="content-center">
{/* ── Page Header ── */}
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: toast.type === 'success' ? 'var(--green-500)' : 'var(--red-500)',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.2s ease',
          backdropFilter: 'blur(8px)',
        }}>
          {toast.type === 'success'
            ? <CheckCircle size={15} />
            : <AlertCircle size={15} />
          }
          {toast.message}
        </div>
      )}

      {/* ── Settings Form ── */}
      <div className="content-box">
        <form onSubmit={handleSubmit}>

          {/* General */}
          <div className="settings-section">
            <h3 className="section-title">General</h3>

            <div className="form-group">
              <label>Export Directory</label>
              <div className="input-with-button">
                <input
                  type="text"
                  className="form-control"
                  value={getValue('export_path') || ''}
                  onChange={(e) => setFormData({ ...formData, export_path: e.target.value })}
                  placeholder="/path/to/exports"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBrowseFolder}
                  title="Browse folder"
                >
                  <Folder size={14} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Default Platform</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(getValue('default_platform') || 'linux/amd64,linux/arm64').includes('linux/amd64')}
                    onChange={(e) => {
                      const current = getValue('default_platform') || 'linux/amd64,linux/arm64'
                      const platforms = current.split(',').filter((p: string) => p.trim())
                      if (e.target.checked) {
                        if (!platforms.includes('linux/amd64')) platforms.push('linux/amd64')
                      } else {
                        const idx = platforms.indexOf('linux/amd64')
                        if (idx > -1) platforms.splice(idx, 1)
                      }
                      setFormData({ ...formData, default_platform: platforms.join(',') })
                    }}
                  />
                  <span>AMD64</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(getValue('default_platform') || 'linux/amd64,linux/arm64').includes('linux/arm64')}
                    onChange={(e) => {
                      const current = getValue('default_platform') || 'linux/amd64,linux/arm64'
                      const platforms = current.split(',').filter((p: string) => p.trim())
                      if (e.target.checked) {
                        if (!platforms.includes('linux/arm64')) platforms.push('linux/arm64')
                      } else {
                        const idx = platforms.indexOf('linux/arm64')
                        if (idx > -1) platforms.splice(idx, 1)
                      }
                      setFormData({ ...formData, default_platform: platforms.join(',') })
                    }}
                  />
                  <span>ARM64</span>
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Concurrent Pulls</label>
                <input
                  type="number"
                  className="form-control"
                  value={getValue('concurrent_pulls') ?? 3}
                  onChange={(e) => setFormData({ ...formData, concurrent_pulls: parseInt(e.target.value) })}
                  min={1}
                  max={10}
                />
              </div>
              <div className="form-group">
                <label>Gzip Compression (1–9)</label>
                <input
                  type="number"
                  className="form-control"
                  value={getValue('gzip_compression') ?? 6}
                  onChange={(e) => setFormData({ ...formData, gzip_compression: parseInt(e.target.value) })}
                  min={1}
                  max={9}
                />
              </div>
            </div>
          </div>

          {/* Retry */}
          <div className="settings-section">
            <h3 className="section-title">Retry Settings</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Max Retries (0 = unlimited)</label>
                <input
                  type="number"
                  className="form-control"
                  value={getValue('retry_max_attempts') ?? 3}
                  onChange={(e) => setFormData({ ...formData, retry_max_attempts: parseInt(e.target.value) })}
                  min={0}
                />
              </div>
              <div className="form-group">
                <label>Retry Interval (seconds)</label>
                <input
                  type="number"
                  className="form-control"
                  value={getValue('retry_interval_sec') ?? 30}
                  onChange={(e) => setFormData({ ...formData, retry_interval_sec: parseInt(e.target.value) })}
                  min={1}
                />
              </div>
            </div>
          </div>

          {/* Webhook */}
          <div className="settings-section">
            <h3 className="section-title">Webhook Notifications</h3>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={getValue('enable_webhook') || false}
                  onChange={(e) => setFormData({ ...formData, enable_webhook: e.target.checked })}
                />
                <span>Enable webhook notifications</span>
              </label>
            </div>

            <div className="form-group">
              <label>Webhook Type</label>
              <Select
                value={getValue('webhook_type') || 'dingtalk'}
                onChange={(value) => setFormData({ ...formData, webhook_type: value })}
                options={[
                  { value: 'dingtalk', label: 'DingTalk' },
                  { value: 'feishu', label: 'Lark (Feishu)' },
                  { value: 'wechat', label: 'WeChat Work' },
                ]}
              />
            </div>

<div className="form-group" style={{ marginBottom: 0 }}>
              <label>Webhook URL</label>
              <input
                type="text"
                className="form-control"
                value={getValue('webhook_url') || ''}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://..."
                disabled={!getValue('enable_webhook')}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="button-group">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleTestWebhook}
              disabled={!getValue('enable_webhook')}
            >
              <FlaskConical size={14} />
              Test Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
