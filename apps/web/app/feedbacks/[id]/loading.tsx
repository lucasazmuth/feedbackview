import { SkeletonShell, pulse } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ ...pulse, width: '4rem', height: '1rem' }} />
          <div style={{ ...pulse, width: '3rem', height: '1.25rem', borderRadius: '999px' }} />
          <div style={{ ...pulse, width: '5rem', height: '1rem' }} />
        </div>

        {/* Content */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {/* Left column */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
            <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem' }}>
              <div style={{ ...pulse, width: '10rem', height: '1.25rem', marginBottom: '1rem' }} />
              <div style={{ ...pulse, width: '100%', height: '16rem', borderRadius: '0.5rem' }} />
            </div>
            <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ ...pulse, width: '6rem', height: '1.25rem' }} />
              <div style={{ ...pulse, width: '100%', height: '0.875rem' }} />
              <div style={{ ...pulse, width: '65%', height: '0.875rem' }} />
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ flex: 1, minWidth: '16rem', maxWidth: '20rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ ...pulse, width: '4rem', height: '1.25rem' }} />
                <div style={{ ...pulse, width: '4rem', height: '1.25rem', borderRadius: '999px' }} />
              </div>
              <div style={{ ...pulse, width: '100%', height: '2.5rem', borderRadius: '0.5rem' }} />
            </div>
            <div style={{ border: '1px solid var(--neutral-border-medium)', borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ ...pulse, width: '5rem', height: '1.25rem' }} />
              <div style={{ ...pulse, width: '100%', height: '8rem', borderRadius: '0.5rem' }} />
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <div style={{ ...pulse, width: '3.5rem', height: '1.5rem', borderRadius: '999px' }} />
                <div style={{ ...pulse, width: '3.5rem', height: '1.5rem', borderRadius: '999px' }} />
              </div>
              <div style={{ ...pulse, width: '100%', height: '0.75rem' }} />
              <div style={{ ...pulse, width: '60%', height: '0.75rem' }} />
            </div>
          </div>
        </div>
      </div>
    </SkeletonShell>
  )
}
