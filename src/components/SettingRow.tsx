function SettingRow({
  label, hint, children, noBorder = true
}: {
  label: React.ReactNode; hint?: string; children: React.ReactNode; noBorder?: boolean
}) {
  return (
    <div style={{
      padding: '20px 0',
      borderBottom: noBorder ? 'none' : '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '2px' }}>{label}</div>
        {hint && <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{hint}</div>}
      </div>
      <div style={{ marginTop: '4px' }}>{children}</div>
    </div>
  )
}

export default SettingRow