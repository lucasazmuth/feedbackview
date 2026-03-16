import { SkeletonShell, pulse } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ ...pulse, width: '6rem', height: '1.75rem' }} />
          <div style={{ ...pulse, width: '18rem', height: '0.875rem' }} />
        </div>

        {/* Current plan card */}
        <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ ...pulse, width: '8rem', height: '1.25rem' }} />
              <div style={{ ...pulse, width: '4rem', height: '1.25rem', borderRadius: '999px' }} />
            </div>
            <div style={{ ...pulse, width: '5rem', height: '0.75rem' }} />
          </div>
          <div style={{ ...pulse, width: '8rem', height: '2.25rem', borderRadius: '0.5rem' }} />
        </div>

        {/* Usage card */}
        <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ ...pulse, width: '6rem', height: '1.25rem' }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ ...pulse, width: '6rem', height: '0.75rem' }} />
                <div style={{ ...pulse, width: '4rem', height: '0.75rem' }} />
              </div>
              <div style={{ ...pulse, width: '100%', height: 6, borderRadius: 3 }} />
            </div>
          ))}
        </div>

        {/* Features card */}
        <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...pulse, width: '10rem', height: '1.25rem' }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ ...pulse, width: '1rem', height: '1rem' }} />
              <div style={{ ...pulse, width: `${8 + i * 2}rem`, height: '0.875rem' }} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  )
}
