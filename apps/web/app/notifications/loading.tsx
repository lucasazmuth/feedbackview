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

        {/* Notification cards */}
        {[1, 2].map((i) => (
          <div key={i} style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ ...pulse, width: 32, height: 32, borderRadius: 8 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div style={{ ...pulse, width: '10rem', height: '1rem' }} />
                <div style={{ ...pulse, width: '14rem', height: '0.75rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ ...pulse, width: '5rem', height: '2rem', borderRadius: '0.5rem' }} />
              <div style={{ ...pulse, width: '5rem', height: '2rem', borderRadius: '0.5rem' }} />
            </div>
          </div>
        ))}
      </div>
    </SkeletonShell>
  )
}
