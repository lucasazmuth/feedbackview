const pulse = {
  animation: 'pulse 1.5s ease-in-out infinite',
  background: 'var(--neutral-alpha-weak)',
  borderRadius: '0.5rem',
} as const

function PageHeaderSkeleton() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        padding: '0 1.5rem',
        borderBottom: '1px solid var(--neutral-border-medium)',
        background: 'var(--surface-background)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ ...pulse, width: '3.25rem', height: '1.25rem', borderRadius: '0.375rem' }} />
        <div style={{ ...pulse, width: '2.25rem', height: '1.25rem', borderRadius: '0.25rem' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ ...pulse, width: '9rem', height: '2.25rem', borderRadius: '0.5rem' }} />
        <div style={{ ...pulse, width: '5.5rem', height: '2.25rem', borderRadius: '0.5rem' }} />
        <div style={{ ...pulse, width: 36, height: 36, borderRadius: '50%' }} />
      </div>
    </header>
  )
}

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
        {/* Main column — mirrors AppLayout (header + scroll) */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: '15rem',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
          }}
        >
          <PageHeaderSkeleton />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

export { pulse }

/** Inline skeleton bar – use inside AppLayout for client-side loading states */
export function SkeletonBar({ width, height = '1rem', radius }: { width: string; height?: string; radius?: string }) {
  return <div style={{ ...pulse, width, height, borderRadius: radius || '0.5rem' }} />
}

export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--neutral-border-medium)',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      {children}
    </div>
  )
}

/** Skeleton do conteúdo de /plans — alinhado a app-page + app-card */
export function PlansPageLoadingContent() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SkeletonBar width="6rem" height="1.75rem" />
        <SkeletonBar width="min(36rem, 100%)" height="0.875rem" />
      </div>
      <SkeletonCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <SkeletonBar width="8rem" height="1.25rem" />
              <SkeletonBar width="4rem" height="1.25rem" radius="999px" />
            </div>
            <SkeletonBar width="6rem" height="1.25rem" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <SkeletonBar width="8rem" height="2.25rem" />
            <SkeletonBar width="7rem" height="2.25rem" />
          </div>
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBar width="6rem" height="1.25rem" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonBar width="10rem" height="0.75rem" />
            <SkeletonBar width="4rem" height="0.75rem" />
          </div>
          <SkeletonBar width="100%" height="6px" radius="3px" />
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <SkeletonBar width="10rem" height="1.25rem" />
          <SkeletonBar width="9rem" height="2rem" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <SkeletonBar width="1.25rem" height="1.25rem" radius="50%" />
            <SkeletonBar width={`${Math.min(100, 55 + i * 8)}%`} height="0.875rem" />
          </div>
        ))}
      </SkeletonCard>
    </>
  )
}

/** Skeleton de /plans/upgrade — grid de planos + bloco comparativo */
export function PlansUpgradeLoadingContent() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <SkeletonBar width="11rem" height="2rem" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
          <SkeletonBar width="12rem" height="1.5rem" />
          <div style={{ width: '100%', maxWidth: '42rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', alignItems: 'center' }}>
            <SkeletonBar width="100%" height="0.875rem" />
            <SkeletonBar width="95%" height="0.875rem" />
            <SkeletonBar width="70%" height="0.875rem" />
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          width: '100%',
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              padding: '1.75rem',
              borderRadius: '1rem',
              border: '1px solid var(--neutral-border-medium)',
              background: 'var(--surface-background)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <SkeletonBar width="5rem" height="1.125rem" />
              <SkeletonBar width="7rem" height="2rem" />
              <SkeletonBar width="100%" height="0.8125rem" />
            </div>
            <SkeletonBar width="100%" height="1px" radius="0" />
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <SkeletonBar width="1.125rem" height="1.125rem" radius="50%" />
                <SkeletonBar width={`${65 + j * 5}%`} height="0.8125rem" />
              </div>
            ))}
            <SkeletonBar width="100%" height="2.75rem" radius="0.75rem" />
          </div>
        ))}
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <SkeletonCard>
          <SkeletonBar width="14rem" height="1rem" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <SkeletonBar width="100%" height="2.5rem" />
            {[1, 2, 3, 4].map((k) => (
              <SkeletonBar key={k} width="100%" height="2.25rem" />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </>
  )
}
