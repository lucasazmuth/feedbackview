import { landingProSection } from '@/content/landing.pt-BR'
import { featureIcons } from './icons'

export function ProSection() {
  return (
    <section className="landing-section landing-section--alt" id="integracoes-pro">
      <div className="landing-container">
        <div className="landing-section-intro">
          <span className="landing-eyebrow landing-eyebrow--brand">{landingProSection.tag}</span>
          <h2 className="landing-h2">{landingProSection.title}</h2>
          <p className="landing-subtitle">{landingProSection.sub}</p>
        </div>

        <div className="landing-pro-grid">
          {landingProSection.cards.map((card) => (
            <article key={card.title} className="landing-pro-card">
              <div className="landing-pro-card-icon" aria-hidden="true">
                {featureIcons[card.iconKey]}
              </div>
              <div className="landing-pro-card-content">
                <div className="landing-pro-card-top">
                  <h3 className="landing-pro-card-title">{card.title}</h3>
                  <span className="landing-pro-card-label">{card.label}</span>
                </div>
                <p className="landing-pro-card-body">{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
