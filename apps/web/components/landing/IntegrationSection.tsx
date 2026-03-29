import {
  Flex,
  Column,
  Heading,
  Text,
} from '@once-ui-system/core'
import {
  landingIntegrationSection,
  landingViewerUrl,
  landingEmbedSnippet,
} from '@/content/landing.pt-BR'

export function IntegrationSection() {
  return (
    <section className="landing-section" id="integracao">
      <div className="landing-container">
        <div className="landing-section-intro">
          <span className="landing-eyebrow">{landingIntegrationSection.tag}</span>
          <h2 className="landing-h2">{landingIntegrationSection.title}</h2>
          <p className="landing-subtitle landing-subtitle--narrow">{landingIntegrationSection.sub}</p>
        </div>

        <div className="landing-integration-grid">
          <article className="landing-int-card landing-int-card--link">
            <div className="landing-int-card-inner">
              <div>
                <div className="landing-int-kicker">Modo homologação</div>
                <div className="landing-int-head">
                  <h3>{landingIntegrationSection.linkCard.title}</h3>
                  <span className="landing-int-pill landing-int-pill--accent">{landingIntegrationSection.linkCard.badge}</span>
                </div>
              </div>
              <p className="landing-int-body">{landingIntegrationSection.linkCard.body}</p>
              <div className="landing-int-terminal">
                <div className="landing-int-terminal-bar">
                  <span className="landing-int-terminal-dot" />
                  <span className="landing-int-terminal-dot" />
                  <span className="landing-int-terminal-dot" />
                  <span className="landing-int-terminal-label">URL</span>
                </div>
                <pre className="landing-int-terminal-body">{landingViewerUrl}</pre>
              </div>
              <div className="landing-int-chips">
                {landingIntegrationSection.linkCard.tagsInclude.map((t) => (
                  <span key={t} className="landing-int-chip landing-int-chip--on">{t}</span>
                ))}
                {landingIntegrationSection.linkCard.tagsExclude.map((t) => (
                  <span key={t} className="landing-int-chip landing-int-chip--off">{t}</span>
                ))}
              </div>
            </div>
          </article>

          <article className="landing-int-card landing-int-card--embed">
            <div className="landing-int-card-inner">
              <div>
                <div className="landing-int-kicker">Modo produção</div>
                <div className="landing-int-head">
                  <h3>{landingIntegrationSection.embedCard.title}</h3>
                  <span className="landing-int-pill landing-int-pill--teal">{landingIntegrationSection.embedCard.badge}</span>
                </div>
              </div>
              <p className="landing-int-body">{landingIntegrationSection.embedCard.body}</p>
              <div className="landing-int-terminal">
                <div className="landing-int-terminal-bar">
                  <span className="landing-int-terminal-dot" />
                  <span className="landing-int-terminal-dot" />
                  <span className="landing-int-terminal-dot" />
                  <span className="landing-int-terminal-label">HTML</span>
                </div>
                <pre className="landing-int-terminal-body">{landingEmbedSnippet}</pre>
              </div>
              <div className="landing-int-chips">
                {landingIntegrationSection.embedCard.tagsInclude.map((t) => (
                  <span key={t} className="landing-int-chip landing-int-chip--on">{t}</span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
