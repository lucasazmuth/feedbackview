import { SkeletonShell, pulse } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div style={{ padding: '24px 40px', display: 'flex', flexDirection: 'column', gap: '2rem', alignItems: 'center' }}>
        {/* Back + Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ ...pulse, width: '10rem', height: '1.75rem' }} />
          <div style={{ ...pulse, width: '18rem', height: '0.875rem' }} />
        </div>

        {/* Plan cards */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ flex: '1 1 280px', maxWidth: '22rem', border: '1px solid var(--neutral-border-medium)', borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ ...pulse, width: '4rem', height: '0.875rem' }} />
              <div style={{ ...pulse, width: '6rem', height: '2rem' }} />
              <div style={{ ...pulse, width: '100%', height: '0.75rem' }} />
              <div style={{ ...pulse, width: '100%', height: 1 }} />
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ ...pulse, width: '1rem', height: '1rem' }} />
                  <div style={{ ...pulse, width: `${6 + j}rem`, height: '0.875rem' }} />
                </div>
              ))}
              <div style={{ ...pulse, width: '100%', height: '2.75rem', borderRadius: '0.75rem', marginTop: '0.5rem' }} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonShell>
  )
}
