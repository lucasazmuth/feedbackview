import { SkeletonShell, pulse } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ ...pulse, width: '10rem', height: '1.75rem' }} />
          <div style={{ ...pulse, width: '16rem', height: '0.875rem' }} />
        </div>

        {/* Profile section */}
        <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...pulse, width: '4rem', height: '1.25rem' }} />
          <div style={{ ...pulse, width: '12rem', height: '0.75rem' }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ ...pulse, width: '4rem', height: '0.75rem' }} />
              <div style={{ ...pulse, width: '100%', height: '2.5rem', borderRadius: '0.5rem' }} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ ...pulse, width: '8rem', height: '2.5rem', borderRadius: '0.5rem' }} />
          </div>
        </div>

        {/* Password section */}
        <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...pulse, width: '8rem', height: '1.25rem' }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <div style={{ ...pulse, width: '6rem', height: '0.75rem' }} />
              <div style={{ ...pulse, width: '100%', height: '2.5rem', borderRadius: '0.5rem' }} />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ ...pulse, width: '8rem', height: '2.5rem', borderRadius: '0.5rem' }} />
          </div>
        </div>
      </div>
    </SkeletonShell>
  )
}
