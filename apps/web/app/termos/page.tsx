import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
} from '@once-ui-system/core'

export const metadata = {
  title: 'Termos de Uso — Report Bug',
}

export default function TermosPage() {
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
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>Report Bug</span>
        </Link>
      </Row>

      <Flex fillWidth horizontal="center" style={{ flex: 1 }}>
        <Column maxWidth={48} fillWidth paddingX="l" paddingY="xl" gap="l">
          <Heading variant="display-strong-s" as="h1">
            Termos de Uso
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Última atualização: Março de 2026
          </Text>

          <Column gap="m">
            <Heading variant="heading-strong-m" as="h2">1. Aceitação dos Termos</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Ao acessar e usar o Report Bug, você concorda com estes Termos de Uso. Se você não concorda com algum destes termos, não utilize nossos serviços. O uso continuado da plataforma constitui aceitação de quaisquer alterações feitas nestes termos.
            </Text>

            <Heading variant="heading-strong-m" as="h2">2. Descrição do Serviço</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              O Report Bug é uma plataforma de QA (Quality Assurance) que permite capturar screenshots, session replays, logs de console e rede automaticamente junto a reports de bugs e sugestões. O serviço inclui um widget embarcável, link compartilhável e painel de gerenciamento.
            </Text>

            <Heading variant="heading-strong-m" as="h2">3. Cadastro e Conta</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Para usar o Report Bug, você deve criar uma conta fornecendo informações verdadeiras e completas. Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente caso suspeite de uso não autorizado.
            </Text>

            <Heading variant="heading-strong-m" as="h2">4. Uso Aceitável</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Você concorda em usar o Report Bug apenas para fins legais e de acordo com estes termos. É proibido: (a) usar o serviço para atividades ilegais; (b) tentar acessar áreas restritas da plataforma; (c) interferir no funcionamento do serviço; (d) coletar dados de outros usuários sem consentimento.
            </Text>

            <Heading variant="heading-strong-m" as="h2">5. Propriedade Intelectual</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Todo o conteúdo da plataforma Report Bug, incluindo textos, gráficos, logos, ícones e software, é protegido por leis de propriedade intelectual. Você mantém a propriedade dos dados enviados através da plataforma, concedendo-nos uma licença limitada para processar e armazenar esses dados conforme necessário para a prestação do serviço.
            </Text>

            <Heading variant="heading-strong-m" as="h2">6. Limitação de Responsabilidade</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              O Report Bug é fornecido &ldquo;como está&rdquo;. Não garantimos que o serviço será ininterrupto ou livre de erros. Em nenhuma circunstância seremos responsáveis por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso do serviço.
            </Text>

            <Heading variant="heading-strong-m" as="h2">7. Cancelamento</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Você pode cancelar sua conta a qualquer momento. Após o cancelamento, seus dados serão retidos por 30 dias e depois permanentemente excluídos. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
            </Text>

            <Heading variant="heading-strong-m" as="h2">8. Alterações nos Termos</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Podemos atualizar estes termos periodicamente. Notificaremos sobre alterações significativas por e-mail ou aviso na plataforma. O uso continuado após as alterações constitui aceitação dos novos termos.
            </Text>

            <Heading variant="heading-strong-m" as="h2">9. Contato</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Para dúvidas sobre estes termos, entre em contato através da nossa{' '}
              <Link href="/contato" style={{ color: 'var(--brand-on-background-strong)', textDecoration: 'none', fontWeight: 600 }}>
                página de contato
              </Link>.
            </Text>
          </Column>
        </Column>
      </Flex>

      {/* Footer */}
      <Flex as="footer" fillWidth horizontal="center" borderTop="neutral-medium" background="surface">
        <Row maxWidth={64} fillWidth paddingX="l" paddingY="m" horizontal="between" vertical="center">
          <Row gap="xs" vertical="center">
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-weak)' }}>Report Bug</span>
            <Text variant="body-default-xs" onBackground="neutral-weak">&copy; {new Date().getFullYear()}</Text>
          </Row>
          <Row gap="m">
            <Link href="/privacidade">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>Privacidade</Text>
            </Link>
            <Link href="/contato">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>Contato</Text>
            </Link>
          </Row>
        </Row>
      </Flex>
    </Column>
  )
}
