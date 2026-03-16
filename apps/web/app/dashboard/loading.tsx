import { SkeletonShell, pulse } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ ...pulse, width: '8rem', height: '1.75rem' }} />
            <div style={{ ...pulse, width: '5rem', height: '0.875rem' }} />
          </div>
          <div style={{ ...pulse, width: '8rem', height: '2.5rem', borderRadius: '0.5rem' }} />
        </div>

        {/* Project cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ ...pulse, width: '60%', height: '1.25rem' }} />
                <div style={{ ...pulse, width: '1rem', height: '1rem' }} />
              </div>
              <div style={{ ...pulse, width: '80%', height: '0.75rem' }} />
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ ...pulse, width: '4rem', height: '1.25rem', borderRadius: '999px' }} />
                <div style={{ ...pulse, width: '6rem', height: '0.75rem' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  )
}
