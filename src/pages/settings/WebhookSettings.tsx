import SettingRow from '../../components/SettingRow'
import Select from '../../components/Select'

interface WebhookSettingsProps {
  getValue: (key: string) => any
  setFormData: (data: any) => void
}

export default function WebhookSettings({ getValue, setFormData }: WebhookSettingsProps) {
  return (
    <>
      <SettingRow label="Enable Webhooks" hint="Send a POST request when pulls finish.">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
          <div
            onClick={() => setFormData({ enable_webhook: !getValue('enable_webhook') })}
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
            onChange={value => setFormData({ webhook_type: value })}
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
          onChange={e => setFormData({ webhook_url: e.target.value })}
          placeholder="https://..."
          disabled={!getValue('enable_webhook')} />
      </SettingRow>
    </>
  )
}