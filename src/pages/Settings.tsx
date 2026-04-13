import { useState, useEffect } from 'react'
import { User, ArrowRightFromLine, Key, Bell, Save, FlaskConical, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useConfig } from '../hooks/useConfig'
import { useToast } from '../context/ToastContext'
import { webhookApi, authApi } from '../api'
import DirectoryPicker from '../components/DirectoryPicker'
import { TabId, TAB_TITLES, TOKEN_REGISTRY_CONFIG } from '../constants/settings'
import ExportSettings from './settings/ExportSettings'
import AccountSettings from './settings/AccountSettings'
import TokenSettings from './settings/TokenSettings'
import WebhookSettings from './settings/WebhookSettings'

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'account', label: 'Account',  icon: <User size={16} /> },
  { id: 'export', label: 'Export',   icon: <ArrowRightFromLine size={16} /> },
  { id: 'tokens',  label: 'Tokens',   icon: <Key size={16} /> },
  { id: 'webhook', label: 'Webhook',  icon: <Bell size={16} /> },
]

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

      <main className="settings-content">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="settings-page-header">
            <h1 className="settings-page-title">{TAB_TITLES[activeTab].title}</h1>
            <p className="settings-page-subtitle">{TAB_TITLES[activeTab].subtitle}</p>
          </div>

          <div className="settings-divider" />

          <div className="settings-form-content">
            {activeTab === 'export' && (
              <ExportSettings getValue={getValue} setFormData={setFormData} setPickerOpen={setPickerOpen} />
            )}

            {activeTab === 'account' && (
              <AccountSettings 
                passwordData={passwordData} 
                setPasswordData={setPasswordData}
                showPasswords={showPasswords}
                setShowPasswords={setShowPasswords}
              />
            )}

            {activeTab === 'tokens' && (
              <TokenSettings
                getValue={getValue}
                setFormData={setFormData}
                visibleTokens={visibleTokens}
                setVisibleTokens={setVisibleTokens}
                showAddToken={showAddToken}
                setShowAddToken={setShowAddToken}
              />
            )}

            {activeTab === 'webhook' && (
              <WebhookSettings getValue={getValue} setFormData={setFormData} />
            )}
          </div>

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