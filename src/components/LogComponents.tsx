import { useState, useEffect, useRef } from 'react'
import { Plus, Clock, Download, CheckCircle, AlertCircle, ArrowRightFromLine, ArrowRightLeft, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { ACTION_META_LABELS } from '../constants/logs'

const ACTION_ICONS: Record<string, React.ReactNode> = {
  CREATE:         <Plus size={11} />,
  UPDATE:         <Clock size={11} />,
  PULL_START:     <Download size={11} />,
  PULL_SUCCESS:   <CheckCircle size={11} />,
  PULL_FAILED:    <AlertCircle size={11} />,
  EXPORT_START:   <ArrowRightFromLine size={11} />,
  EXPORT_SUCCESS: <CheckCircle size={11} />,
  EXPORT_FAILED:  <AlertCircle size={11} />,
  PLATFORM_CHANGED: <ArrowRightLeft size={11} />,
}

export function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META_LABELS[action] || { 
    label: action, 
    color: 'var(--text-secondary)', 
    bg: 'var(--bg-tertiary)', 
    border: 'var(--border-color)',
  }
  const icon = ACTION_ICONS[action] || null
  
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 500,
      color: meta.color, background: meta.bg,
      border: `1px solid ${meta.border}`,
      whiteSpace: 'nowrap', flexShrink: 0,
      lineHeight: 1.5,
    }}>
      {icon}
      {meta.label}
    </span>
  )
}

export function FilterChip({
  label, value, options, onChange
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '5px 12px', height: '32px',
          border: value !== 'all' ? '1px solid var(--purple-600)' : '1px solid var(--border-color)',
          borderRadius: '6px', cursor: 'pointer',
          background: value !== 'all' ? 'var(--accent-bg)' : 'var(--bg-tertiary)',
          color: value !== 'all' ? 'var(--purple-400)' : 'var(--text-secondary)',
          fontSize: '13px', fontWeight: 400,
          whiteSpace: 'nowrap', transition: 'all .12s',
        }}
      >
        {value === 'all' ? label : selected?.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ opacity: .5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .12s' }}>
          <path d="M5 7L1 3h8z"/>
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            minWidth: '200px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)', borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)', zIndex: 100, overflow: 'hidden',
            animation: 'fadeIn .12s ease',
          }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                padding: '8px 12px', fontSize: '13px', cursor: 'pointer',
                color: opt.value === value ? 'var(--purple-400)' : 'var(--text-primary)',
                background: opt.value === value ? 'var(--accent-bg)' : 'transparent',
                transition: 'background .1s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)' }}
              onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ExpandableText({ 
  text, 
  expandKey, 
  expandedLogs, 
  setExpandedLogs,
  fontSize = '13px',
  fontFamily = 'inherit',
  color = 'var(--text-secondary)',
  showCopy = false
}: {
  text: string
  expandKey: string
  expandedLogs: Set<string>
  setExpandedLogs: React.Dispatch<React.SetStateAction<Set<string>>>
  fontSize?: string
  fontFamily?: string
  color?: string
  showCopy?: boolean
}) {
  const isExpanded = expandedLogs.has(expandKey)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const textRef = useRef<HTMLSpanElement>(null)
  const [copied, setCopied] = useState(false)
  
  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth)
      }
    }
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [text])
  
  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newSet = new Set(expandedLogs)
    if (isExpanded) {
      newSet.delete(expandKey)
    } else {
      newSet.add(expandKey)
    }
    setExpandedLogs(newSet)
  }
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }
  
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: isExpanded ? 'flex-start' : 'center', 
      gap: '4px',
      minWidth: 0,
    }}>
      <span 
        ref={textRef}
        style={{
          fontSize, fontFamily, color,
          overflow: isExpanded ? 'visible' : 'hidden',
          textOverflow: isExpanded ? 'clip' : 'ellipsis',
          whiteSpace: isExpanded ? 'normal' : 'nowrap',
          wordBreak: isExpanded ? 'break-word' : 'normal',
          flex: '1',
          minWidth: 0,
          lineHeight: 1.4,
        }}
        title={isExpanded ? undefined : text}
      >
        {text}
        {showCopy && (
          <button
            onClick={handleCopy}
            style={{
              border: 'none',
              background: copied ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              cursor: 'pointer',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              color: copied ? 'var(--green-500)' : 'var(--text-muted)',
              marginLeft: '4px',
              verticalAlign: 'middle',
              borderRadius: '3px',
            }}
            title={copied ? 'Copied!' : 'Copy message'}
          >
            {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
          </button>
        )}
      </span>
      {isOverflowing && !isExpanded && (
        <button
          onClick={toggleExpand}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-muted)',
            flexShrink: 0,
            lineHeight: 1,
          }}
          title="Expand"
        >
          <ChevronDown size={12} />
        </button>
      )}
      {isExpanded && (
        <button
          onClick={toggleExpand}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-muted)',
            flexShrink: 0,
            lineHeight: 1,
          }}
          title="Collapse"
        >
          <ChevronUp size={12} />
        </button>
      )}
    </div>
  )
}