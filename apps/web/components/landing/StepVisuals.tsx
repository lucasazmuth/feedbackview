import { Fragment, type ReactNode } from 'react'
import { landingDemo } from '@/content/landing.pt-BR'
import { AppIcon } from '@/components/ui/AppIcon'

interface StepVisualsProps {
  step: number
}

/** Mesmos traços de `FeedbackModal` (tipo do report) — escala para o mock */
function LandingTypeGlyph({ i, size = 12 }: { i: number; size?: number }) {
  const c = { strokeWidth: 2 as const, stroke: 'currentColor' as const, fill: 'none' as const }
  switch (i) {
    case 0:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 116 0v1M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" {...c} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 1:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5M9 18h6M10 22h4" {...c} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 2:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="10" {...c} />
          <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" {...c} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z" {...c} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

export function StepVisuals({ step }: StepVisualsProps) {
  const d = landingDemo

  switch (step) {
    case 0:
      return (
        <div className="step-visual-container lstep-np-root">
          <header className="lstep-np-header">
            <div className="lstep-np-header-row">
              <span className="lstep-np-back">
                <AppIcon aria-hidden size="sm">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </AppIcon>
                {d.step0.backLabel}
              </span>
              <span className="lstep-np-header-sep">/</span>
              <span className="lstep-np-header-current">{d.step0.crumbLabel}</span>
            </div>
            <div className="lstep-np-stepper" aria-hidden="true">
              {(
                [
                  { n: 1, label: d.step0.stepperSite },
                  { n: 2, label: d.step0.stepperIntegration },
                  { n: 3, label: d.step0.stepperData },
                  { n: 4, label: d.step0.stepperWidget },
                ] as const
              ).map((s, i) => (
                <Fragment key={s.n}>
                  {i > 0 && <div className="lstep-np-stepper-line lstep-np-stepper-line--off" />}
                  <div className="lstep-np-stepper-node">
                    <div className={`lstep-np-stepper-circle ${s.n === 1 ? 'lstep-np-stepper-circle--active' : ''}`}>{s.n}</div>
                    <span className={`lstep-np-stepper-label ${s.n === 1 ? 'lstep-np-stepper-label--active' : ''}`}>{s.label}</span>
                  </div>
                </Fragment>
              ))}
            </div>
          </header>
          <div className="lstep-np-main">
            <h1 className="lstep-np-h1">{d.step0.heading}</h1>
            <p className="lstep-np-lead">{d.step0.lead}</p>
            <div className="lstep-np-card">
              <div className="lstep-np-url-field">
                <div className="lstep-np-url-icon" aria-hidden>
                  <AppIcon aria-hidden size="lg">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </AppIcon>
                </div>
                <span className="lstep-np-url-text">{d.step0.urlSample}</span>
                <span className="hero-typing-cursor" />
                <div className="lstep-np-url-ok" aria-hidden>
                  <AppIcon aria-hidden size="sm">
                    <polyline points="20 6 9 17 4 12" />
                  </AppIcon>
                </div>
              </div>
              <p className="lstep-np-hint">{d.step0.urlHint}</p>
              <div className="lstep-np-cta">{d.step0.continueLabel}</div>
            </div>
          </div>
        </div>
      )

    case 1:
      return (
        <div className="step-visual-container step-visual-site lstep-site-root">
          <div className="step-site-nav">
            <div className="step-site-nav-left">
              <div className="step-site-logo" />
              <div className="step-site-logo-text" />
            </div>
            <div className="step-site-nav-links">
              {d.step1.nav.map((t, i) => (
                <span key={t} className={`step-site-nav-item ${i === 0 ? 'step-site-nav-item--active' : ''}`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="step-site-nav-right">
              <div className="step-site-icon-placeholder" />
              <div className="step-site-avatar" />
            </div>
          </div>
          <div className="step-dashboard">
            <div className="step-dashboard-header">
              <div>
                <div className="step-dashboard-title">{d.step1.dashboardTitle}</div>
                <div className="step-dashboard-sub">{d.step1.dashboardSub}</div>
              </div>
              <div className="step-dashboard-range">{d.step1.rangeLabel}</div>
            </div>
            <div className="step-kpi-row">
              {[
                { v: '2,847', l: d.step1.kpiVisitors, icon: '\u2191 12%', ic: 'var(--success-solid-strong)' },
                { v: '89%', l: d.step1.kpiConversion, icon: '\u2191 3%', ic: 'var(--success-solid-strong)' },
                { v: 'R$ 12.4k', l: d.step1.kpiRevenue, icon: '\u2193 2%', ic: 'var(--danger-solid-strong)' },
              ].map((c, i) => (
                <div key={i} className="step-kpi-card">
                  <div className="step-kpi-top">
                    <span className="step-kpi-label">{c.l}</span>
                    <span className="step-kpi-trend" style={{ color: c.ic }}>
                      {c.icon}
                    </span>
                  </div>
                  <div className="step-kpi-value">{c.v}</div>
                </div>
              ))}
            </div>
            <div className="step-chart-placeholder">
              <div className="step-chart-title">{d.step1.chartTitle}</div>
              <div className="step-chart-bars">
                {[35, 52, 40, 65, 48, 72, 58, 80, 62, 75, 55, 68].map((h, i) => (
                  <div
                    key={i}
                    className={`step-chart-bar ${i === 7 ? 'step-chart-bar--highlight' : ''}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="step-table-mini">
              <div className="step-table-head">
                {d.step1.tableHeaders.map(h => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              {[1, 2].map(r => (
                <div key={r} className="step-table-row">
                  <div className="step-table-skel" />
                  <div className="step-table-skel" />
                  <div className="step-table-skel" />
                </div>
              ))}
            </div>
          </div>
          <button type="button" className="lstep-fv-trigger">
            <span className="lstep-fv-trigger-brand">{d.step1.widgetCta}</span>
          </button>
          <div className="lstep-fv-cursor step-cursor" aria-hidden="true">
            <svg width="18" height="22" viewBox="0 0 24 28" fill="none" aria-hidden="true">
              <path
                d="M5 2L5 19.5L9.5 15.5L13.5 23L16.5 21.5L12.5 13.5L18 12.5L5 2Z"
                fill="var(--neutral-on-background-strong)"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </svg>
            <div className="lstep-fv-cursor-ripple" />
          </div>
        </div>
      )

    case 2: {
      const s2 = d.step2
      const speeds = [1, 2, 4, 8] as const
      const activeSpeedIdx = 2
      const replayPct = 10.5
      const sbRows: { k: string; v: ReactNode }[] = [
        { k: 'Navegador', v: s2.sidebarBrowser },
        { k: 'OS', v: s2.sidebarOs },
        { k: 'Viewport', v: s2.sidebarViewport },
        { k: 'Origem', v: s2.sidebarSource },
        {
          k: 'Página',
          v: (
            <span className="lstep-fvmodal-pagelink">
              {s2.pageOpen}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
              </svg>
            </span>
          ),
        },
        { k: 'Console', v: s2.consoleSummary },
        { k: 'Network', v: s2.networkSummary },
      ]
      return (
        <div className="step-visual-container lstep-r2-root">
          <div className="step-dimmed-bg lstep-r2-bg">
            <div className="step-site-nav">
              <div className="step-site-nav-left">
                <div className="step-site-logo" />
                <div className="step-site-logo-text" />
              </div>
              <div className="step-site-nav-links">
                {d.step1.nav.map((t, i) => (
                  <span key={t} className={`step-site-nav-item ${i === 0 ? 'step-site-nav-item--active' : ''}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div className="step-dashboard-title" style={{ marginBottom: 6 }}>
                {d.step1.dashboardTitle}
              </div>
              <div className="step-kpi-row">
                {[
                  { v: '2,847', l: d.step1.kpiVisitors },
                  { v: '89%', l: d.step1.kpiConversion },
                  { v: 'R$ 12.4k', l: d.step1.kpiRevenue },
                ].map((c, i) => (
                  <div key={i} className="step-kpi-card">
                    <span className="step-kpi-label">{c.l}</span>
                    <div className="step-kpi-value" style={{ marginTop: 4 }}>
                      {c.v}
                    </div>
                  </div>
                ))}
              </div>
              <div className="step-chart-placeholder" style={{ marginTop: 12 }}>
                <div className="step-chart-bars">
                  {[35, 52, 40, 65, 48, 72, 58, 80, 62, 75, 55, 68].map((h, i) => (
                    <div
                      key={i}
                      className={`step-chart-bar ${i === 7 ? 'step-chart-bar--highlight' : ''}`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lstep-fvmodal">
            <header className="lstep-fvmodal-head">
              <span className="lstep-fvmodal-dot" />
              <span className="lstep-fvmodal-typepill">
                <LandingTypeGlyph i={0} size={11} />
                Bug
              </span>
              <span className="lstep-fvmodal-headtitle">{s2.modalTitle}</span>
              <span className="lstep-fvmodal-headdate">{s2.headerDate}</span>
              <button type="button" className="lstep-fvmodal-close" aria-hidden tabIndex={-1}>
                <AppIcon aria-hidden size="sm">
                  <path d="M18 6L6 18M6 6l12 12" />
                </AppIcon>
              </button>
            </header>

            <div className="lstep-fvmodal-body">
              <div className="lstep-fvmodal-main">
                <div className="lstep-fvmodal-media">
                  <div className="lstep-fvmodal-tabs">
                    <span className="lstep-fvmodal-tab lstep-fvmodal-tab--on">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      {s2.tabReplay}
                    </span>
                    <span className="lstep-fvmodal-tab">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      {s2.tabScreenshot}
                    </span>
                  </div>
                  <div className="lstep-fvmodal-mediapad">
                    <div className="lstep-fvmodal-replaybox">
                      <div className="lstep-fvmodal-replayvp">
                        <div className="lstep-fvmodal-replayshine" aria-hidden />
                        <p className="lstep-fvmodal-replaycap">{s2.replayCaption}</p>
                      </div>
                      <div className="lstep-fvmodal-replayfoot">
                        <div className="lstep-fvmodal-prog">
                          <div className="lstep-fvmodal-progfill" style={{ width: `${replayPct}%` }} />
                          <span className="lstep-fvmodal-progknob" style={{ left: `${replayPct}%` }} />
                        </div>
                        <div className="lstep-fvmodal-ctrlrow">
                          <span className="lstep-fvmodal-playic" aria-hidden>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                              <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z" />
                            </svg>
                          </span>
                          <span className="lstep-fvmodal-timer">
                            {s2.replayCurrent} / {s2.replayTotal}
                          </span>
                          <div className="lstep-fvmodal-speeds">
                            {speeds.map((sp, si) => (
                              <span
                                key={sp}
                                className={
                                  si === activeSpeedIdx ? 'lstep-fvmodal-spd lstep-fvmodal-spd--on' : 'lstep-fvmodal-spd'
                                }
                              >
                                {sp}x
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lstep-fvmodal-desc">
                  <div className="lstep-fvmodal-desclabel">
                    {s2.descriptionLabel} <span className="lstep-fvmodal-req">*</span>
                  </div>
                  <div className="lstep-fvmodal-ta" title={s2.descriptionPlaceholder}>
                    {s2.descriptionSample}
                  </div>
                </div>
              </div>

              <aside className="lstep-fvmodal-sb">
                <div className="lstep-fvmodal-sbblk">
                  <span className="lstep-fvmodal-sblab">{s2.typeLabel}</span>
                  <div className="lstep-fvmodal-types">
                    {s2.typeLabels.map((label, ti) => (
                      <span
                        key={label}
                        className={ti === 0 ? 'lstep-fvmodal-typb lstep-fvmodal-typb--on' : 'lstep-fvmodal-typb'}
                      >
                        <LandingTypeGlyph i={ti} size={10} />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="lstep-fvmodal-sbblk">
                  <span className="lstep-fvmodal-sblab">{s2.priorityLabel}</span>
                  <div className="lstep-fvmodal-sevs">
                    {s2.priorityLabels.map((label, pi) => {
                      const on = pi === s2.activePriorityIndex
                      const c = s2.priorityColors[pi]
                      return (
                        <span
                          key={label}
                          className={on ? 'lstep-fvmodal-sevb lstep-fvmodal-sevb--on' : 'lstep-fvmodal-sevb'}
                          style={
                            on
                              ? {
                                  borderColor: c,
                                  color: c,
                                  background: `${c}18`,
                                  fontWeight: 600,
                                }
                              : undefined
                          }
                        >
                          {label}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div className="lstep-fvmodal-sbrule" />
                {sbRows.map(row => (
                  <div key={row.k} className="lstep-fvmodal-sbrow">
                    <span className="lstep-fvmodal-sbk">{row.k}</span>
                    <div className="lstep-fvmodal-sbv">{row.v}</div>
                  </div>
                ))}
              </aside>
            </div>

            <footer className="lstep-fvmodal-foot">
              <div className="lstep-fvmodal-submit">{s2.submitCta}</div>
              <p className="lstep-fvmodal-powered">{s2.poweredBy}</p>
            </footer>
          </div>
        </div>
      )
    }

    case 3: {
      const rows = d.step3.rows
      const resolvedN = rows.filter(r => r.st === 'Resolvido').length
      const openN = rows.length - resolvedN
      return (
        <div className="step-visual-container step-visual-dashboard lstep-app-shell">
          <aside className="lstep-app-sb" aria-hidden="true">
            <div className="lstep-app-sb-brand">B</div>
            <div className="lstep-app-sb-rule" />
            <div className="lstep-app-sb-item lstep-app-sb-item--active" title="Projetos">
              <AppIcon aria-hidden size="md">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </AppIcon>
            </div>
            <div className="lstep-app-sb-item" title="Reports">
              <AppIcon aria-hidden size="md">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </AppIcon>
            </div>
            <div className="lstep-app-sb-spacer" />
            <div className="lstep-app-sb-rule" />
            <div className="lstep-app-sb-item" title="Configurações">
              <AppIcon aria-hidden size="md">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </AppIcon>
            </div>
          </aside>
          <div className="lstep-app-main">
            <header className="lstep-app-top">
              <div className="lstep-app-top-row">
                <span className="lstep-app-back">
                  <AppIcon aria-hidden size="sm">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </AppIcon>
                  Projetos
                </span>
                <span className="lstep-app-top-sep">/</span>
                <span className="lstep-app-top-name">{d.step3.projectName}</span>
              </div>
            </header>
            <div className="lstep-app-scroll">
              <div className="lstep-proj-head">
                <div className="lstep-proj-head-left">
                  <div className="lstep-proj-title-row">
                    <h2 className="lstep-proj-h2">{d.step3.projectName}</h2>
                    <span className="lstep-proj-live">
                      <span className="lstep-proj-live-dot" />
                      {d.step3.connectionPill}
                    </span>
                  </div>
                  <div className="lstep-proj-url">{d.step3.displayUrl}</div>
                </div>
                <div className="lstep-proj-stats">
                  <div className="lstep-proj-stat">
                    <span className="lstep-proj-stat-val">{rows.length}</span>
                    <span className="lstep-proj-stat-lbl">{d.step3.statTotal}</span>
                  </div>
                  <div className="lstep-proj-stat">
                    <span className="lstep-proj-stat-val lstep-proj-stat-val--warn">{openN}</span>
                    <span className="lstep-proj-stat-lbl">{d.step3.statOpen}</span>
                  </div>
                  <div className="lstep-proj-stat">
                    <span className="lstep-proj-stat-val lstep-proj-stat-val--ok">{resolvedN}</span>
                    <span className="lstep-proj-stat-lbl">{d.step3.statResolved}</span>
                  </div>
                </div>
              </div>
              <div className="lstep-proj-tabs">
                {d.step3.tabs.map((t, i) => (
                  <div key={t} className={`lstep-proj-tab ${i === 0 ? 'lstep-proj-tab--on' : ''}`}>
                    {t}
                    {i === 0 && (
                      <span className="lstep-proj-tab-count">{rows.length}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="lstep-report-cards">
                {rows.map((r, i) => {
                  const typeClass = r.type === 'Sugestão' ? 'lstep-tag--type-suggestion' : 'lstep-tag--type-bug'
                  const stClass =
                    r.st === 'Resolvido'
                      ? 'lstep-tag--st-resolved'
                      : r.st === 'Em andamento'
                        ? 'lstep-tag--st-progress'
                        : 'lstep-tag--st-open'
                  const sevClass =
                    r.sev === 'Baixa'
                      ? 'lstep-tag--sev-low'
                      : r.sev === 'Média'
                        ? 'lstep-tag--sev-mid'
                        : 'lstep-tag--sev-high'
                  return (
                  <div key={i} className={`lstep-report-card ${i === 0 ? 'lstep-report-card--focus' : ''}`}>
                    <div className="lstep-report-card-check" aria-hidden />
                    <div className="lstep-report-card-body">
                      <div className="lstep-report-card-tags">
                        <span className={`lstep-tag ${typeClass}`}>{r.type}</span>
                        <span className={`lstep-tag ${sevClass}`}>{r.sev}</span>
                        <span className={`lstep-tag ${stClass}`}>{r.st}</span>
                      </div>
                      <p className="lstep-report-card-comment">{r.desc}</p>
                      <div className="lstep-report-card-meta">
                        <span className="lstep-report-card-date">29 mar., 14:32</span>
                        <span className="lstep-report-card-sep">|</span>
                        <span className="lstep-report-card-page">/checkout</span>
                      </div>
                    </div>
                    <AppIcon aria-hidden size="md">
                      <polyline points="9 18 15 12 9 6" />
                    </AppIcon>
                  </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )
    }

    default:
      return null
  }
}
