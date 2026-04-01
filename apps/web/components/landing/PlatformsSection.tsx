import { Container } from '@/components/ui/Container'
import { landingPlatformsSection, landingTechStack } from '@/content/landing.pt-BR'

export function PlatformsSection() {
  return (
    <section className="landing-section-pad" id="stacks">
      <Container className="flex flex-col items-center text-center">
        <span className="mb-4 inline-block rounded-full border border-transparent-white bg-white/5 px-3 py-1 text-xs text-gray">
          {landingPlatformsSection.tag}
        </span>
        <h2 className="text-gradient mb-4 text-4xl md:text-6xl">
          {landingPlatformsSection.title}
        </h2>
        <p className="mb-12 max-w-[60rem] text-lg text-primary-text">
          {landingPlatformsSection.sub}
        </p>

        <div className="flex flex-wrap justify-center gap-6" role="list">
          {landingTechStack.map((tech) => (
            <div
              key={tech.name}
              className="flex flex-col items-center gap-2 rounded-xl border border-transparent-white bg-glass-gradient p-6 backdrop-blur-sm"
              role="listitem"
            >
              <img
                src={tech.logo}
                alt={tech.name}
                className="h-10 w-10 brightness-0 invert opacity-90"
              />
              <span className="text-sm text-off-white">{tech.name}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 max-w-[50rem] text-xs text-gray">
          {landingPlatformsSection.footnote}
        </p>
      </Container>
    </section>
  )
}
