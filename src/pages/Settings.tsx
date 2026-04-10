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
  { id: 'account', label: 'Account',  icon: <User size={14} /> },
  { id: 'export', label: 'Export',   icon: <ArrowRightFromLine size={14} /> },
  { id: 'retry',   label: 'Retry',    icon: <RefreshCw size={14} /> },
  { id: 'tokens',  label: 'Tokens',   icon: <Key size={14} /> },
  { id: 'webhook', label: 'Webhook',  icon: <Bell size={14} /> },
]

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

      <DirectoryPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectDir}
        initialPath={getValue('export_path') || '.'}
      />

      <div style={{
        display: 'flex', background: 'var(--bg-primary)',
        overflow: 'visible',
      }}>

        <nav style={{
          width: '176px', flexShrink: 0,
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

        <form onSubmit={handleSubmit} style={{ flex: 1, padding: '20px 24px', overflow: 'visible' }}>

          {activeTab === 'export' && <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Export Settings</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Configure export path and pull behavior.</p>
            </div>

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

          {activeTab === 'account' && <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Account Settings</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Change your login password.</p>
            </div>

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

          {activeTab === 'tokens' && <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>Access Tokens</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Configure tokens for registry authentication and private repositories.</p>
            </div>

            {visibleTokens.length === 0 && !showAddToken && (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: 'var(--text-muted)',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <Key size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '13px' }}>No registry tokens configured</p>
                <button 
                  onClick={() => setShowAddToken(true)}
                  style={{
                    marginTop: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
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
                marginTop: visibleTokens.length > 0 ? '16px' : 0,
                padding: '12px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '8px' 
                }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                          gap: '8px',
                          padding: '8px 12px',
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
                    <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
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
                  marginTop: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
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

          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="submit"
              className={`btn ${saveStatus === 'success' ? 'btn-success' : saveStatus === 'error' ? 'btn-danger' : 'btn-primary'}`}
              disabled={saving}
              style={{
                minWidth: '100px',
                transition: 'all 0.2s ease',
              }}
            >
              {saveStatus === 'saving' ? (
                <><Loader2 size={13} className="spin" /> Saving...</>
              ) : saveStatus === 'success' ? (
                <><CheckCircle size={13} /> Saved</>
              ) : saveStatus === 'error' ? (
                <><AlertCircle size={13} /> Failed</>
              ) : (
                <><Save size={13} /> Save</>
              )}
            </button>
            {activeTab === 'webhook' && (
              <button
                type="button"
                className={`btn ${testStatus === 'success' ? 'btn-success' : testStatus === 'error' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleTestWebhook}
                disabled={!getValue('enable_webhook') || testStatus === 'testing'}
                style={{
                  minWidth: '100px',
                  transition: 'all 0.2s ease',
                }}
              >
                {testStatus === 'testing' ? (
                  <><Loader2 size={13} className="spin" /> Testing...</>
                ) : testStatus === 'success' ? (
                  <><CheckCircle size={13} /> Sent</>
                ) : testStatus === 'error' ? (
                  <><AlertCircle size={13} /> Failed</>
                ) : (
                  <><FlaskConical size={13} /> Test</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}