'use client'

import { landingFlow } from '@/content/landing.pt-BR'
import { featureIcons } from './icons'
import { Features } from './Features'
import { HeroImageFrame } from './HeroImage'
import { HeroReportsMockup } from './HeroReportsMockup'

export function HowItWorksSection() {
  const items = landingFlow.titles.map((title, i) => ({
    icon: (
      <span className="text-lg font-bold tabular-nums">
        {i + 1}
      </span>
    ),
    title,
    text: landingFlow.descriptions[i],
  }))

  return (
    <div id="como-funciona">
      <Features color="194,97,254" colorDark="53,42,79">
        <Features.Main
          title={landingFlow.sectionTitle}
          text={landingFlow.sectionLead}
          imageAspect="16/12"
          image={
            <HeroImageFrame embedded aria-label="Buug: prévia da tela de Reports">
              <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
                <HeroReportsMockup />
              </div>
            </HeroImageFrame>
          }
        />
        <Features.Grid items={items} />
      </Features>
    </div>
  )
}
