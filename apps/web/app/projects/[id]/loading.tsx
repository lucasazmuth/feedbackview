import { SkeletonShell, pulse } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ ...pulse, width: '14rem', height: '2rem' }} />
          <div style={{ ...pulse, width: '18rem', height: '0.875rem' }} />
        </div>

        {/* QA URL card */}
        <div style={{ ...pulse, width: '100%', height: '7rem', borderRadius: '0.75rem', background: 'var(--brand-solid-strong)', opacity: 0.8 }} />

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ ...pulse, width: '4rem', height: '0.75rem' }} />
              <div style={{ ...pulse, width: '2rem', height: '1.75rem' }} />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '2px solid var(--neutral-border-medium)', display: 'flex', gap: '1.5rem', paddingBottom: '0.75rem' }}>
          <div style={{ ...pulse, width: '6rem', height: '1rem' }} />
          <div style={{ ...pulse, width: '7rem', height: '1rem' }} />
        </div>

        {/* Feedback items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ ...pulse, width: '5rem', height: '3.5rem', flexShrink: 0, borderRadius: '0.5rem' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  <div style={{ ...pulse, width: '3rem', height: '1.25rem', borderRadius: '999px' }} />
                  <div style={{ ...pulse, width: '3.5rem', height: '1.25rem', borderRadius: '999px' }} />
                  <div style={{ ...pulse, width: '3.5rem', height: '1.25rem', borderRadius: '999px' }} />
                </div>
                <div style={{ ...pulse, width: '75%', height: '0.875rem' }} />
                <div style={{ ...pulse, width: '40%', height: '0.75rem' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  )
}
