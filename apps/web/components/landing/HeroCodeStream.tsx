'use client'

type StreamLine =
  | {
      kind: 'net'
      method: string
      status: number
      path: string
      ms?: number
    }
  | { kind: 'console'; level: 'log' | 'info' | 'warn' | 'error'; msg: string }

const LINES: StreamLine[] = [
  { kind: 'net', method: 'GET', status: 200, path: '/api/session', ms: 14 },
  { kind: 'console', level: 'log', msg: 'Buug: sessão · segmento gravado' },
  { kind: 'net', method: 'POST', status: 201, path: '/api/feedback', ms: 92 },
  { kind: 'console', level: 'info', msg: 'Web Vitals LCP 2.1s · INP 168ms' },
  { kind: 'net', method: 'GET', status: 304, path: '/static/app.bundle.js' },
  { kind: 'console', level: 'warn', msg: 'The resource was preloaded using link preload' },
  { kind: 'net', method: 'GET', status: 404, path: '/assets/hero-missing.webp' },
  { kind: 'console', level: 'error', msg: 'Failed to load resource: the server responded with 404' },
  { kind: 'net', method: 'GET', status: 200, path: '/graphql?operation=Cart', ms: 41 },
  { kind: 'console', level: 'log', msg: 'Network: 3 requests · 2 errors (staging)' },
  { kind: 'net', method: 'POST', status: 422, path: '/api/checkout/validate' },
  { kind: 'console', level: 'warn', msg: 'ValidationError: postalCode inválido' },
  { kind: 'net', method: 'GET', status: 200, path: '/cdn/fonts/inter.woff2', ms: 28 },
  { kind: 'console', level: 'info', msg: 'CLS 0.04 · nenhum layout shift crítico' },
  { kind: 'net', method: 'POST', status: 204, path: '/api/analytics/batch' },
  { kind: 'console', level: 'log', msg: 'Replay enviado ao painel · report #4821' },
  { kind: 'net', method: 'GET', status: 502, path: '/api/recommendations' },
  { kind: 'console', level: 'error', msg: 'TypeError: Cannot read properties of undefined' },
]

type HeroCodeStreamProps = {
  reduceMotion: boolean
  /** Textura atrás do Lottie (hero) */
  variant?: 'behind'
}

function statusTone(status: number): 'ok' | 'redirect' | 'client' | 'server' {
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'
  if (status >= 300) return 'redirect'
  return 'ok'
}

function StreamRow({ line }: { line: StreamLine }) {
  if (line.kind === 'net') {
    const tone = statusTone(line.status)
    return (
      <div className="landing-hero-code-line landing-hero-stream-row landing-hero-stream-row--net">
        <span className="landing-hero-stream-tag" aria-hidden>
          NET
        </span>
        <span className="landing-hero-stream-method">{line.method}</span>
        <span className={`landing-hero-stream-status landing-hero-stream-status--${tone}`}>
          {line.status}
        </span>
        <span className="landing-hero-stream-path">{line.path}</span>
        {line.ms != null ? (
          <span className="landing-hero-stream-ms">{line.ms} ms</span>
        ) : (
          <span className="landing-hero-stream-ms landing-hero-stream-ms--dash">-</span>
        )}
      </div>
    )
  }

  return (
    <div className="landing-hero-code-line landing-hero-stream-row landing-hero-stream-row--console">
      <span className="landing-hero-stream-tag" aria-hidden>
        CON
      </span>
      <span className={`landing-hero-stream-lvl landing-hero-stream-lvl--${line.level}`}>
        [{line.level}]
      </span>
      <span className="landing-hero-stream-msg">{line.msg}</span>
    </div>
  )
}

export function HeroCodeStream({ reduceMotion, variant }: HeroCodeStreamProps) {
  const rootClass = [
    'landing-hero-code-stream',
    variant === 'behind' && 'landing-hero-code-stream--behind',
  ]
    .filter(Boolean)
    .join(' ')

  if (reduceMotion) {
    return (
      <div className={rootClass} aria-hidden="true">
        <div className="landing-hero-code-stream-static">
          {LINES.map((line, i) => (
            <StreamRow key={i} line={line} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass} aria-hidden="true">
      <div className="landing-hero-code-stream-clip">
        <div className="landing-hero-code-scroll-track">
          <div className="landing-hero-code-scroll-chunk">
            {LINES.map((line, i) => (
              <StreamRow key={`a-${i}`} line={line} />
            ))}
          </div>
          <div className="landing-hero-code-scroll-chunk">
            {LINES.map((line, i) => (
              <StreamRow key={`b-${i}`} line={line} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
