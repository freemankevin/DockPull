import { Key, Plus, X } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import SettingRow from '../../components/SettingRow'
import { TOKEN_REGISTRY_CONFIG_KEYS } from '../../constants/settings'

interface TokenSettingsProps {
  getValue: (key: string) => any
  setFormData: (data: any) => void
  visibleTokens: string[]
  setVisibleTokens: (tokens: string[]) => void
  showAddToken: boolean
  setShowAddToken: (show: boolean) => void
}

export default function TokenSettings({ getValue, setFormData, visibleTokens, setVisibleTokens, showAddToken, setShowAddToken }: TokenSettingsProps) {
  const { t } = useLanguage()

  const getTokenRegistryConfig = (tokenId: string) => {
    const configs: Record<string, { name: string; hint: string; fields: { key: string; placeholder: string; type: string }[]; checkKeys: string[] }> = {
      dockerhub: {
        name: t('token.dockerhub.name'),
        hint: t('token.dockerhub.hint'),
        fields: [
          { key: 'dockerhub_username', placeholder: t('token.dockerhub.username'), type: 'text' },
          { key: 'dockerhub_token', placeholder: t('token.dockerhub.token'), type: 'password' },
        ],
        checkKeys: ['dockerhub_username', 'dockerhub_token'],
      },
      ghcr: {
        name: t('token.ghcr.name'),
        hint: t('token.ghcr.hint'),
        fields: [
          { key: 'ghcr_token', placeholder: t('token.ghcr.token'), type: 'password' },
        ],
        checkKeys: ['ghcr_token'],
      },
      quay: {
        name: t('token.quay.name'),
        hint: t('token.quay.hint'),
        fields: [
          { key: 'quay_token', placeholder: t('token.quay.token'), type: 'password' },
        ],
        checkKeys: ['quay_token'],
      },
      acr: {
        name: t('token.acr.name'),
        hint: t('token.acr.hint'),
        fields: [
          { key: 'acr_username', placeholder: t('token.acr.username'), type: 'text' },
          { key: 'acr_password', placeholder: t('token.acr.password'), type: 'password' },
        ],
        checkKeys: ['acr_username', 'acr_password'],
      },
      ecr: {
        name: t('token.ecr.name'),
        hint: t('token.ecr.hint'),
        fields: [
          { key: 'ecr_access_key_id', placeholder: t('token.ecr.accessKey'), type: 'password' },
          { key: 'ecr_secret_access_key', placeholder: t('token.ecr.secretKey'), type: 'password' },
          { key: 'ecr_region', placeholder: t('token.ecr.region'), type: 'text' },
        ],
        checkKeys: ['ecr_access_key_id', 'ecr_secret_access_key'],
      },
      gar: {
        name: t('token.gar.name'),
        hint: t('token.gar.hint'),
        fields: [
          { key: 'gar_token', placeholder: t('token.gar.token'), type: 'password' },
        ],
        checkKeys: ['gar_token'],
      },
    }
    return configs[tokenId]
  }

  const getAvailableTokens = () => {
    return Object.keys(TOKEN_REGISTRY_CONFIG_KEYS).filter(id => !visibleTokens.includes(id))
  }

  const addTokenRegistry = (tokenId: string) => {
    if (!visibleTokens.includes(tokenId)) {
      setVisibleTokens([...visibleTokens, tokenId])
      setShowAddToken(false)
    }
  }

  const removeTokenRegistry = (tokenId: string) => {
    setVisibleTokens(visibleTokens.filter(id => id !== tokenId))
    const registry = getTokenRegistryConfig(tokenId)
    if (registry) {
      registry.fields.forEach(field => {
        const newFormData = { ...getValue('formData') }
        delete newFormData[field.key]
        setFormData(newFormData)
      })
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
          <Key size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
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
                     gap: '10px',
                     padding: '10px 14px',
                     border: '1px solid var(--border-color)',
                     borderRadius: 'var(--radius-xs)',
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