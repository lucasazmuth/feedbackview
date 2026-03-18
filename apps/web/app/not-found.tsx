import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#fafbfc' }}>
      <div style={{ textAlign: 'center', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: '#111', letterSpacing: '-0.04em', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111', margin: '16px 0 8px' }}>Página não encontrada</h1>
        <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: '0 0 32px' }}>
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          href="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: '#111', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', transition: 'opacity 0.15s' }}
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
