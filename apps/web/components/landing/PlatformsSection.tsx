import {
  Flex,
  Column,
  Heading,
  Text,
  Tag,
} from '@once-ui-system/core'
import { landingPlatformsSection, landingTechStack } from '@/content/landing.pt-BR'

export function PlatformsSection() {
  return (
    <Flex fillWidth horizontal="center" background="page">
      <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl" horizontal="center">
        <Column horizontal="center" gap="s" className="landing-section-header">
          <Tag variant="neutral" size="m" label={landingPlatformsSection.tag} />
          <Heading variant="display-strong-s" as="h2">
            {landingPlatformsSection.title}
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak" className="landing-section-sub">
            {landingPlatformsSection.sub}
          </Text>
        </Column>

        <div className="landing-platforms-grid" role="list">
          {landingTechStack.map((tech) => (
            <div key={tech.name} className="landing-platform-card" role="listitem">
              <div className="landing-platform-logo">
                <img src={tech.logo} alt={tech.name} />
              </div>
              <span className="landing-platform-name">{tech.name}</span>
            </div>
          ))}
        </div>

        <Text variant="body-default-xs" onBackground="neutral-weak" className="landing-section-header">
          {landingPlatformsSection.footnote}
        </Text>
      </Column>
    </Flex>
  )
}
