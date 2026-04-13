import { Folder, Cpu } from 'lucide-react'
import SettingRow from '../../components/SettingRow'

interface ExportSettingsProps {
  getValue: (key: string) => any
  setFormData: (data: any) => void
  setPickerOpen: (open: boolean) => void
}

export default function ExportSettings({ getValue, setFormData, setPickerOpen }: ExportSettingsProps) {
  return (
    <>
      <SettingRow label="Export Directory" hint="Directory where pulled images are saved.">
        <div className="input-with-button">
          <input type="text" className="form-control"
            value={getValue('export_path') || ''}
            onChange={e => setFormData({ export_path: e.target.value })}
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
                    setFormData({ default_platform: platforms.join(',') })
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
            onChange={e => setFormData({ concurrent_pulls: parseInt(e.target.value) })}
            min={1} max={10} />
        </SettingRow>
        <SettingRow label="Gzip Compression" hint="Compression level (1–9)." noBorder>
          <input type="number" className="form-control" style={{ maxWidth: '120px' }}
            value={getValue('gzip_compression') ?? 6}
            onChange={e => setFormData({ gzip_compression: parseInt(e.target.value) })}
            min={1} max={9} />
        </SettingRow>
      </div>

      <div className="settings-divider" style={{ margin: '24px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
        <SettingRow label="Max Retries" hint="Set 0 for unlimited retries." noBorder>
          <input type="number" className="form-control" style={{ maxWidth: '120px' }}
            value={getValue('retry_max_attempts') ?? 3}
            onChange={e => setFormData({ retry_max_attempts: parseInt(e.target.value) })}
            min={0} />
        </SettingRow>
        <SettingRow label="Retry Interval (s)" hint="Seconds between each attempt." noBorder>
          <input type="number" className="form-control" style={{ maxWidth: '120px' }}
            value={getValue('retry_interval_sec') ?? 30}
            onChange={e => setFormData({ retry_interval_sec: parseInt(e.target.value) })}
            min={1} />
        </SettingRow>
      </div>
    </>
  )
}