import { Container } from '@/components/ui/Container'
import { landingThreeStepsSection, landingSteps } from '@/content/landing.pt-BR'

export function ThreeStepsSection() {
  return (
    <section id="tres-passos" className="landing-section-pad">
      <Container className="text-center">
        <span className="mb-4 inline-block rounded-full border border-transparent-white bg-black/[0.03] px-3 py-1 text-xs text-gray">
          {landingThreeStepsSection.tag}
        </span>
        <h2 className="text-gradient mb-12 text-4xl md:text-6xl">
          {landingThreeStepsSection.title}
        </h2>

        <div className="mx-auto grid max-w-[90rem] grid-cols-1 gap-8 md:grid-cols-3" role="list">
          {landingSteps.map((step) => (
            <div key={step.number} className="flex flex-col items-center gap-4 text-center" role="listitem">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-gradient text-lg font-bold text-white" aria-hidden="true">
                {step.number}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold text-off-white">{step.title}</h3>
                <p className="text-sm text-primary-text">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
