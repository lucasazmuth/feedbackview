import { Container } from '@/components/ui/Container'
import { landingMetrics } from '@/content/landing.pt-BR'

export function MetricsBar() {
  return (
    <section className="border-t border-b border-transparent-white py-10 bg-background">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-4">
          {landingMetrics.map((m, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center md:border-r md:last:border-r-0 border-transparent-white px-4"
            >
              <span className="text-off-white text-2xl md:text-3xl font-bold mb-1">
                {m.value}
              </span>
              <span className="text-primary-text text-sm leading-snug max-w-[20rem]">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
