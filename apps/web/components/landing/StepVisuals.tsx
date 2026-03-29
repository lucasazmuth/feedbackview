import { Fragment } from 'react'
import { landingDemo } from '@/content/landing.pt-BR'

interface StepVisualsProps {
  step: number
}

function SvgIcon({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
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
                <SvgIcon size={14}>
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </SvgIcon>
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
                  <SvgIcon size={18}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </SvgIcon>
                </div>
                <span className="lstep-np-url-text">{d.step0.urlSample}</span>
                <span className="hero-typing-cursor" />
                <div className="lstep-np-url-ok" aria-hidden>
                  <SvgIcon size={14}>
                    <polyline points="20 6 9 17 4 12" />
                  </SvgIcon>
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

    case 2:
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
          <div className="lstep-feedback-modal">
            <div className="lstep-feedback-modal-head">
              <span className="lstep-feedback-modal-title">{d.step2.reportTitle}</span>
              <button type="button" className="lstep-feedback-modal-x" aria-hidden tabIndex={-1}>
                <SvgIcon size={14}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </SvgIcon>
              </button>
            </div>
            <div className="lstep-feedback-modal-body">
              <div>
                <div className="lstep-replay-label">
                  <span className="hero-recording-dot" />
                  {d.step2.replayLabel}
                </div>
                <div className="lstep-replay-shell">
                  <div className="lstep-replay-viewport">
                    <div className="lstep-replay-skel-wrap">
                      <div className="step-skel" style={{ height: 3, width: '38%' }} />
                      <div className="step-skel" style={{ height: 3, width: '62%' }} />
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <div className="step-skel" style={{ flex: 1, height: 10 }} />
                        <div className="step-skel" style={{ flex: 1, height: 10 }} />
                      </div>
                    </div>
                  </div>
                  <div className="lstep-replay-bar">
                    <div className="lstep-replay-play">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                    <div className="lstep-replay-track">
                      <div className="lstep-replay-fill" style={{ width: '62%' }} />
                    </div>
                    <span className="lstep-replay-time">00:21</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="lstep-field-label">{d.step2.fieldTitle}</label>
                <div className="lstep-field-input">{d.step2.fieldTitleValue}</div>
              </div>
              <div>
                <label className="lstep-field-label">{d.step2.fieldDescription}</label>
                <div className="lstep-field-input lstep-field-input--area">{d.step2.fieldDescriptionValue}</div>
              </div>
              <div className="lstep-field-row">
                <div className="lstep-field-col">
                  <label className="lstep-field-label">{d.step2.typeLabel}</label>
                  <div className="lstep-pill-row">
                    {d.step2.types.map((l, ti) => (
                      <span key={l} className={`lstep-pill ${ti === 0 ? 'lstep-pill--on' : ''}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="lstep-field-col">
                  <label className="lstep-field-label">{d.step2.priorityLabel}</label>
                  <div className="lstep-pill-row">
                    {d.step2.priorities.map((l, pi) => (
                      <span key={l} className={`lstep-pill ${pi === 0 ? 'lstep-pill--warn' : ''}`}>
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lstep-feedback-submit">{d.step2.submit}</div>
            </div>
          </div>
        </div>
      )

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
              <SvgIcon size={16}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </SvgIcon>
            </div>
            <div className="lstep-app-sb-item" title="Reports">
              <SvgIcon size={16}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </SvgIcon>
            </div>
            <div className="lstep-app-sb-spacer" />
            <div className="lstep-app-sb-rule" />
            <div className="lstep-app-sb-item" title="Configurações">
              <SvgIcon size={16}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </SvgIcon>
            </div>
          </aside>
          <div className="lstep-app-main">
            <header className="lstep-app-top">
              <div className="lstep-app-top-row">
                <span className="lstep-app-back">
                  <SvgIcon size={14}>
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </SvgIcon>
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
                    <SvgIcon size={16}>
                      <polyline points="9 18 15 12 9 6" />
                    </SvgIcon>
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
