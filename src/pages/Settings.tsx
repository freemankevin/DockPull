import { useState, useEffect, useCallback } from 'react'
import { User, ArrowRightFromLine, Key, Bell, Save, FlaskConical, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useConfig } from '../context/ConfigContext'
import { useToast } from '../context/ToastContext'
import { useLanguage } from '../context/LanguageContext'
import { useNavigationGuard } from '../context/NavigationGuardContext'
import { webhookApi, authApi } from '../api'
import DirectoryPicker from '../components/DirectoryPicker'
import { TabId, TAB_TITLE_KEYS, TOKEN_REGISTRY_CONFIG_KEYS, TOKEN_REGISTRY_CONFIG, TokenRegistryId } from '../constants/settings'
import ExportSettings from './settings/ExportSettings'
import AccountSettings from './settings/AccountSettings'
import TokenSettings from './settings/TokenSettings'
import WebhookSettings from './settings/WebhookSettings'

export default function Settings() {
  const { config, loading, updateConfig } = useConfig()
  const { showToast } = useToast()
  const { t } = useLanguage()
  const { setHasUnsavedChanges, onSaveHandler } = useNavigationGuard()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<Record<string, string | number | boolean>>({})
  const [activeTab, setActiveTab] = useState<TabId>('account')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false })
  const [visibleTokens, setVisibleTokens] = useState<TokenRegistryId[]>([])
  const [showAddToken, setShowAddToken] = useState(false)
  const [verifiedTokens, setVerifiedTokens] = useState<Record<TokenRegistryId, boolean>>({} as Record<TokenRegistryId, boolean>)

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'account', label: t('settings.tab.account'),  icon: <User size={16} /> },
    { id: 'export', label: t('settings.tab.export'),   icon: <ArrowRightFromLine size={16} /> },
    { id: 'tokens',  label: t('settings.tab.tokens'),   icon: <Key size={16} /> },
    { id: 'webhook', label: t('settings.tab.webhook'),  icon: <Bell size={16} /> },
  ]

  const getValue = (key: string) => formData[key] ?? (config as Record<string, any>)?.[key]

  const hasTokenConfig = (tokenId: TokenRegistryId, configData?: any) => {
    const checkKeysMap: Record<TokenRegistryId, string[]> = {
      dockerhub: ['dockerhub_username', 'dockerhub_token'],
      ghcr: ['ghcr_username', 'ghcr_token'],
      quay: ['quay_username', 'quay_password'],
      acr: ['acr_username', 'acr_password'],
      ecr: ['ecr_access_key_id', 'ecr_secret_access_key'],
      gar: ['gar_token'],
      harbor: ['harbor_url', 'harbor_username', 'harbor_password'],
      tencentcloud: ['tencentcloud_username', 'tencentcloud_password'],
      huaweicloud: ['huaweicloud_username', 'huaweicloud_password'],
    }
    const checkKeys = checkKeysMap[tokenId]
    if (!checkKeys) return false
    const data = configData || config
    return checkKeys.some(key => {
      const value = (data as Record<string, any>)?.[key]
      return value && String(value).trim() !== ''
    })
  }

  const updateVisibleTokensFromConfig = useCallback(() => {
    if (config) {
      const configuredTokens = (Object.keys(TOKEN_REGISTRY_CONFIG_KEYS) as TokenRegistryId[]).filter(id => hasTokenConfig(id, config))
      setVisibleTokens(configuredTokens)
      
      const initialVerified: Record<TokenRegistryId, boolean> = {} as Record<TokenRegistryId, boolean>
      const verifiedFields: Record<TokenRegistryId, string> = {
        dockerhub: 'dockerhub_verified',
        ghcr: 'ghcr_verified',
        quay: 'quay_verified',
        acr: 'acr_verified',
        ecr: 'ecr_verified',
        gar: 'gar_verified',
        harbor: 'harbor_verified',
        tencentcloud: 'tencentcloud_verified',
        huaweicloud: 'huaweicloud_verified',
      }
      for (const tokenId of configuredTokens) {
        const field = verifiedFields[tokenId]
        if (field && (config as Record<string, any>)?.[field]) {
          initialVerified[tokenId] = true
        }
      }
      setVerifiedTokens(initialVerified)
    }
  }, [config])

  useEffect(() => {
    updateVisibleTokensFromConfig()
  }, [config])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (activeTab === 'tokens') {
      for (const tokenId of visibleTokens) {
        const registry = TOKEN_REGISTRY_CONFIG[tokenId]
        if (!registry?.requireTest) continue
        
        const fields = registry.checkKeys
        const hasValue = fields.some(key => {
          const val = formData[key] !== undefined ? formData[key] : (config as Record<string, any>)?.[key]
          return val && String(val).trim() !== ''
        })
        
        if (hasValue && !verifiedTokens[tokenId]) {
          showToast('error', t('settings.tokens.mustVerifyFirst') + ': ' + registry.name)
          return
        }
      }
      
      const verifiedFields: Record<TokenRegistryId, string> = {
        dockerhub: 'dockerhub_verified',
        ghcr: 'ghcr_verified',
        quay: 'quay_verified',
        acr: 'acr_verified',
        ecr: 'ecr_verified',
        gar: 'gar_verified',
        harbor: 'harbor_verified',
        tencentcloud: 'tencentcloud_verified',
        huaweicloud: 'huaweicloud_verified',
      }
      for (const tokenId of visibleTokens) {
        const field = verifiedFields[tokenId]
        if (field) {
          formData[field] = verifiedTokens[tokenId] || false
        }
      }
    }
    
    setSaving(true)
    setSaveStatus('saving')
    try {
      if (activeTab === 'account' && passwordData.oldPassword && passwordData.newPassword) {
        if (passwordData.newPassword.length < 6) {
          showToast('error', t('settings.password.minLength'))
          setSaveStatus('error')
          setTimeout(() => setSaveStatus('idle'), 2000)
          setSaving(false)
          return
        }
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          showToast('error', t('settings.password.mismatch'))
          setSaveStatus('error')
          setTimeout(() => setSaveStatus('idle'), 2000)
          setSaving(false)
          return
        }
        await authApi.changePassword(passwordData.oldPassword, passwordData.newPassword)
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
        showToast('success', t('settings.password.success'))
      }

      if (Object.keys(formData).length > 0) {
        await updateConfig({ ...config, ...formData })
      }
      setFormData({})
      setSaveStatus('success')
      if (activeTab !== 'account') {
        showToast('success', t('settings.saved'))
      }
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err: any) {
      setSaveStatus('error')
      const errorMsg = err.response?.data?.error || t('settings.failed')
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
      showToast('success', t('settings.sent'))
      setTimeout(() => setTestStatus('idle'), 2000)
    } catch (err: any) {
      setTestStatus('error')
      showToast('error', t('settings.failed') + ': ' + err.message)
      setTimeout(() => setTestStatus('idle'), 2000)
    }
  }

  const handleSelectDir = (path: string) => {
    setFormData({ ...formData, export_path: path })
  }

  const hasUnsavedChanges = () => {
    if (!config) return false
    return Object.keys(formData).length > 0
  }

  const handleSaveConfig = async () => {
    try {
      await updateConfig({ ...config, ...formData })
      setFormData({})
      setSaveStatus('success')
      if (activeTab !== 'account') {
        showToast('success', t('settings.saved'))
      }
      setTimeout(() => setSaveStatus('idle'), 2000)
      return true
    } catch (err: any) {
      setSaveStatus('error')
      const errorMsg = err.response?.data?.error || t('settings.failed')
      showToast('error', errorMsg)
      setTimeout(() => setSaveStatus('idle'), 2000)
      return false
    }
  }

  useEffect(() => {
    onSaveHandler(handleSaveConfig)
  }, [config, formData, activeTab])

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges())
  }, [formData, config])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [formData, config])

  if (loading || !config) {
    return (
      <div className="settings-container">
        <div className="settings-loading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
            <div className="spin" style={{ width: '18px', height: '18px', border: '2px solid var(--border-color)', borderTopColor: 'var(--purple-500)', borderRadius: '50%' }} />
            {t('settings.loading')}
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
        initialPath={String(getValue('export_path') || '.')}
      />

      <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h2 className="settings-sidebar-title">{t('settings.title')}</h2>
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
            <h1 className="settings-page-title">{t(TAB_TITLE_KEYS[activeTab].title)}</h1>
            <p className="settings-page-subtitle">{t(TAB_TITLE_KEYS[activeTab].subtitle)}</p>
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
                formData={formData}
                setFormData={setFormData}
                visibleTokens={visibleTokens}
                setVisibleTokens={setVisibleTokens}
                showAddToken={showAddToken}
                setShowAddToken={setShowAddToken}
                verifiedTokens={verifiedTokens}
                setVerifiedTokens={setVerifiedTokens}
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
                <><Loader2 size={14} className="spin" /> {t('settings.saving')}</>
              ) : saveStatus === 'success' ? (
                <><CheckCircle size={14} /> {t('settings.saved')}</>
              ) : saveStatus === 'error' ? (
                <><AlertCircle size={14} /> {t('settings.failed')}</>
              ) : (
                <><Save size={14} /> {t('settings.save')}</>
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
                  <><Loader2 size={14} className="spin" /> {t('settings.testing')}</>
                ) : testStatus === 'success' ? (
                  <><CheckCircle size={14} /> {t('settings.sent')}</>
                ) : testStatus === 'error' ? (
                  <><AlertCircle size={14} /> {t('settings.failed')}</>
                ) : (
                  <><FlaskConical size={14} /> {t('settings.test')}</>
                )}
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
  )
}