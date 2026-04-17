import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  style?: React.CSSProperties
}

export default function Select({ value, onChange, options, placeholder = 'Select...', style }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
style={{
           width: '100%',
           padding: '11px 14px',
           border: '1px solid var(--border-color)',
           borderRadius: 'var(--radius-card)',
           background: 'var(--bg-tertiary)',
           color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
           fontSize: '14px',
           textAlign: 'left',
           cursor: 'pointer',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'space-between',
           transition: 'border-color 0.15s ease',
           fontFamily: 'var(--font-sans)',
         }}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={14} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {isOpen && (
<div style={{
           position: 'absolute',
           top: 'calc(100% + 4px)',
           left: 0,
           right: 0,
           background: 'var(--bg-primary)',
           border: '1px solid var(--border-color)',
           borderRadius: 'var(--radius-card)',
           boxShadow: 'var(--shadow-lg)',
           zIndex: 100,
           overflow: 'hidden',
           maxHeight: '300px',
           overflowY: 'auto',
         }}>
          {options.map(opt => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: opt.value === value ? 'var(--accent-bg)' : 'transparent',
                color: opt.value === value ? 'var(--purple-400)' : 'var(--text-primary)',
                transition: 'background 0.1s ease',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                }
              }}
              onMouseLeave={(e) => {
                if (opt.value !== value) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && <Check size={14} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}