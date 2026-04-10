import { useState, useEffect } from 'react'
import {
  Save, FlaskConical, Folder, Bell, RefreshCw, Cpu, Key, CheckCircle, AlertCircle, Loader2, User, ArrowRightFromLine, Plus, X, Eye, EyeOff
} from 'lucide-react'
import { useConfig } from '../hooks/useConfig'
import { useToast } from '../context/ToastContext'
import { webhookApi, authApi } from '../api'
import Select from '../components/Select'
import DirectoryPicker from '../components/DirectoryPicker'

type TabId = 'account' | 'export' | 'retry' | 'webhook' | 'tokens'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account',  icon: <User size={16} /> },
  { id: 'export', label: 'Export',   icon: <ArrowRightFromLine size={16} /> },
  { id: 'retry',   label: 'Retry',    icon: <RefreshCw size={16} /> },
  { id: 'tokens',  label: 'Tokens',   icon: <Key size={16} /> },
  { id: 'webhook', label: 'Webhook',  icon: <Bell size={16} /> },
]

const TAB_TITLES: Record<TabId, { title: string; subtitle: string }> = {
  account: { title: 'Account Settings', subtitle: 'Manage your account credentials and password.' },
  export: { title: 'Export Settings', subtitle: 'Configure export path, platform, and pull behavior.' },
  retry: { title: 'Retry Settings', subtitle: 'Control retry behavior for failed image pulls.' },
  tokens: { title: 'Access Tokens', subtitle: 'Configure authentication tokens for container registries.' },
  webhook: { title: 'Webhook Notifications', subtitle: 'Configure notifications for pull completion and failures.' },
}

const TOKEN_REGISTRY_CONFIG = {
  dockerhub: {
    id: 'dockerhub',
    name: 'Docker Hub',
    hint: 'Username and access token for Docker Hub (hub.docker.com). Create token at Account Settings > Security.',
    fields: [
      { key: 'dockerhub_username', placeholder: 'Username', type: 'text' },
      { key: 'dockerhub_token', placeholder: 'Access token', type: 'password' },
    ],
    checkKeys: ['dockerhub_username', 'dockerhub_token'],
  },
  ghcr: {
    id: 'ghcr',
    name: 'GitHub Container Registry (ghcr.io)',
    hint: 'Personal access token with read:packages scope. Required even for public images.',
    fields: [
      { key: 'ghcr_token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password' },
    ],
    checkKeys: ['ghcr_token'],
  },
  quay: {
    id: 'quay',
    name: 'Quay.io',
    hint: 'Access token for Quay.io registry. Create robot account or use OAuth token.',
    fields: [
      { key: 'quay_token', placeholder: 'Quay access token', type: 'password' },
    ],
    checkKeys: ['quay_token'],
  },
  acr: {
    id: 'acr',
    name: 'Alibaba Container Registry (acr)',
    hint: 'Username and password for Alibaba Cloud Container Registry (cr.aliyun.com).',
    fields: [
      { key: 'acr_username', placeholder: 'Username', type: 'text' },
      { key: 'acr_password', placeholder: 'Password', type: 'password' },
    ],
    checkKeys: ['acr_username', 'acr_password'],
  },
  ecr: {
    id: 'ecr',
    name: 'AWS ECR',
    hint: 'AWS credentials for Elastic Container Registry. Region defaults to us-east-1.',
    fields: [
      { key: 'ecr_access_key_id', placeholder: 'Access Key ID', type: 'password' },
      { key: 'ecr_secret_access_key', placeholder: 'Secret Access Key', type: 'password' },
      { key: 'ecr_region', placeholder: 'Region (e.g., us-east-1)', type: 'text' },
    ],
    checkKeys: ['ecr_access_key_id', 'ecr_secret_access_key'],
  },
  gar: {
    id: 'gar',
    name: 'Google Artifact Registry (gar)',
    hint: 'Service account JSON key or OAuth token for Google Artifact Registry.',
    fields: [
      { key: 'gar_token', placeholder: 'Google Cloud token or JSON key', type: 'password' },
    ],
    checkKeys: ['gar_token'],
  },
}

function SettingRow({
  label, hint, children, noBorder = true
}: {
  label: React.ReactNode; hint?: string; children: React.ReactNode; noBorder?: boolean
}) {
  return (
    <div style={{
      padding: '20px 0',
      borderBottom: noBorder ? 'none' : '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{label}</div>
        {hint && <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ marginTop: '4px' }}>{children}</div>
    </div>
  )
}

export default function Settings() {
  const { config, loading, updateConfig } = useConfig()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [activeTab, setActiveTab] = useState<TabId>('account')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false })
  const [visibleTokens, setVisibleTokens] = useState<string[]>([])
  const [showAddToken, setShowAddToken] = useState(false)

  const getValue = (key: string) => formData[key] ?? config?.[key as keyof typeof config]

  const hasTokenConfig = (tokenId: string) => {
    const registry = TOKEN_REGISTRY_CONFIG[tokenId as keyof typeof TOKEN_REGISTRY_CONFIG]
    if (!registry) return false
    return registry.checkKeys.some(key => {
      const value = getValue(key)
      return value && value.trim() !== ''
    })
  }

  const getAvailableTokens = () => {
    return Object.keys(TOKEN_REGISTRY_CONFIG).filter(id => !visibleTokens.includes(id))
  }

  const addTokenRegistry = (tokenId: string) => {
    if (!visibleTokens.includes(tokenId)) {
      setVisibleTokens([...visibleTokens, tokenId])
      setShowAddToken(false)
    }
  }

  const removeTokenRegistry = (tokenId: string) => {
    setVisibleTokens(visibleTokens.filter(id => id !== tokenId))
    const registry = TOKEN_REGISTRY_CONFIG[tokenId as keyof typeof TOKEN_REGISTRY_CONFIG]
    if (registry) {
      registry.fields.forEach(field => {
        if (formData[field.key]) {
          const newFormData = { ...formData }
          delete newFormData[field.key]
          setFormData(newFormData)
        }
      })
    }
  }

  useEffect(() => {
    if (config && visibleTokens.length === 0) {
      const configuredTokens = Object.keys(TOKEN_REGISTRY_CONFIG).filter(id => hasTokenConfig(id))
      setVisibleTokens(configuredTokens)
    }
  }, [config])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveStatus('saving')
    try {
      if (activeTab === 'account' && passwordData.oldPassword && passwordData.newPassword) {
        if (passwordData.newPassword.length < 6) {
          showToast('error', 'New password must be at least 6 characters')
          setSaveStatus('error')
          setTimeout(() => setSaveStatus('idle'), 2000)
          setSaving(false)
          return
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          showToast('error', 'New passwords do not match')
          setSaveStatus('error')
          setTimeout(() => setSaveStatus('idle'), 2000)
          setSaving(false)
          return
        }
        await authApi.changePassword(passwordData.oldPassword, passwordData.newPassword)
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
        showToast('success', 'Password changed successfully')
      }

      await updateConfig({ ...config, ...formData })
      setFormData({})
      setSaveStatus('success')
      if (activeTab !== 'account') {
        showToast('success', 'Settings saved successfully')
      }
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err: any) {
      setSaveStatus('error')
      const errorMsg = err.response?.data?.error || 'Failed to save settings'
      showToast('error', errorMsg)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    setTestStatus('testing')
    try {
      await webhookApi.test()
      setTestStatus('success')
      showToast('success', 'Test webhook sent successfully')
      setTimeout(() => setTestStatus('idle'), 2000)
    } catch (err: any) {
      setTestStatus('error')
      showToast('error', 'Failed to send webhook: ' + err.message)
      setTimeout(() => setTestStatus('idle'), 2000)
    }
  }

  const handleSelectDir = (path: string) => {
    setFormData({ ...formData, export_path: path })
  }

  if (loading || !config) {
    return (
      <div className="settings-container">
        <div className="settings-loading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
            <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
            Loading configuration...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-container">
      <DirectoryPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectDir}
        initialPath={getValue('export_path') || '.'}
      />

      {/* Left Sidebar - Navigation */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h2 className="settings-sidebar-title">Settings</h2>
        </div>

        <nav className="settings-nav">
          <div className="settings-nav-section">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="settings-nav-icon">{tab.icon}</span>
                <span className="settings-nav-text">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* Right Content */}
      <main className="settings-content">
        <form onSubmit={handleSubmit} className="settings-form">
          {/* Page Header */}
          <div className="settings-page-header">
            <h1 className="settings-page-title">{TAB_TITLES[activeTab].title}</h1>
            <p className="settings-page-subtitle">{TAB_TITLES[activeTab].subtitle}</p>
          </div>

          <div className="settings-divider" />

          {/* Form Content */}
          <div className="settings-form-content">
            {activeTab === 'export' && <>
              <SettingRow label="Export Directory" hint="Directory where pulled images are saved.">
                <div className="input-with-button">
                  <input type="text" className="form-control"
                    value={getValue('export_path') || ''}
                    onChange={e => setFormData({ ...formData, export_path: e.target.value })}
                    placeholder="./exports" />
                  <button type="button" className="btn btn-secondary" onClick={() => setPickerOpen(true)} title="Browse">
                    <Folder size={14} />
                  </button>
                </div>
              </SettingRow>

              <SettingRow label="Default Platform" hint="Target architectures for image pulls.">
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[{ val: 'linux/amd64', label: 'AMD64' }, { val: 'linux/arm64', label: 'ARM64' }].map(({ val, label }) => {
                    const current = getValue('default_platform') || 'linux/amd64,linux/arm64'
                    const checked = current.includes(val)
                    return (
                      <label key={val} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
                        border: `1px solid ${checked ? 'var(--purple-600)' : 'var(--border-color)'}`,
                        background: checked ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                        fontSize: '13px', fontWeight: 500,
                        color: checked ? 'var(--purple-400)' : 'var(--text-secondary)',
                        transition: 'all 0.12s', userSelect: 'none',
                      }}>
                        <Cpu size={14} style={{ color: checked ? 'var(--purple-400)' : 'var(--text-muted)' }} />
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                <SettingRow label="Concurrent Pulls" hint="Max simultaneous pulls (1–10)." noBorder>
                  <input type="number" className="form-control" style={{ maxWidth: '120px' }}
                    value={getValue('concurrent_pulls') ?? 3}
                    onChange={e => setFormData({ ...formData, concurrent_pulls: parseInt(e.target.value) })}
                    min={1} max={10} />
                </SettingRow>
                <SettingRow label="Gzip Compression" hint="Compression level (1–9)." noBorder>
                  <input type="number" className="form-control" style={{ maxWidth: '120px' }}
                    value={getValue('gzip_compression') ?? 6}
                    onChange={e => setFormData({ ...formData, gzip_compression: parseInt(e.target.value) })}
                    min={1} max={9} />
                </SettingRow>
              </div>
            </>}

            {activeTab === 'account' && <>
              <SettingRow label="Old Password" hint="Enter your current password.">
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.old ? 'text' : 'password'}
                    className="form-control"
                    value={passwordData.oldPassword}
                    onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                    placeholder="Enter old password" />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </SettingRow>

              <SettingRow label="New Password" hint="New password must be at least 6 characters.">
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    className="form-control"
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Enter new password" />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </SettingRow>

              <SettingRow label="Confirm New Password" hint="Re-enter your new password to confirm." noBorder>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className="form-control"
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password" />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </SettingRow>
            </>}

            {activeTab === 'retry' && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                <SettingRow label="Max Retries" hint="Set 0 for unlimited retries." noBorder>
                  <input type="number" className="form-control" style={{ maxWidth: '120px' }}
                    value={getValue('retry_max_attempts') ?? 3}
                    onChange={e => setFormData({ ...formData, retry_max_attempts: parseInt(e.target.value) })}
                    min={0} />
                </SettingRow>
                <SettingRow label="Retry Interval (s)" hint="Seconds between each attempt." noBorder>
                  <input type="number" className="form-control" style={{ maxWidth: '120px' }}
                    value={getValue('retry_interval_sec') ?? 30}
                    onChange={e => setFormData({ ...formData, retry_interval_sec: parseInt(e.target.value) })}
                    min={1} />
                </SettingRow>
              </div>
            </>}

            {activeTab === 'tokens' && <>
              {visibleTokens.length === 0 && !showAddToken && (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}>
                  <Key size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>No registry tokens configured</p>
                  <button
                    onClick={() => setShowAddToken(true)}
                    style={{
                      marginTop: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={14} /> Add Registry Token
                  </button>
                </div>
              )}

              {visibleTokens.map((tokenId, index) => {
                const registry = TOKEN_REGISTRY_CONFIG[tokenId as keyof typeof TOKEN_REGISTRY_CONFIG]
                if (!registry) return null

                return (
                  <SettingRow
                    key={tokenId}
                    label={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{registry.name}</span>
                        <button
                          onClick={() => removeTokenRegistry(tokenId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                          }}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    }
                    hint={registry.hint}
                    noBorder={index === visibleTokens.length - 1 && !showAddToken}
                  >
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {registry.fields.map(field => (
                        <input
                          key={field.key}
                          type={field.type}
                          className="form-control"
                          value={getValue(field.key) || ''}
                          onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          style={{ flex: registry.fields.length > 1 ? 1 : undefined }}
                        />
                      ))}
                    </div>
                  </SettingRow>
                )
              })}

              {showAddToken && (
                <div style={{
                  marginTop: visibleTokens.length > 0 ? '20px' : 0,
                  padding: '16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Select a registry to add:
                    </div>
                    <button
                      onClick={() => setShowAddToken(false)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        borderRadius: '4px',
                      }}
                      title="Close"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {getAvailableTokens().map(tokenId => {
                      const registry = TOKEN_REGISTRY_CONFIG[tokenId as keyof typeof TOKEN_REGISTRY_CONFIG]
                      if (!registry) return null
                      return (
                        <button
                          key={tokenId}
                          onClick={() => addTokenRegistry(tokenId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '13px',
                            textAlign: 'left',
                          }}
                        >
                          <Key size={14} style={{ color: 'var(--text-muted)' }} />
                          {registry.name}
                        </button>
                      )
                    })}
                    {getAvailableTokens().length === 0 && (
                      <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        All registries are already configured
                      </div>
                    )}
                  </div>
                </div>
              )}

              {visibleTokens.length > 0 && !showAddToken && (
                <button
                  onClick={() => setShowAddToken(true)}
                  style={{
                    marginTop: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Add Another Registry
                </button>
              )}
            </>}

            {activeTab === 'webhook' && <>
              <SettingRow label="Enable Webhooks" hint="Send a POST request when pulls finish.">
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <div
                    onClick={() => setFormData({ ...formData, enable_webhook: !getValue('enable_webhook') })}
                    style={{
                      width: '36px', height: '20px', borderRadius: '10px', position: 'relative',
                      background: getValue('enable_webhook') ? 'rgba(139,92,246,0.9)' : 'var(--border-color)',
                      transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0,
                    }}>
                    <div style={{
                      position: 'absolute', top: '2px',
                      left: getValue('enable_webhook') ? '18px' : '2px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: 'white', transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {getValue('enable_webhook') ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </SettingRow>

              <SettingRow label="Webhook Type" hint="Platform to deliver notifications to.">
                <div style={{ maxWidth: '240px' }}>
                  <Select
                    value={getValue('webhook_type') || 'dingtalk'}
                    onChange={value => setFormData({ ...formData, webhook_type: value })}
                    options={[
                      { value: 'dingtalk', label: 'DingTalk' },
                      { value: 'feishu',   label: 'Lark (Feishu)' },
                      { value: 'wechat',   label: 'WeChat' },
                      { value: 'slack',    label: 'Slack' },
                      { value: 'discord',  label: 'Discord' },
                      { value: 'telegram', label: 'Telegram' },
                      { value: 'teams',    label: 'Microsoft Teams' },
                      { value: 'line',     label: 'LINE' },
                      { value: 'custom',   label: 'Custom Webhook' },
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
          </div>

          {/* Form Footer */}
          <div className="settings-form-footer">
            <button
              type="submit"
              className={`btn ${saveStatus === 'success' ? 'btn-success' : saveStatus === 'error' ? 'btn-danger' : 'btn-primary'}`}
              disabled={saving}
              style={{ minWidth: '100px' }}
            >
              {saveStatus === 'saving' ? (
                <><Loader2 size={14} className="spin" /> Saving...</>
              ) : saveStatus === 'success' ? (
                <><CheckCircle size={14} /> Saved</>
              ) : saveStatus === 'error' ? (
                <><AlertCircle size={14} /> Failed</>
              ) : (
                <><Save size={14} /> Save</>
              )}
            </button>
            {activeTab === 'webhook' && (
              <button
                type="button"
                className={`btn ${testStatus === 'success' ? 'btn-success' : testStatus === 'error' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleTestWebhook}
                disabled={!getValue('enable_webhook') || testStatus === 'testing'}
                style={{ minWidth: '100px' }}
              >
                {testStatus === 'testing' ? (
                  <><Loader2 size={14} className="spin" /> Testing...</>
                ) : testStatus === 'success' ? (
                  <><CheckCircle size={14} /> Sent</>
                ) : testStatus === 'error' ? (
                  <><AlertCircle size={14} /> Failed</>
                ) : (
                  <><FlaskConical size={14} /> Test</>
                )}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}
