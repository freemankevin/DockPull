import { Plus, X, Upload, FileText } from 'lucide-react'
import { useState, useRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import SettingRow from '../../components/SettingRow'
import { TokenRegistryIcon } from '../../components/ImageComponents'
import { TOKEN_REGISTRY_CONFIG_KEYS, TOKEN_REGISTRY_CONFIG, TokenRegistryId } from '../../constants/settings'

interface TokenSettingsProps {
  getValue: (key: string) => any
  setFormData: (data: any) => void
  visibleTokens: TokenRegistryId[]
  setVisibleTokens: (tokens: TokenRegistryId[]) => void
  showAddToken: boolean
  setShowAddToken: (show: boolean) => void
}

export default function TokenSettings({ getValue, setFormData, visibleTokens, setVisibleTokens, showAddToken, setShowAddToken }: TokenSettingsProps) {
  const { t } = useLanguage()
  const [certInputMode, setCertInputMode] = useState<'paste' | 'upload'>('paste')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getTokenRegistryConfig = (tokenId: TokenRegistryId) => {
    return TOKEN_REGISTRY_CONFIG[tokenId]
  }

  const getAvailableTokens = (): TokenRegistryId[] => {
    const all = (Object.keys(TOKEN_REGISTRY_CONFIG_KEYS) as TokenRegistryId[]).filter(id => !visibleTokens.includes(id))
    return all.sort((a, b) => {
      const nameA = TOKEN_REGISTRY_CONFIG[a]?.name || a
      const nameB = TOKEN_REGISTRY_CONFIG[b]?.name || b
      return nameA.length - nameB.length
    })
  }

  const addTokenRegistry = (tokenId: TokenRegistryId) => {
    if (!visibleTokens.includes(tokenId)) {
      setVisibleTokens([...visibleTokens, tokenId])
      setShowAddToken(false)
    }
  }

  const removeTokenRegistry = (tokenId: TokenRegistryId) => {
    setVisibleTokens(visibleTokens.filter(id => id !== tokenId))
    const registry = getTokenRegistryConfig(tokenId)
    if (registry) {
      registry.fields.forEach((field: { key: string }) => {
        const newFormData = { ...getValue('formData') }
        delete newFormData[field.key]
        setFormData(newFormData)
      })
      if (tokenId === 'harbor') {
        const newFormData = { ...getValue('formData') }
        delete newFormData['harbor_tls_cert']
        setFormData(newFormData)
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        setFormData({ harbor_tls_cert: content })
      }
      reader.readAsText(file)
    }
  }

  return (
    <>
{visibleTokens.length === 0 && !showAddToken && (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ marginBottom: '12px', opacity: 0.5, display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <TokenRegistryIcon tokenId="dockerhub" />
            <TokenRegistryIcon tokenId="ghcr" />
            <TokenRegistryIcon tokenId="quay" />
            <TokenRegistryIcon tokenId="acr" />
            <TokenRegistryIcon tokenId="ecr" />
            <TokenRegistryIcon tokenId="gar" />
          </div>
          <p style={{ margin: 0, fontSize: '14px' }}>{t('settings.tokens.none')}</p>
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
              borderRadius: 'var(--radius-xs)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> {t('settings.tokens.add')}
          </button>
        </div>
      )}

      {visibleTokens.map((tokenId, index) => {
        const registry = getTokenRegistryConfig(tokenId)
        if (!registry) return null

        return (
          <SettingRow
            key={tokenId}
label={
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TokenRegistryIcon tokenId={tokenId} />
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
                    borderRadius: 'var(--radius-xs)',
                  }}
                  title={t('settings.tokens.remove')}
                >
                  <X size={14} />
                </button>
              </div>
            }
            hint={registry.hint}
            noBorder={index === visibleTokens.length - 1 && !showAddToken}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {registry.fields.map(field => (
                  <input
                    key={field.key}
                    type={field.type}
                    className="form-control"
                    value={getValue(field.key) || ''}
                    onChange={e => setFormData({ [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    style={{ flex: registry.fields.length > 1 ? 1 : undefined }}
                  />
                ))}
              </div>
              {tokenId === 'harbor' && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {t('token.harbor.tlsCert')} ({t('token.harbor.optional')})
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCertInputMode('paste')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        border: certInputMode === 'paste' ? '1px solid var(--purple-600)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-xs)',
                        background: certInputMode === 'paste' ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                        color: certInputMode === 'paste' ? 'var(--purple-400)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <FileText size={12} style={{ marginRight: '4px' }} />
                      {t('token.harbor.paste')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCertInputMode('upload')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        border: certInputMode === 'upload' ? '1px solid var(--purple-600)' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-xs)',
                        background: certInputMode === 'upload' ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                        color: certInputMode === 'upload' ? 'var(--purple-400)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <Upload size={12} style={{ marginRight: '4px' }} />
                      {t('token.harbor.upload')}
                    </button>
                  </div>
                  {certInputMode === 'paste' ? (
                    <textarea
                      className="form-control"
                      value={getValue('harbor_tls_cert') || ''}
                      onChange={e => setFormData({ harbor_tls_cert: e.target.value })}
                      placeholder={t('token.harbor.certPlaceholder')}
                      rows={4}
                      style={{ fontSize: '12px', fontFamily: 'monospace' }}
                    />
                  ) : (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".crt,.cer,.cert,.pem"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-xs)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        <Upload size={14} style={{ marginRight: '6px' }} />
                        {t('token.harbor.selectFile')}
                      </button>
                      {getValue('harbor_tls_cert') && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--green-500)' }}>
                          ✓ {t('token.harbor.certLoaded')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </SettingRow>
        )
      })}

      {showAddToken && (
<div style={{
           marginTop: visibleTokens.length > 0 ? '20px' : 0,
           padding: '16px',
           background: 'var(--bg-tertiary)',
           borderRadius: 'var(--radius-card)',
           border: '1px solid var(--border-color)',
         }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {t('settings.tokens.select')}
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
                 borderRadius: 'var(--radius-xs)',
               }}
              title={t('settings.tokens.close')}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {getAvailableTokens().map(tokenId => {
              const registry = getTokenRegistryConfig(tokenId)
              if (!registry) return null
              return (
                <button
                  key={tokenId}
                  onClick={() => addTokenRegistry(tokenId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 18px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textAlign: 'left',
                  }}
                >
                  <TokenRegistryIcon tokenId={tokenId} />
                  {registry.name}
                </button>
              )
            })}
            {getAvailableTokens().length === 0 && (
              <div style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                {t('settings.tokens.allConfigured')}
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
             borderRadius: 'var(--radius-xs)',
             background: 'var(--bg-secondary)',
             color: 'var(--text-secondary)',
             cursor: 'pointer',
           }}
        >
          <Plus size={14} /> {t('settings.tokens.addAnother')}
        </button>
      )}
    </>
  )
}