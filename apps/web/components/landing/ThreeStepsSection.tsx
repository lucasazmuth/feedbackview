import {
  Flex,
  Column,
  Heading,
  Text,
  Tag,
} from '@once-ui-system/core'
import { landingThreeStepsSection, landingSteps } from '@/content/landing.pt-BR'

export function ThreeStepsSection() {
  return (
    <Flex fillWidth horizontal="center" background="page" id="tres-passos">
      <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
        <Column horizontal="center" gap="s" className="landing-section-header">
          <Tag variant="neutral" size="m" label={landingThreeStepsSection.tag} />
          <Heading variant="display-strong-s" as="h2">
            {landingThreeStepsSection.title}
          </Heading>
        </Column>

        <div className="landing-steps-grid" role="list">
          {landingSteps.map((step) => (
            <Column key={step.number} gap="m" horizontal="center" className="landing-section-header" role="listitem">
              <div className="landing-step-circle" aria-hidden="true">
                {step.number}
              </div>
              <Column gap="xs">
                <Heading variant="heading-strong-s">{step.title}</Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  {step.description}
                </Text>
              </Column>
            </Column>
          ))}
        </div>
      </Column>
    </Flex>
  )
}
