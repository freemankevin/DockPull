import { useEffect, useState } from 'react'
import { statsApi } from '../api'
import { Package, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

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

  const successRate = stats.total > 0
    ? Math.round((stats.success / stats.total) * 100)
    : 0

  const cards = [
    {
      title: 'Total Images',
      value: stats.total,
      icon: Package,
      color: 'purple',
      description: 'All time image tasks',
    },
    {
      title: 'Successful',
      value: stats.success,
      icon: CheckCircle,
      color: 'green',
      description: 'Pulled successfully',
    },
    {
      title: 'Failed',
      value: stats.failed,
      icon: XCircle,
      color: 'red',
      description: 'Pull failed',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'yellow',
      description: 'Queued or in progress',
    },
  ]

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header">
        <h1>Overview</h1>
      </div>

      {/* ── Stats Grid ── */}
      <div className="content-box">
        <div className="stats-grid">
          {cards.map((card) => (
            <div key={card.title} className={`stat-card stat-card-${card.color}`}>
              <div className="stat-card-content">
                <div className="stat-info">
                  <p className="stat-title">{card.title}</p>
                  <p className="stat-value">{card.value}</p>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {card.description}
                  </p>
                </div>
                <div className={`stat-icon-wrapper stat-icon-${card.color}`}>
                  <card.icon size={20} strokeWidth={1.75} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Success Rate Panel ── */}
      {stats.total > 0 && (
        <div className="content-box" style={{ marginTop: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <TrendingUp size={16} style={{ color: 'var(--purple-400)' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Success Rate
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Based on {stats.total} total task{stats.total !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {successRate}%
            </div>
          </div>

          {/* Progress bar */}
          <div style={{
            height: '6px',
            borderRadius: '3px',
            background: 'var(--bg-tertiary)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${successRate}%`,
              borderRadius: '3px',
              background: successRate >= 80
                ? 'var(--green-500)'
                : successRate >= 50
                  ? 'var(--yellow-500)'
                  : 'var(--red-500)',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
            {[
              { label: 'Success', value: stats.success, color: 'var(--green-500)' },
              { label: 'Failed',  value: stats.failed,  color: 'var(--red-500)' },
              { label: 'Pending', value: stats.pending, color: 'var(--yellow-500)' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: item.color,
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
