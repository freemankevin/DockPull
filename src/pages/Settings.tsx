import { useState } from 'react'
import { Save, TestTube } from 'lucide-react'
import { useConfig } from '../hooks/useConfig'
import { webhookApi } from '../api'

export default function Settings() {
  const { config, loading, updateConfig } = useConfig()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<any>({})

  if (loading || !config) {
    return <div className="card">加载中...</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await updateConfig({ ...config, ...formData })
    setSaving(false)
    setFormData({})
    alert('保存成功')
  }

  const handleTestWebhook = async () => {
    try {
      await webhookApi.test()
      alert('测试消息已发送')
    } catch (err: any) {
      alert('发送失败: ' + err.message)
    }
  }

  const getValue = (key: string) => formData[key] ?? config[key as keyof typeof config]

  return (
    <div>
      <div className="page-header">
        <h1>系统设置</h1>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginBottom: '20px', color: '#1a1a2e' }}>基础配置</h3>

          <div className="form-group">
            <label>导出目录</label>
            <input
              type="text"
              className="form-control"
              value={getValue('export_path')}
              onChange={(e) => setFormData({ ...formData, export_path: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>默认平台架构</label>
            <select
              className="form-control"
              value={getValue('default_platform')}
              onChange={(e) => setFormData({ ...formData, default_platform: e.target.value })}
            >
              <option value="linux/amd64">linux/amd64</option>
              <option value="linux/arm64">linux/arm64</option>
              <option value="linux/arm/v7">linux/arm/v7</option>
              <option value="linux/386">linux/386</option>
            </select>
          </div>

          <div className="form-group">
            <label>并发拉取数</label>
            <input
              type="number"
              className="form-control"
              value={getValue('concurrent_pulls')}
              onChange={(e) => setFormData({ ...formData, concurrent_pulls: parseInt(e.target.value) })}
              min={1}
              max={10}
            />
          </div>

          <div className="form-group">
            <label>Gzip 压缩级别 (1-9)</label>
            <input
              type="number"
              className="form-control"
              value={getValue('gzip_compression')}
              onChange={(e) => setFormData({ ...formData, gzip_compression: parseInt(e.target.value) })}
              min={1}
              max={9}
            />
          </div>

          <h3 style={{ margin: '30px 0 20px', color: '#1a1a2e' }}>重试配置</h3>

          <div className="form-group">
            <label>最大重试次数 (0 = 无限重试)</label>
            <input
              type="number"
              className="form-control"
              value={getValue('retry_max_attempts')}
              onChange={(e) => setFormData({ ...formData, retry_max_attempts: parseInt(e.target.value) })}
              min={0}
            />
          </div>

          <div className="form-group">
            <label>重试间隔（秒）</label>
            <input
              type="number"
              className="form-control"
              value={getValue('retry_interval_sec')}
              onChange={(e) => setFormData({ ...formData, retry_interval_sec: parseInt(e.target.value) })}
              min={1}
            />
          </div>

          <h3 style={{ margin: '30px 0 20px', color: '#1a1a2e' }}>Webhook 通知</h3>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={getValue('enable_webhook')}
                onChange={(e) => setFormData({ ...formData, enable_webhook: e.target.checked })}
              /> 启用 Webhook 通知
            </label>
          </div>

          <div className="form-group">
            <label>Webhook 类型</label>
            <select
              className="form-control"
              value={getValue('webhook_type')}
              onChange={(e) => setFormData({ ...formData, webhook_type: e.target.value })}
            >
              <option value="dingtalk">钉钉</option>
              <option value="feishu">飞书</option>
              <option value="wechat">企业微信</option>
            </select>
          </div>

          <div className="form-group">
            <label>Webhook URL</label>
            <input
              type="text"
              className="form-control"
              value={getValue('webhook_url')}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={18} /> {saving ? '保存中...' : '保存设置'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handleTestWebhook}
              disabled={!getValue('enable_webhook')}
            >
              <TestTube size={18} /> 测试 Webhook
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
