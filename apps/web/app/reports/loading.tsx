import { SkeletonShell, pulse } from '@/components/ui/LoadingSkeleton'

export default function Loading() {
  return (
    <SkeletonShell>
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Title row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ ...pulse, width: '8rem', height: '1.75rem' }} />
            <div style={{ ...pulse, width: '12rem', height: '0.875rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ ...pulse, width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem' }} />
            <div style={{ ...pulse, width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem' }} />
          </div>
        </div>

        {/* Search + filters bar */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ ...pulse, flex: 1, height: '2.5rem', borderRadius: '0.5rem' }} />
          <div style={{ ...pulse, width: '7rem', height: '2.5rem', borderRadius: '0.5rem' }} />
          <div style={{ ...pulse, width: '6rem', height: '2.5rem', borderRadius: '0.5rem' }} />
          <div style={{ ...pulse, width: '6rem', height: '2.5rem', borderRadius: '0.5rem' }} />
          <div style={{ ...pulse, width: '6rem', height: '2.5rem', borderRadius: '0.5rem' }} />
        </div>

        {/* List header */}
        <div style={{ display: 'grid', gridTemplateColumns: '6rem 8rem 1fr 6rem 5rem 10rem 2rem', gap: '0.75rem', padding: '0.5rem 1rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} style={{ ...pulse, height: '0.75rem', width: '80%' }} />
          ))}
        </div>

        {/* List rows */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '6rem 8rem 1fr 6rem 5rem 10rem 2rem',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              border: '1px solid var(--neutral-border-medium)',
              borderRadius: '0.75rem',
              alignItems: 'center',
            }}
          >
            <div style={{ ...pulse, width: '4rem', height: '1.5rem', borderRadius: '999px' }} />
            <div style={{ ...pulse, width: '5rem', height: '1.25rem', borderRadius: '999px' }} />
            <div style={{ ...pulse, width: `${50 + (i * 7) % 40}%`, height: '1rem' }} />
            <div style={{ ...pulse, width: '3.5rem', height: '1.25rem', borderRadius: '999px' }} />
            <div style={{ ...pulse, width: '3rem', height: '1.25rem', borderRadius: '999px' }} />
            <div style={{ ...pulse, width: '6rem', height: '0.875rem' }} />
            <div style={{ ...pulse, width: '1rem', height: '1rem' }} />
          </div>
        ))}
      </div>
    </SkeletonShell>
  )
}
