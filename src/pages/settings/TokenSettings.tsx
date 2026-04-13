import { Key, Plus, X } from 'lucide-react'
import SettingRow from '../../components/SettingRow'
import { TOKEN_REGISTRY_CONFIG } from '../../constants/settings'

interface TokenSettingsProps {
  getValue: (key: string) => any
  setFormData: (data: any) => void
  visibleTokens: string[]
  setVisibleTokens: (tokens: string[]) => void
  showAddToken: boolean
  setShowAddToken: (show: boolean) => void
}

export default function TokenSettings({ getValue, setFormData, visibleTokens, setVisibleTokens, showAddToken, setShowAddToken }: TokenSettingsProps) {
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
    </>
  )
}