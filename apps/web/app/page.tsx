import clsx from 'clsx'
import { LandingClient, LandingClientBottom } from '@/components/landing/LandingClient'
import { MetricsBar } from '@/components/landing/MetricsBar'
import { StarsIllustration } from '@/components/landing/StarsIllustration'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { IntegrationSection } from '@/components/landing/IntegrationSection'
import { PlatformsSection } from '@/components/landing/PlatformsSection'
import { ProSection } from '@/components/landing/ProSection'
import { TestimonialsSection } from '@/components/landing/TestimonialsSection'
import { Container } from '@/components/ui/Container'

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full landing-page">
      <LandingClient />
      <MetricsBar />
      <Container className="relative z-0 isolate">
        <div
          className={clsx(
            'pointer-events-none relative isolate my-[-6rem] h-[40rem] overflow-hidden md:my-[-10rem] md:h-[52rem]',
            'before:bg-radial-faded mask-radial-faded [--color:#7877C6] before:absolute before:inset-0 before:opacity-[0.4]',
            'after:bg-background after:absolute after:-left-1/2 after:top-1/2 after:h-[142.8%] after:w-[200%] after:rounded-[50%] after:border-t after:border-[rgba(120,_119,_198,_0.4)]'
          )}
          aria-hidden
        >
          <StarsIllustration />
        </div>
      </Container>
      {/* Camada acima do palco das estrelas: evita que ::after / máscaras cubram o título das secções (margens negativas). */}
      <div className="relative z-[1] bg-background">
        <FeaturesSection />
        <HowItWorksSection />
        <IntegrationSection />
        <PlatformsSection />
        <ProSection />
        <TestimonialsSection />
        <LandingClientBottom />
      </div>
    </div>
  )
}
