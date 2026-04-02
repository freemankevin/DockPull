import { useEffect, useState } from 'react'
import { statsApi } from '../api'
import { Package, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function Stats() {
  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, pending: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await statsApi.get()
        setStats(res.data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const cards = [
    { title: '总镜像数', value: stats.total, icon: Package, color: '#0f3460' },
    { title: '成功', value: stats.success, icon: CheckCircle, color: '#28a745' },
    { title: '失败', value: stats.failed, icon: XCircle, color: '#dc3545' },
    { title: '待处理', value: stats.pending, icon: Clock, color: '#ffc107' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>统计概览</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        {cards.map((card) => (
          <div key={card.title} className="card" style={{ borderLeft: `4px solid ${card.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '8px' }}>{card.title}</p>
                <p style={{ fontSize: '36px', fontWeight: 'bold', color: card.color }}>{card.value}</p>
              </div>
              <card.icon size={48} color={card.color} opacity={0.2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
