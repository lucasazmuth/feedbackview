const pulse = {
  animation: 'pulse 1.5s ease-in-out infinite',
  background: 'var(--neutral-alpha-weak)',
  borderRadius: '0.5rem',
} as const

export function SkeletonShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-background)' }}>
        {/* Sidebar skeleton - fixed */}
        <div
          style={{
            width: '15rem',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            borderRight: '1px solid var(--neutral-border-medium)',
            padding: '1.5rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            background: 'var(--surface-background)',
            zIndex: 100,
          }}
        >
          <div style={{ paddingLeft: '0.75rem' }}>
            <div style={{ ...pulse, width: '4rem', height: '1.5rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  ...pulse,
                  width: '100%',
                  height: '2.25rem',
                  borderRadius: '0.5rem',
                  opacity: i === 1 ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>
        {/* Content area */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: '15rem' }}>
          {children}
        </div>
      </div>
    </>
  )
}

export { pulse }
