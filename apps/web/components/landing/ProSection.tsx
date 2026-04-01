'use client'

import { landingProSection } from '@/content/landing.pt-BR'
import { featureIcons } from './icons'
import { Features } from './Features'

export function ProSection() {
  const items = landingProSection.cards.map((card) => ({
    icon: featureIcons[card.iconKey] ?? (
      <span className="text-off-white text-sm font-bold">{card.label[0]}</span>
    ),
    title: card.title,
    text: card.body,
  }))

  return (
    <div id="integracoes-pro">
      <Features color="0,225,244" colorDark="31,49,64">
        <Features.Main
          title={landingProSection.title}
          text={landingProSection.sub}
        />
        <Features.Grid items={items} />
      </Features>
    </div>
  )
}
