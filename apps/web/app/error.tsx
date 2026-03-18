'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafbfc' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>Ops!</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111', margin: '16px 0 8px' }}>Algo deu errado</h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: '0 0 32px' }}>
          Ocorreu um erro inesperado. Tente novamente ou volte ao início.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{ padding: '12px 24px', borderRadius: 10, background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            Tentar novamente
          </button>
          <a
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', borderRadius: 10, background: '#f3f4f6', color: '#374151', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Ir ao início
          </a>
        </div>
      </div>
    </div>
  )
}
