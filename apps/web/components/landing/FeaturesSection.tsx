import clsx from 'clsx'
import { Container } from '@/components/ui/Container'
import { landingFeaturesSection, landingFeatures } from '@/content/landing.pt-BR'
import { featureIcons } from './icons'

export function FeaturesSection() {
  return (
    <section className="landing-section-pad" id="funcionalidades">
      <Container>
        {/* Section header */}
        <div className="landing-section-intro">
          <span className="mb-4 inline-flex items-center rounded-full border border-transparent-white px-4 py-1 text-xs text-primary-text uppercase tracking-wider">
            {landingFeaturesSection.tag}
          </span>
          <h2 className="text-gradient text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {landingFeaturesSection.title}
          </h2>
          <p className="text-primary-text text-lg leading-relaxed">
            {landingFeaturesSection.sub}
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {landingFeatures.map((f, i) => (
            <div
              key={f.title}
              className={clsx(
                'group relative flex flex-col gap-4 p-8',
                'bg-glass-gradient border border-transparent-white',
                'rounded-[2.4rem] md:rounded-[4.8rem]',
                'transition-all duration-300 ease-out',
                'hover:bg-transparent-white hover:-translate-y-1',
                'hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(59,130,246,0.12)]',
                /* Último card: sozinho na 2ª linha em lg (3 col.) — centraliza na coluna do meio */
                i === landingFeatures.length - 1 && 'lg:col-start-2 xl:col-start-auto'
              )}
            >
              <div
                className={clsx(
                  'flex h-12 w-12 items-center justify-center rounded-2xl',
                  'border border-transparent-white bg-background text-off-white'
                )}
              >
                {featureIcons[f.iconKey]}
              </div>
              <h3 className="text-off-white text-lg font-medium">
                {f.title}
              </h3>
              <p className="text-primary-text text-sm leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
