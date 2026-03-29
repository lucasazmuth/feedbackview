import { Flex, Row } from '@once-ui-system/core'
import { landingMetrics } from '@/content/landing.pt-BR'

export function MetricsBar() {
  return (
    <Flex fillWidth horizontal="center" background="page" className="landing-metrics-bar">
      <Row maxWidth={64} fillWidth paddingX="l" paddingY="l" horizontal="center" gap="xl" className="landing-metrics-row">
        {landingMetrics.map((stat, i) => (
          <div key={i} className="landing-metric-cell">
            <div className="landing-metric-value">{stat.value}</div>
            <div className="landing-metric-label">{stat.label}</div>
          </div>
        ))}
      </Row>
    </Flex>
  )
}
