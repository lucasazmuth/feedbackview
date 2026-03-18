'use client'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafbfc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: '#111', letterSpacing: '-0.04em' }}>Erro crítico</div>
            <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: '16px 0 32px' }}>
              Ocorreu um erro grave. Por favor, recarregue a página.
            </p>
            <button
              onClick={reset}
              style={{ padding: '12px 24px', borderRadius: 10, background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' }}
            >
              Recarregar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
