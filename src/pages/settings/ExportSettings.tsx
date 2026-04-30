import { useState, useEffect } from 'react'
import { Folder, Cpu, Container, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { configApi } from '../../api'
import SettingRow from '../../components/SettingRow'

interface ExportSettingsProps {
  getValue: (key: string) => any
  setFormData: (data: any) => void
  setPickerOpen: (open: boolean) => void
}

interface RuntimeStatus {
  docker_available: boolean
  podman_available: boolean
  current_runtime: string
  recommended: string
}

export default function ExportSettings({ getValue, setFormData, setPickerOpen }: ExportSettingsProps) {
  const { t } = useLanguage()
  const { showToast } = useToast()
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null)
  const [detecting, setDetecting] = useState(false)

  const detectRuntime = async () => {
    setDetecting(true)
    try {
      const res = await configApi.detectRuntime()
      setRuntimeStatus(res.data)
      if (res.data.recommended !== getValue('container_runtime')) {
        setFormData({ container_runtime: res.data.recommended })
        showToast('success', t('settings.export.runtimeDetected') + ': ' + res.data.recommended)
      }
    } catch (err) {
      showToast('error', t('settings.export.runtimeDetectFailed'))
    } finally {
      setDetecting(false)
    }
  }

  useEffect(() => {
    detectRuntime()
  }, [])

  return (
    <>
      <SettingRow label={t('settings.export.directory')} hint={t('settings.export.directoryHint')}>
        <div className="input-with-button">
          <input type="text" className="form-control"
            value={getValue('export_path') || ''}
            onChange={e => setFormData({ export_path: e.target.value })}
            placeholder="./exports" />
          <button type="button" className="btn btn-secondary" onClick={() => setPickerOpen(true)} title={t('settings.export.browse')}>
            <Folder size={14} />
          </button>
        </div>
      </SettingRow>

      <SettingRow label={t('settings.export.platform')} hint={t('settings.export.platformHint')}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[{ val: 'linux/amd64', label: 'AMD64' }, { val: 'linux/arm64', label: 'ARM64' }].map(({ val, label }) => {
            const current = getValue('default_platform') || 'linux/amd64,linux/arm64'
            const checked = current.includes(val)
            const isAMD64 = val.includes('amd64')
            const isARM64 = val.includes('arm64')
            
            const baseStyle = {
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: 'var(--radius-xs)', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500,
              transition: 'all 0.12s',
            }
            
            const selectedStyle = {
              ...baseStyle,
              border: `1px solid ${isAMD64 ? 'rgba(34, 197, 94, 0.3)' : isARM64 ? 'rgba(234, 179, 8, 0.3)' : 'var(--purple-600)'}`,
              background: isAMD64 ? 'rgba(34, 197, 94, 0.12)' : isARM64 ? 'rgba(234, 179, 8, 0.12)' : 'var(--accent-bg)',
              color: isAMD64 ? 'var(--green-500)' : isARM64 ? 'var(--yellow-500)' : 'var(--purple-400)',
            }
            
            const unselectedStyle = {
              ...baseStyle,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }
            
            return (
              <label key={val} style={checked ? selectedStyle : unselectedStyle}>
                <Cpu size={14} style={{ color: checked ? (isAMD64 ? 'var(--green-500)' : isARM64 ? 'var(--yellow-500)' : 'var(--purple-400)') : 'var(--text-muted)' }} />
                <input type="checkbox" checked={checked} style={{ display: 'none' }}
                  onChange={e => {
                    const platforms = current.split(',').filter((p: string) => p.trim())
                    if (e.target.checked) { if (!platforms.includes(val)) platforms.push(val) }
                    else { const idx = platforms.indexOf(val); if (idx > -1) platforms.splice(idx, 1) }
                    setFormData({ default_platform: platforms.join(',') })
                  }} />
                {label}
              </label>
            )
          })}
        </div>
      </SettingRow>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
        <SettingRow label={t('settings.export.concurrent')} hint={t('settings.export.concurrentHint')} noBorder>
          <input type="number" className="form-control" style={{ maxWidth: '120px' }}
            value={getValue('concurrent_pulls') ?? 3}
            onChange={e => setFormData({ concurrent_pulls: parseInt(e.target.value) })}
            min={1} max={10} />
        </SettingRow>
        <SettingRow label={t('settings.export.gzip')} hint={t('settings.export.gzipHint')} noBorder>
          <input type="number" className="form-control" style={{ maxWidth: '120px' }}
            value={getValue('gzip_compression') ?? 6}
            onChange={e => setFormData({ gzip_compression: parseInt(e.target.value) })}
            min={1} max={9} />
        </SettingRow>
      </div>

      <div className="settings-divider" style={{ margin: '24px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
        <SettingRow label={t('settings.export.retries')} hint={t('settings.export.retriesHint')} noBorder>
          <input type="number" className="form-control" style={{ maxWidth: '120px' }}
            value={getValue('retry_max_attempts') ?? 3}
            onChange={e => setFormData({ retry_max_attempts: parseInt(e.target.value) })}
            min={0} />
        </SettingRow>
        <SettingRow label={t('settings.export.retryInterval')} hint={t('settings.export.retryIntervalHint')} noBorder>
          <input type="number" className="form-control" style={{ maxWidth: '120px' }}
            value={getValue('retry_interval_sec') ?? 30}
            onChange={e => setFormData({ retry_interval_sec: parseInt(e.target.value) })}
            min={1} />
        </SettingRow>
      </div>

      <SettingRow label={t('settings.export.runtime')} hint={t('settings.export.runtimeHint')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[{ val: 'docker', label: t('settings.export.runtimeDocker') }, { val: 'podman', label: t('settings.export.runtimePodman') }].map(({ val, label }) => {
              const current = getValue('container_runtime') || 'docker'
              const selected = current === val
              const available = runtimeStatus ? (val === 'docker' ? runtimeStatus.docker_available : runtimeStatus.podman_available) : null
              
              return (
                <label key={val} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', borderRadius: 'var(--radius-xs)', cursor: available === false ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 500, transition: 'all 0.12s',
                  border: selected ? '1px solid var(--purple-600)' : '1px solid var(--border-color)',
                  background: selected ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
                  color: selected ? 'var(--purple-400)' : 'var(--text-secondary)',
                  opacity: available === false ? 0.5 : 1,
                }}>
                  <Container size={14} style={{ color: selected ? 'var(--purple-400)' : 'var(--text-muted)' }} />
                  <input type="radio" name="container_runtime" checked={selected} style={{ display: 'none' }}
                    onChange={() => available !== false && setFormData({ container_runtime: val })} />
                  {label}
                  {available !== null && (
                    available ? 
                      <CheckCircle size={12} style={{ color: 'var(--green-500)' }} /> :
                      <XCircle size={12} style={{ color: 'var(--red-500)' }} />
                  )}
                </label>
              )
            })}
            <button type="button" className="btn btn-secondary" onClick={detectRuntime} disabled={detecting} title={t('settings.export.runtimeRefresh')}>
              <RefreshCw size={14} className={detecting ? 'spin' : ''} />
            </button>
          </div>
          {runtimeStatus && !runtimeStatus.docker_available && !runtimeStatus.podman_available && (
            <div style={{ color: 'var(--red-500)', fontSize: '12px' }}>
              {t('settings.export.runtimeNoneAvailable')}
            </div>
          )}
        </div>
      </SettingRow>
    </>
  )
}