import { Column } from '@once-ui-system/core'
import { LandingClient, LandingClientBottom } from '@/components/landing/LandingClient'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { IntegrationSection } from '@/components/landing/IntegrationSection'
import { ProSection } from '@/components/landing/ProSection'
import { ComparisonSection } from '@/components/landing/ComparisonSection'
import { Footer } from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <Column fillWidth className="landing-root">
      <LandingClient />
      <HowItWorksSection />
      <FeaturesSection />
      <IntegrationSection />
      <ProSection />
      <ComparisonSection />
      <LandingClientBottom />
      <Footer />
    </Column>
  )
}
