import {
  Flex,
  Column,
  Heading,
  Text,
} from '@once-ui-system/core'
import { landingFeaturesSection, landingFeatures } from '@/content/landing.pt-BR'
import { featureIcons } from './icons'

export function FeaturesSection() {
  return (
    <section className="landing-section landing-section--alt" id="funcionalidades">
      <div className="landing-container">
        <div className="landing-section-intro landing-section-intro--left">
          <span className="landing-eyebrow">{landingFeaturesSection.tag}</span>
          <h2 className="landing-h2">{landingFeaturesSection.title}</h2>
          <p className="landing-subtitle">{landingFeaturesSection.sub}</p>
        </div>

        <div className="landing-cap-grid" role="list">
          {landingFeatures.map((feature) => (
            <article key={feature.title} className="landing-cap-cell" role="listitem">
              <div className="landing-cap-head">
                <div className="landing-cap-icon" aria-hidden="true">{featureIcons[feature.iconKey]}</div>
                <h3 className="landing-cap-title">{feature.title}</h3>
              </div>
              <p className="landing-cap-desc">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
