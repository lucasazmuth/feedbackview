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

        {/* Invite section */}
        <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...pulse, width: '10rem', height: '1.25rem' }} />
          <div style={{ ...pulse, width: '16rem', height: '0.75rem' }} />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ ...pulse, flex: 1, height: '2.5rem', borderRadius: '0.5rem' }} />
            <div style={{ ...pulse, width: '6rem', height: '2.5rem', borderRadius: '0.5rem' }} />
          </div>
        </div>

        {/* Members section */}
        <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...pulse, width: '8rem', height: '1.25rem' }} />
          {[1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < 2 ? '1px solid var(--neutral-border-medium)' : 'none' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ ...pulse, width: '8rem', height: '1rem' }} />
                <div style={{ ...pulse, width: '4rem', height: '1.25rem', borderRadius: '999px' }} />
              </div>
              <div style={{ ...pulse, width: '5rem', height: '2rem', borderRadius: '0.5rem' }} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  )
}
