'use client'

import { landingIntegrationSection } from '@/content/landing.pt-BR'
import { Features } from './Features'

export function IntegrationSection() {
  const { linkCard, embedCard } = landingIntegrationSection

  const cards = [
    {
      title: linkCard.title,
      badge: linkCard.badge,
      body: linkCard.body,
      tags: [...linkCard.tagsInclude],
      tagsExclude: [...linkCard.tagsExclude],
    },
    {
      title: embedCard.title,
      badge: embedCard.badge,
      body: embedCard.body,
      tags: [...embedCard.tagsInclude],
    },
  ]

  return (
    <div id="integracao">
      <Features color="40,87,255" colorDark="48,58,117">
        <Features.Main
          title={landingIntegrationSection.title}
          text={landingIntegrationSection.sub}
        />
        <Features.Cards items={cards} />
      </Features>
    </div>
  )
}
