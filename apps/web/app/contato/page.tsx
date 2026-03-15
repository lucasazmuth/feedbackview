import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
  Card,
} from '@once-ui-system/core'

export const metadata = {
  title: 'Contato — QBugs',
}

export default function ContatoPage() {
  return (
    <Column fillWidth style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <Row
        as="nav"
        fillWidth
        horizontal="between"
        vertical="center"
        paddingX="l"
        paddingY="s"
        borderBottom="neutral-medium"
        background="surface"
        style={{ position: 'sticky', top: 0, zIndex: 50 }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>QBugs</span>
        </Link>
      </Row>

      <Flex fillWidth horizontal="center" style={{ flex: 1 }}>
        <Column maxWidth={48} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column gap="4">
            <Heading variant="display-strong-s" as="h1">
              Contato
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Tem alguma dúvida, sugestão ou precisa de suporte? Fale conosco.
            </Text>
          </Column>

          <Column gap="m" style={{ maxWidth: '24rem' }}>
            <Card padding="l" radius="l" border="neutral-medium">
              <Column gap="s">
                <Row gap="s" vertical="center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-on-background-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <Text variant="body-default-m" style={{ fontWeight: 600 }}>E-mail</Text>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  contato@qbugs.com.br
                </Text>
              </Column>
            </Card>

            <Card padding="l" radius="l" border="neutral-medium">
              <Column gap="s">
                <Row gap="s" vertical="center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-on-background-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <Text variant="body-default-m" style={{ fontWeight: 600 }}>Localização</Text>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Brasil
                </Text>
              </Column>
            </Card>

            <Card padding="l" radius="l" border="neutral-medium">
              <Column gap="s">
                <Row gap="s" vertical="center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-on-background-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <Text variant="body-default-m" style={{ fontWeight: 600 }}>Horário</Text>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Segunda a Sexta, 9h às 18h (BRT)
                </Text>
              </Column>
            </Card>
          </Column>
        </Column>
      </Flex>

      {/* Footer */}
      <Flex as="footer" fillWidth horizontal="center" borderTop="neutral-medium" background="surface">
        <Row maxWidth={64} fillWidth paddingX="l" paddingY="m" horizontal="between" vertical="center">
          <Row gap="xs" vertical="center">
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-weak)' }}>QBugs</span>
            <Text variant="body-default-xs" onBackground="neutral-weak">&copy; {new Date().getFullYear()}</Text>
          </Row>
          <Row gap="m">
            <Link href="/termos">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>Termos</Text>
            </Link>
            <Link href="/privacidade">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>Privacidade</Text>
            </Link>
          </Row>
        </Row>
      </Flex>
    </Column>
  )
}
