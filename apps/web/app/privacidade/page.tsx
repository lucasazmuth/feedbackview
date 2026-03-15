import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
} from '@once-ui-system/core'

export const metadata = {
  title: 'Política de Privacidade — QBugs',
}

export default function PrivacidadePage() {
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
        <Column maxWidth={48} fillWidth paddingX="l" paddingY="xl" gap="l">
          <Heading variant="display-strong-s" as="h1">
            Política de Privacidade
          </Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Última atualização: Março de 2026
          </Text>

          <Column gap="m">
            <Heading variant="heading-strong-m" as="h2">1. Dados que Coletamos</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Coletamos dados que você nos fornece diretamente (nome, e-mail, empresa, telefone, CEP) e dados gerados pelo uso do serviço (screenshots, session replays, logs de console e rede). Também coletamos dados técnicos como tipo de navegador, sistema operacional e endereço IP para fins de funcionamento e segurança.
            </Text>

            <Heading variant="heading-strong-m" as="h2">2. Como Usamos seus Dados</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Utilizamos seus dados para: (a) fornecer e manter o serviço; (b) processar e exibir reports de bugs e sugestões; (c) enviar comunicações sobre o serviço; (d) melhorar a plataforma; (e) garantir a segurança do serviço. Não vendemos seus dados a terceiros.
            </Text>

            <Heading variant="heading-strong-m" as="h2">3. Session Replay e Screenshots</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              O QBugs captura session replays e screenshots para facilitar a reprodução de bugs. Campos sensíveis como senhas são automaticamente mascarados nas gravações. As capturas são armazenadas de forma segura e acessíveis apenas aos membros do projeto autorizado.
            </Text>

            <Heading variant="heading-strong-m" as="h2">4. Armazenamento e Segurança</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição.
            </Text>

            <Heading variant="heading-strong-m" as="h2">5. Compartilhamento de Dados</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Compartilhamos seus dados apenas com: (a) membros da sua equipe no projeto; (b) prestadores de serviço que nos ajudam a operar a plataforma (hospedagem, armazenamento); (c) quando exigido por lei. Todos os prestadores são obrigados a manter a confidencialidade dos dados.
            </Text>

            <Heading variant="heading-strong-m" as="h2">6. Seus Direitos</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Você tem direito a: (a) acessar seus dados pessoais; (b) corrigir dados incorretos; (c) solicitar a exclusão dos seus dados; (d) exportar seus dados; (e) revogar consentimento a qualquer momento. Para exercer esses direitos, entre em contato conosco pela{' '}
              <Link href="/contato" style={{ color: 'var(--brand-on-background-strong)', textDecoration: 'none', fontWeight: 600 }}>
                página de contato
              </Link>.
            </Text>

            <Heading variant="heading-strong-m" as="h2">7. Cookies</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Utilizamos cookies essenciais para o funcionamento da plataforma (autenticação e preferências de sessão). Não utilizamos cookies de rastreamento ou publicidade.
            </Text>

            <Heading variant="heading-strong-m" as="h2">8. Retenção de Dados</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, os dados são retidos por 30 dias para possibilitar recuperação e depois permanentemente excluídos. Dados de session replay e screenshots são retidos de acordo com o plano contratado.
            </Text>

            <Heading variant="heading-strong-m" as="h2">9. Alterações nesta Política</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por e-mail. Recomendamos revisar esta página regularmente.
            </Text>

            <Heading variant="heading-strong-m" as="h2">10. Contato</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ lineHeight: 1.7 }}>
              Para questões sobre privacidade, entre em contato pela nossa{' '}
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
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-weak)' }}>QBugs</span>
            <Text variant="body-default-xs" onBackground="neutral-weak">&copy; {new Date().getFullYear()}</Text>
          </Row>
          <Row gap="m">
            <Link href="/termos">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>Termos</Text>
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
