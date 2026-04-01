import { SkeletonShell, pulse, SkeletonBar } from '@/components/ui/LoadingSkeleton'

const TABLE_GRID =
  '1.25rem 1.5rem 5rem 6rem minmax(6rem, 1fr) 5rem 6rem 2.5rem minmax(6rem, 11rem)' as const

function StatBlock({ variant = 'neutral' }: { variant?: 'neutral' | 'danger' }) {
  const bg = variant === 'danger' ? 'var(--danger-alpha-weak)' : 'var(--neutral-alpha-weak)'
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.5rem',
        background: bg,
        minWidth: '3.25rem',
      }}
    >
      <SkeletonBar width="1.625rem" height="1.5rem" radius="0.375rem" />
      <div style={{ marginTop: '0.25rem', display: 'flex', justifyContent: 'center' }}>
        <SkeletonBar width="2.75rem" height="0.625rem" radius="0.25rem" />
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <SkeletonShell>
      <div className="app-page">
        {/* Cabeçalho — espelha ProjectClient (breadcrumb, título, URL, stats à direita) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minWidth: 0, flex: 1 }}>
              <SkeletonBar width="4.5rem" height="0.75rem" radius="0.25rem" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <SkeletonBar width="min(14rem, 55vw)" height="1.375rem" radius="0.375rem" />
                <SkeletonBar width="5.25rem" height="1.375rem" radius="999px" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', maxWidth: '24rem' }}>
                <SkeletonBar width="100%" height="0.8125rem" radius="0.25rem" />
                <SkeletonBar width="1.25rem" height="1.25rem" radius="0.25rem" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexShrink: 0 }}>
              <StatBlock />
              <StatBlock />
              <StatBlock variant="danger" />
              <StatBlock />
            </div>
          </div>

          {/* Abas Reports | Histórico | Configurações */}
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              borderBottom: '2px solid var(--neutral-border-medium)',
            }}
          >
            {[
              { labelW: '3.75rem', withBadge: true },
              { labelW: '4.25rem', withBadge: false },
              { labelW: '6.25rem', withBadge: false },
            ].map((tab, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 0 0.75rem',
                  marginBottom: '-2px',
                  borderBottom: i === 0 ? '2px solid var(--brand-solid-strong)' : '2px solid transparent',
                }}
              >
                <div style={{ ...pulse, width: tab.labelW, height: '0.875rem', borderRadius: '0.25rem' }} />
                {tab.withBadge && (
                  <div style={{ ...pulse, width: '1.625rem', height: '1.125rem', borderRadius: '999px' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Barra busca + filtros + export + toggle de vista (ProjectFeedbacksTab) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
          <div style={{ ...pulse, flex: 1, height: '2.5rem', borderRadius: '0.5rem', minWidth: 0 }} />
          <div style={{ ...pulse, width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', flexShrink: 0 }} />
          <div style={{ ...pulse, width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', flexShrink: 0 }} />
          <div style={{ display: 'flex', borderRadius: '0.5rem', border: '1px solid var(--neutral-border-medium)', overflow: 'hidden', flexShrink: 0 }}>
            {[1, 2, 3].map((j) => (
              <div
                key={j}
                style={{
                  ...pulse,
                  width: 40,
                  height: 38,
                  borderRadius: 0,
                  opacity: j === 2 ? 1 : 0.55,
                  borderLeft: j > 1 ? '1px solid var(--neutral-border-medium)' : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* Cabeçalho da tabela + linhas (lista de reports) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: TABLE_GRID,
            gap: '0.75rem',
            padding: '0.5rem 0.75rem',
            alignItems: 'center',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((col) => (
            <SkeletonBar key={col} width={col <= 2 ? '0.875rem' : '70%'} height="0.6875rem" radius="0.2rem" />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              style={{
                display: 'grid',
                gridTemplateColumns: TABLE_GRID,
                gap: '0.75rem',
                padding: '0.75rem',
                alignItems: 'center',
                border: '1px solid var(--neutral-border-medium)',
                borderRadius: '0.75rem',
                background: 'var(--surface-background)',
              }}
            >
              <SkeletonBar width="0.875rem" height="0.875rem" radius="0.2rem" />
              <SkeletonBar width="0.375rem" height="1rem" radius="0.125rem" />
              <SkeletonBar width="3.25rem" height="1.25rem" radius="999px" />
              <SkeletonBar width="3.5rem" height="1.25rem" radius="999px" />
              <SkeletonBar width={`${48 + (row * 5) % 42}%`} height="0.875rem" />
              <SkeletonBar width="3rem" height="1.25rem" radius="999px" />
              <SkeletonBar width="3.25rem" height="1.25rem" radius="999px" />
              <SkeletonBar width="1.75rem" height="1.75rem" radius="0.375rem" />
              <SkeletonBar width="5.5rem" height="0.8125rem" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  )
}
