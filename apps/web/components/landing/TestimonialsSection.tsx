import clsx from 'clsx'
import { Container } from '@/components/ui/Container'
import {
  landingTestimonials,
  landingTestimonialsSection,
} from '@/content/landing.pt-BR'

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={clsx(
            'text-sm leading-none',
            i < count ? 'text-amber-400' : 'text-black/10'
          )}
        >
          ★
        </span>
      ))}
    </div>
  )
}

export function TestimonialsSection() {
  return (
    <section
      className="landing-section-pad"
      id="avaliacoes"
      aria-labelledby="landing-testimonials-heading"
    >
      <Container>
        <div className="landing-section-intro">
          <span className="mb-4 inline-flex items-center rounded-full border border-transparent-white px-4 py-1 text-xs text-primary-text uppercase tracking-wider">
            {landingTestimonialsSection.tag}
          </span>
          <h2
            id="landing-testimonials-heading"
            className="text-gradient mb-4 text-4xl font-bold tracking-tight md:text-5xl"
          >
            {landingTestimonialsSection.title}
          </h2>
          <p className="text-primary-text text-lg leading-relaxed">
            {landingTestimonialsSection.sub}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {landingTestimonials.map((t) => (
            <blockquote
              key={t.name}
              className={clsx(
                'flex flex-col gap-5 p-8',
                'rounded-[2.4rem] border border-transparent-white bg-glass-gradient',
                'md:rounded-[2.8rem]'
              )}
            >
              <Stars count={t.rating} />
              <p className="m-0 flex-1 text-base leading-relaxed text-off-white">
                “{t.quote}”
              </p>
              <footer className="border-t border-transparent-white pt-5">
                <cite className="not-italic">
                  <span className="block font-medium text-off-white">{t.name}</span>
                  <span className="mt-1 block text-sm text-gray">{t.role}</span>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-gray">
          {landingTestimonialsSection.disclaimer}
        </p>
      </Container>
    </section>
  )
}
