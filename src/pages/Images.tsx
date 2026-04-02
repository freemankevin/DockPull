import { useState } from 'react'
import { Plus, Trash2, Download, RefreshCw, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useImages } from '../hooks/useImages'
import type { Image } from '../types'

const platformOptions = [
  { value: 'linux/amd64', label: 'linux/amd64' },
  { value: 'linux/arm64', label: 'linux/arm64' },
  { value: 'linux/arm/v7', label: 'linux/arm/v7' },
  { value: 'linux/386', label: 'linux/386' },
]

function getStatusBadge(status: Image['status']) {
  switch (status) {
    case 'pending':
      return <span className="badge badge-pending"><Clock size={14} /> 待处理</span>
    case 'pulling':
      return <span className="badge badge-pulling"><Loader2 size={14} className="spin" /> 拉取中</span>
    case 'success':
      return <span className="badge badge-success"><CheckCircle size={14} /> 成功</span>
    case 'failed':
      return <span className="badge badge-failed"><AlertCircle size={14} /> 失败</span>
    default:
      return <span className="badge">{status}</span>
  }
}

export default function Images() {
  const { images, loading, createImage, deleteImage, pullImage, exportImage } = useImages()
  const [showModal, setShowModal] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    tag: 'latest',
    platform: 'linux/amd64',
    is_auto_export: false,
  })
  const [batchText, setBatchText] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (batchMode) {
      const lines = batchText.split('\n').filter(line => line.trim())
      for (const line of lines) {
        const [name, tag = 'latest'] = line.split(':')
        await createImage({ ...formData, name: name.trim(), tag: tag.trim() })
      }
    } else {
      await createImage(formData)
    }
    setShowModal(false)
    setFormData({ name: '', tag: 'latest', platform: 'linux/amd64', is_auto_export: false })
    setBatchText('')
  }

  return (
    <div>
      <div className="page-header">
        <h1>镜像管理</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> 添加镜像
        </button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>镜像名称</th>
              <th>标签</th>
              <th>架构</th>
              <th>状态</th>
              <th>重试次数</th>
              <th>导出路径</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {images.map((img) => (
              <tr key={img.id}>
                <td><code>{img.name}</code></td>
                <td>{img.tag}</td>
                <td>{img.platform}</td>
                <td>{getStatusBadge(img.status)}</td>
                <td>{img.retry_count}</td>
                <td>
                  {img.export_path ? (
                    <span className="text-sm text-gray-600" title={img.export_path}>
                      {img.export_path.split('/').pop()}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td>{new Date(img.created_at).toLocaleString()}</td>
                <td>
                  <div className="flex gap-2">
                    {img.status === 'failed' && (
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => pullImage(img.id)}
                        title="重新拉取"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                    {img.status === 'success' && !img.export_path && (
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={() => exportImage(img.id)}
                        title="导出"
                      >
                        <Download size={16} />
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteImage(img.id)}
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {images.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-500">
                  暂无镜像，点击右上角添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>添加镜像</h2>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    <input 
                      type="checkbox" 
                      checked={batchMode}
                      onChange={(e) => setBatchMode(e.target.checked)}
                    /> 批量添加模式
                  </label>
                </div>

                {batchMode ? (
                  <div className="form-group">
                    <label>镜像列表（每行一个，格式: name:tag）</label>
                    <textarea
                      className="form-control"
                      rows={6}
                      value={batchText}
                      onChange={(e) => setBatchText(e.target.value)}
                      placeholder="nginx:latest&#10;redis:7-alpine&#10;postgres:15"
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>镜像名称</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如: nginx"
                      required
                    />
                  </div>
                )}

                {!batchMode && (
                  <div className="form-group">
                    <label>标签</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.tag}
                      onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                      placeholder="latest"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>平台架构</label>
                  <select
                    className="form-control"
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  >
                    {platformOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_auto_export}
                      onChange={(e) => setFormData({ ...formData, is_auto_export: e.target.checked })}
                    /> 下载后自动导出
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {batchMode ? '批量添加' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
