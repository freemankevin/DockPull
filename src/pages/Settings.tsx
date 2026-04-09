import { useState } from 'react'
import {
  Save, FlaskConical, Folder,
  Settings as SettingsIcon, Bell, RefreshCw, Cpu, ChevronRight, X, Key
} from 'lucide-react'
import { useConfig } from '../hooks/useConfig'
import { useNotification } from '../context/NotificationContext'
import { webhookApi, browseApi } from '../api'
import Select from '../components/Select'

type TabId = 'general' | 'retry' | 'webhook' | 'registry'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'general', label: 'General',  icon: <SettingsIcon size={14} /> },
  { id: 'retry',   label: 'Retry',    icon: <RefreshCw size={14} /> },
  { id: 'registry', label: 'Registry', icon: <Key size={14} /> },
  { id: 'webhook', label: 'Webhook',  icon: <Bell size={14} /> },
]

function SettingRow({
  label, hint, children, noBorder = false
}: {
  label: string; hint?: string; children: React.ReactNode; noBorder?: boolean
}) {
  return (
    <div style={{
      padding: '14px 0',
      borderBottom: noBorder ? 'none' : '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1px' }}>{label}</div>
        {hint && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

export default function Settings() {
  const { config, loading, updateConfig } = useConfig()
  const { addNotification } = useNotification()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [browseOpen, setBrowseOpen] = useState(false)
  const [browseDirs, setBrowseDirs] = useState<any[]>([])
  const [browseCurrent, setBrowseCurrent] = useState('')
  const [browseParent, setBrowseParent] = useState('')
  const [browseLoading, setBrowseLoading] = useState(false)

  const getValue = (key: string) => formData[key] ?? config?.[key as keyof typeof config]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateConfig({ ...config, ...formData })
      setFormData({})
      addNotification('success', 'Settings saved successfully')
    } catch {
      addNotification('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    try {
      await webhookApi.test()
      addNotification('success', 'Test webhook sent successfully')
    } catch (err: any) {
      addNotification('error', 'Failed to send webhook: ' + err.message)
    }
  }

  const handleBrowseFolder = async () => {
    setBrowseLoading(true)
    setBrowseOpen(true)
    try {
      const res = await browseApi.list(getValue('export_path') || '.')
      setBrowseCurrent(res.data.current)
      setBrowseParent(res.data.parent)
      setBrowseDirs(res.data.dirs || [])
    } catch (err: any) {
      addNotification('error', 'Failed to browse: ' + err.message)
      setBrowseOpen(false)
    } finally {
      setBrowseLoading(false)
    }
  }

  const handleBrowseDir = async (path: string) => {
    setBrowseLoading(true)
    try {
      const res = await browseApi.list(path)
      setBrowseCurrent(res.data.current)
      setBrowseParent(res.data.parent)
      setBrowseDirs(res.data.dirs || [])
    } catch (err: any) {
      addNotification('error', 'Failed to browse: ' + err.message)
    } finally {
      setBrowseLoading(false)
    }
  }

  const handleSelectDir = () => {
    setFormData({ ...formData, export_path: browseCurrent })
    setBrowseOpen(false)
  }

  if (loading || !config) {
    return (
      <div className="content-center">
        <div className="page-header"><h1>Settings</h1></div>
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

  return (
    <div className="content-center">
      <div className="page-header"><h1>Settings</h1></div>

      {browseOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 10000,
        }} onClick={() => setBrowseOpen(false)}>
          <div style={{
            background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)',
            width: '480px', maxHeight: '80vh', overflow: 'hidden',
            border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              padding: '16px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Select Directory</div>
              <button onClick={() => setBrowseOpen(false)} style={{
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '4px',
              }}><X size={16} /></button>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {browseCurrent}
            </div>
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {browseLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spin" style={{ width: '20px', height: '20px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%', margin: '0 auto 8px' }} />
                  Loading...
                </div>
              ) : (
                <>
                  {browseParent && (
                    <div
                      onClick={() => handleBrowseDir(browseParent)}
                      style={{
                        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)', fontSize: '13px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Folder size={14} />
                      ..
                    </div>
                  )}
                  {browseDirs.map((dir: any) => (
                    <div
                      key={dir.path}
                      onClick={() => handleBrowseDir(dir.path)}
                      style={{
                        padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', borderBottom: '1px solid var(--border-color)',
                        color: 'var(--text-primary)', fontSize: '13px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                      {dir.name}
                    </div>
                  ))}
                </>
              )}
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setBrowseOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSelectDir}>Select</button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex', background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        border: '1px solid var(--border-color)',
      }}>

        <nav style={{
          width: '176px', flexShrink: 0,
          borderRight: '1px solid var(--border-color)',
          padding: '8px',
        }}>
          <div style={{ padding: '8px 8px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Configuration
          </div>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: '6px',
                border: 'none', cursor: 'pointer', width: '100%',
                fontSize: '13px', fontWeight: activeTab === tab.id ? 500 : 400,
                background: activeTab === tab.id ? 'rgba(0,0,0,0.04)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'left', transition: 'background 0.12s, color 0.12s',
                marginBottom: '1px',
              }}
            >
              <span style={{ color: activeTab === tab.id ? '#853bce' : 'var(--text-muted)', display: 'flex' }}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </nav>

        <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px 24px' }}>

          {activeTab === 'general' && <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>General</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Configure export path and pull behavior.</p>
            </div>

            <SettingRow label="Export Directory" hint="Directory where pulled images are saved.">
              <div className="input-with-button">
                <input type="text" className="form-control"
                  value={getValue('export_path') || ''}
                  onChange={e => setFormData({ ...formData, export_path: e.target.value })}
                  placeholder="./exports" />
                <button type="button" className="btn btn-secondary" onClick={handleBrowseFolder} title="Browse">
                  <Folder size={14} />
                </button>
              </div>
            </SettingRow>

            <SettingRow label="Default Platform" hint="Target architectures for image pulls.">
              <div style={{ display: 'flex', gap: '6px' }}>
                {[{ val: 'linux/amd64', label: 'AMD64' }, { val: 'linux/arm64', label: 'ARM64' }].map(({ val, label }) => {
                  const current = getValue('default_platform') || 'linux/amd64,linux/arm64'
                  const checked = current.includes(val)
                  return (
                    <label key={val} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '6px', cursor: 'pointer',
                      border: `1px solid ${checked ? 'var(--purple-600)' : 'var(--border-color)'}`,
                      background: checked ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                      fontSize: '12.5px', fontWeight: 500,
                      color: checked ? 'var(--purple-400)' : 'var(--text-secondary)',
                      transition: 'all 0.12s', userSelect: 'none',
                    }}>
                      <Cpu size={12} style={{ color: checked ? 'var(--purple-400)' : 'var(--text-muted)' }} />
                      <input type="checkbox" checked={checked} style={{ display: 'none' }}
                        onChange={e => {
                          const platforms = current.split(',').filter((p: string) => p.trim())
                          if (e.target.checked) { if (!platforms.includes(val)) platforms.push(val) }
                          else { const idx = platforms.indexOf(val); if (idx > -1) platforms.splice(idx, 1) }
                          setFormData({ ...formData, default_platform: platforms.join(',') })
                        }} />
                      {label}
                    </label>
                  )
                })}
              </div>
            </SettingRow>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <SettingRow label="Concurrent Pulls" hint="Max simultaneous pulls (1–10)." noBorder>
                <input type="number" className="form-control" style={{ maxWidth: '100px' }}
                  value={getValue('concurrent_pulls') ?? 3}
                  onChange={e => setFormData({ ...formData, concurrent_pulls: parseInt(e.target.value) })}
                  min={1} max={10} />
              </SettingRow>
              <SettingRow label="Gzip Compression" hint="Compression level (1–9)." noBorder>
                <input type="number" className="form-control" style={{ maxWidth: '100px' }}
                  value={getValue('gzip_compression') ?? 6}
                  onChange={e => setFormData({ ...formData, gzip_compression: parseInt(e.target.value) })}
                  min={1} max={9} />
              </SettingRow>
            </div>
          </>}

          {activeTab === 'retry' && <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Retry Settings</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Control retry behavior for failed pulls.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <SettingRow label="Max Retries" hint="Set 0 for unlimited retries." noBorder>
                <input type="number" className="form-control" style={{ maxWidth: '100px' }}
                  value={getValue('retry_max_attempts') ?? 3}
                  onChange={e => setFormData({ ...formData, retry_max_attempts: parseInt(e.target.value) })}
                  min={0} />
              </SettingRow>
              <SettingRow label="Retry Interval (s)" hint="Seconds between each attempt." noBorder>
                <input type="number" className="form-control" style={{ maxWidth: '100px' }}
                  value={getValue('retry_interval_sec') ?? 30}
                  onChange={e => setFormData({ ...formData, retry_interval_sec: parseInt(e.target.value) })}
                  min={1} />
              </SettingRow>
            </div>
          </>}

          {activeTab === 'registry' && <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Registry Credentials</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Configure authentication for private or authenticated registries.</p>
            </div>

            <SettingRow label="GitHub Container Registry (ghcr.io)" hint="Personal access token with read:packages scope. Required even for public images on ghcr.io." noBorder>
              <input type="password" className="form-control"
                value={getValue('ghcr_token') || ''}
                onChange={e => setFormData({ ...formData, ghcr_token: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxx" />
            </SettingRow>
          </>}

          {activeTab === 'webhook' && <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Webhook Notifications</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Notify on pull completion or failure.</p>
            </div>

            <SettingRow label="Enable Webhooks" hint="Send a POST request when pulls finish.">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                <div
                  onClick={() => setFormData({ ...formData, enable_webhook: !getValue('enable_webhook') })}
                  style={{
                    width: '34px', height: '19px', borderRadius: '10px', position: 'relative',
                    background: getValue('enable_webhook') ? 'rgba(139,92,246,0.8)' : 'var(--border-color)',
                    transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
                  }}>
                  <div style={{
                    position: 'absolute', top: '2.5px',
                    left: getValue('enable_webhook') ? '17px' : '2.5px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {getValue('enable_webhook') ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </SettingRow>

            <SettingRow label="Webhook Type" hint="Platform to deliver notifications to.">
              <div style={{ maxWidth: '220px' }}>
                <Select
                  value={getValue('webhook_type') || 'dingtalk'}
                  onChange={value => setFormData({ ...formData, webhook_type: value })}
                  options={[
                    { value: 'dingtalk', label: 'DingTalk' },
                    { value: 'feishu',   label: 'Lark (Feishu)' },
                    { value: 'wechat',   label: 'WeChat Work' },
                  ]} />
              </div>
            </SettingRow>

            <SettingRow label="Webhook URL" hint="Endpoint to POST notification payloads." noBorder>
              <input type="text" className="form-control"
                value={getValue('webhook_url') || ''}
                onChange={e => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://..."
                disabled={!getValue('enable_webhook')} />
            </SettingRow>
          </>}

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={13} />
              {saving ? 'Saving...' : 'Save'}
            </button>
            {activeTab === 'webhook' && (
              <button type="button" className="btn btn-secondary"
                onClick={handleTestWebhook}
                disabled={!getValue('enable_webhook')}>
                <FlaskConical size={13} />
                Test Webhook
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}