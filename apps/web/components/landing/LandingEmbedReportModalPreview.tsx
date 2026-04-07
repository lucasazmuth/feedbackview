'use client'

/**
 * Preview estático da seção "Como funciona" — espelha `components/viewer/FeedbackModal.tsx`
 * (tema escuro do embed). Não usar `step-visuals.css` (mock claro do carrossel).
 */
import { useState } from 'react'
import { ICON_STROKE } from '@/lib/icon-tokens'
import { AppIcon } from '@/components/ui/AppIcon'

const WIDGET_COLOR = '#1e40af'

const typeLabels: Record<string, string> = {
  BUG: 'Bug',
  SUGGESTION: 'Sugestão',
  QUESTION: 'Dúvida',
  PRAISE: 'Elogio',
}

const severityOpts = [
  ['LOW', 'Baixa', '#22c55e'],
  ['MEDIUM', 'Média', '#f59e0b'],
  ['HIGH', 'Alta', '#f97316'],
  ['CRITICAL', 'Crítica', '#ef4444'],
] as const

function SidebarField({
  label,
  children,
  layout = 'row',
  sectionHeading = false,
}: {
  label: string
  children: React.ReactNode
  layout?: 'row' | 'stack'
  /** TIPO / PRIORIDADE — rótulo em caixa alta como no embed real */
  sectionHeading?: boolean
}) {
  if (layout === 'stack') {
    return (
      <div style={{ padding: sectionHeading ? '0.35rem 0 0.5rem' : '0.45rem 0' }}>
        <span
          style={{
            display: 'block',
            fontSize: sectionHeading ? 10 : 11,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: sectionHeading ? 8 : 4,
            letterSpacing: sectionHeading ? '0.1em' : '0.02em',
            textTransform: sectionHeading ? 'uppercase' : 'none',
          }}
        >
          {label}
        </span>
        <div style={{ fontSize: 11, lineHeight: 1.45, wordBreak: 'break-word' }}>{children}</div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', padding: '0.5rem 0' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: '#64748b',
          width: 78,
          flexShrink: 0,
          paddingTop: 2,
          lineHeight: 1.3,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

const DEMO_OPENED = new Date('2026-03-31T23:32:00')
const REPLAY_CURRENT_MS = 9_000
const REPLAY_TOTAL_MS = 17_000

function fmtReplayTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}

export function LandingEmbedReportModalPreview() {
  const [mediaTab, setMediaTab] = useState<'replay' | 'screenshot'>('replay')
  const [type, setType] = useState<string>('BUG')
  const [severity, setSeverity] = useState<string>('MEDIUM')
  const [replaySpeed, setReplaySpeed] = useState(1)
  const openedDisplay = DEMO_OPENED.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const replayProgress = (REPLAY_CURRENT_MS / REPLAY_TOTAL_MS) * 100

  const S = {
    font: { fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '8px 10px',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      fontSize: 12,
      outline: 'none',
      color: '#0f172a',
      background: 'rgba(0, 0, 0, 0.03)',
      fontFamily: 'inherit',
      boxSizing: 'border-box' as const,
    } as React.CSSProperties,
  }

  /** Abas só texto — sem ícones, como no embed atual */
  const tabStyle = (on: boolean): React.CSSProperties => ({
    padding: '0.5rem 0.85rem',
    fontSize: 'clamp(0.8125rem, 1.45vw, 1.125rem)',
    fontWeight: on ? 600 : 500,
    border: 'none',
    cursor: 'pointer',
    borderBottom: on ? '2px solid #1e40af' : '2px solid transparent',
    color: on ? '#0f172a' : '#64748b',
    background: 'transparent',
    marginBottom: -1,
    fontFamily: 'inherit',
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface-background)] text-left" style={S.font}>
      <style>{`
        @media (max-width: 900px) {
          .landing-embed-fv-body { flex-direction: column !important; }
          .landing-embed-fv-sidebar {
            width: 100% !important;
            border-left: none !important;
            border-top: 1px solid #e2e8f0;
            max-height: 36vh;
          }
        }
      `}</style>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] p-1 sm:p-1.5">
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-l)] border border-transparent-white"
          style={{
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.08), transparent)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), rgba(30, 41, 59, 0.12) 0px 1px 40px',
          }}
        >
          {/* Cabeçalho — alinhado ao embed atual (título + data + fechar) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.5rem 0.75rem',
              borderBottom: '1px solid #e2e8f0',
              flexShrink: 0,
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, transparent 100%)',
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: 'clamp(0.95rem, 2vw, 1.35rem)',
                fontWeight: 600,
                color: '#0f172a',
                letterSpacing: '-0.02em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              Reportar Bug
            </span>
            <span className="hidden text-gray sm:inline" style={{ flexShrink: 0, fontSize: 12 }}>
              {openedDisplay}
            </span>
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-transparent-white bg-glass-gradient text-gray transition-colors hover:bg-transparent-white hover:text-off-white"
              style={{ width: 32, height: 32, cursor: 'pointer' }}
              aria-label="Fechar (demonstração)"
            >
              <AppIcon size="md" strokeWidth={ICON_STROKE.emphasis}>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </AppIcon>
            </button>
          </div>

          <div className="landing-embed-fv-body flex min-h-0 flex-1 overflow-hidden" style={{ display: 'flex', minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.03)', borderBottom: '1px solid #e2e8f0' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 0,
                    padding: '0 0.5rem',
                    borderBottom: '1px solid #e2e8f0',
                    background: '#ffffff',
                  }}
                >
                  <button type="button" style={tabStyle(mediaTab === 'replay')} onClick={() => setMediaTab('replay')}>
                    Replay
                  </button>
                  <button type="button" style={tabStyle(mediaTab === 'screenshot')} onClick={() => setMediaTab('screenshot')}>
                    Screenshot
                  </button>
                </div>
                <div style={{ padding: '0.5rem 0.65rem', display: 'flex', justifyContent: 'center' }}>
                  {mediaTab === 'replay' && (
                    <div
                      style={{
                        width: '100%',
                        borderRadius: '0.65rem',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        background: '#0f172a',
                      }}
                    >
                      <div className="relative aspect-[16/10] max-h-[min(30vh,220px)] min-h-[72px] w-full sm:max-h-[min(34vh,260px)]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- captura real do embed em /public */}
                        <img
                          src="/landing-embed-report-preview.png"
                          alt=""
                          className="h-full w-full object-cover object-top"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          background: '#f8fafc',
                          padding: '8px 12px',
                          borderTop: '1px solid #e2e8f0',
                        }}
                      >
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: '#f1f5f9',
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${replayProgress}%`,
                              background: WIDGET_COLOR,
                              borderRadius: 3,
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: `${replayProgress}%`,
                              width: 12,
                              height: 12,
                              background: WIDGET_COLOR,
                              borderRadius: '50%',
                              transform: 'translate(-50%, -50%)',
                              boxShadow: '0 1px 8px rgba(0,0,0,0.1)',
                              border: '2px solid #f8fafc',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                border: 'none',
                                background: WIDGET_COLOR,
                                color: '#fff',
                              }}
                              aria-hidden
                            >
                              <AppIcon size="sm">
                                <path
                                  d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z"
                                  fill="currentColor"
                                  stroke="none"
                                />
                              </AppIcon>
                            </span>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {fmtReplayTime(REPLAY_CURRENT_MS)} / {fmtReplayTime(REPLAY_TOTAL_MS)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {([1, 2, 4, 8] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setReplaySpeed(s)}
                                style={{
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '3px 6px',
                                  borderRadius: 6,
                                  fontSize: 10,
                                  background: replaySpeed === s ? WIDGET_COLOR : 'transparent',
                                  color: replaySpeed === s ? '#fff' : '#64748b',
                                  fontWeight: replaySpeed === s ? 600 : 400,
                                }}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {mediaTab === 'screenshot' && (
                    <div
                      style={{
                        width: '100%',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        background: '#0f172a',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <div className="relative max-h-[min(30vh,220px)] min-h-[72px] w-full overflow-hidden sm:max-h-[min(34vh,260px)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/landing-embed-report-preview.png"
                          alt=""
                          className="block h-full w-full object-cover object-top"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#f8fafc',
                          padding: '6px 10px',
                          borderTop: '1px solid #e2e8f0',
                        }}
                      >
                        <span style={{ fontSize: 10, color: '#64748b' }}>Clique e arraste para marcar a área</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  paddingBottom: '0.85rem',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: 10,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Descrição <span style={{ color: '#f87171' }}>*</span>
                </span>
                <textarea
                  readOnly
                  rows={3}
                  placeholder="Descreva o problema ou sugestão em detalhes… (mínimo 10 caracteres)"
                  style={{ ...S.input, resize: 'none', marginTop: 0 }}
                />
              </div>

              <div style={{ padding: '0.75rem 0.85rem 0.85rem' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0f172a',
                    marginBottom: 10,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Anexos
                </span>
                <div
                  style={{
                    border: '2px dashed #e2e8f0',
                    borderRadius: 8,
                    padding: '12px 14px',
                    minHeight: 48,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                    Clique para anexar arquivos (máx. 5)
                  </span>
                </div>
              </div>
            </div>

            <aside
              className="landing-embed-fv-sidebar"
              style={{
                width: 'clamp(17rem, 34vw, 22.5rem)',
                flexShrink: 0,
                borderLeft: '1px solid #e2e8f0',
                overflowY: 'auto',
                padding: '0.65rem 0.85rem 0.75rem',
                background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.03) 0%, transparent 40%)',
              }}
            >
              <SidebarField label="Tipo" layout="stack" sectionHeading>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                  }}
                >
                  {(['BUG', 'SUGGESTION', 'QUESTION', 'PRAISE'] as const).map((val) => {
                    const on = type === val
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setType(val)}
                        style={{
                          padding: '8px 6px',
                          borderRadius: 8,
                          border: on ? `2px solid ${WIDGET_COLOR}` : '1px solid #e2e8f0',
                          background: 'transparent',
                          color: on ? WIDGET_COLOR : '#475569',
                          fontSize: 11,
                          fontWeight: on ? 600 : 500,
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {typeLabels[val]}
                      </button>
                    )
                  })}
                </div>
              </SidebarField>

              {type === 'BUG' && (
                <SidebarField label="Prioridade" layout="stack" sectionHeading>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 6,
                    }}
                  >
                    {severityOpts.map(([val, label, c]) => {
                      const on = severity === val
                      return (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSeverity(val)}
                          style={{
                            padding: '8px 6px',
                            borderRadius: 8,
                            border: on ? `2px solid ${c}` : '1px solid #e2e8f0',
                            background: 'transparent',
                            color: on ? c : '#475569',
                            fontSize: 11,
                            fontWeight: on ? 600 : 500,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            textAlign: 'center',
                            lineHeight: 1.2,
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </SidebarField>
              )}

              <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />

              <SidebarField label="Navegador" layout="stack">
                <span style={{ color: '#0f172a' }}>Chrome 142.0.7444.265</span>
              </SidebarField>
              <SidebarField label="OS" layout="stack">
                <span style={{ color: '#0f172a' }}>macOS 10.15.7</span>
              </SidebarField>
              <SidebarField label="Viewport" layout="stack">
                <span style={{ color: '#0f172a' }}>1052 × 894</span>
              </SidebarField>
              <SidebarField label="Origem" layout="stack">
                <span style={{ color: '#0f172a' }}>Widget embed</span>
              </SidebarField>
              <SidebarField label="Página" layout="stack">
                <span style={{ color: '#3b82f6', fontWeight: 500 }}>Abrir {'>'}</span>
              </SidebarField>
              <SidebarField label="Console" layout="stack">
                <span style={{ color: '#64748b' }}>0 logs</span>
              </SidebarField>
              <SidebarField label="Network" layout="stack">
                <span style={{ color: '#64748b' }}>0 req.</span>
              </SidebarField>
            </aside>
          </div>

          <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', flexShrink: 0, background: '#ffffff' }}>
            <button
              type="button"
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'linear-gradient(92.88deg, #1e293b 9.16%, #1e40af 43.89%, #3b82f6 64.72%)',
                color: 'white',
                border: 'none',
                borderRadius: 9999,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'default',
                boxShadow: 'rgba(30, 41, 59, 0.15) 0px 1px 40px',
              }}
            >
              Enviar {typeLabels[type] || 'Bug'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: '#64748b' }}>
              Powered by{' '}
              <span className="font-medium text-primary-text">Buug</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
