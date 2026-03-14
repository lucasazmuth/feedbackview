'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Icon,
  Logo,
  Tag,
} from '@once-ui-system/core'

const features = [
  {
    icon: 'monitor' as const,
    title: 'Session Replay',
    description: 'Grave e reproduza a sessao completa do usuario. Veja exatamente o que aconteceu antes do bug.',
  },
  {
    icon: 'camera' as const,
    title: 'Screenshot Automatico',
    description: 'Captura automatica de tela com anotacoes visuais. Destaque areas com problemas diretamente.',
  },
  {
    icon: 'code' as const,
    title: 'Console & Network Logs',
    description: 'Logs de console e requisicoes de rede capturados automaticamente junto com cada feedback.',
  },
  {
    icon: 'lightning' as const,
    title: 'Integracao em 1 Minuto',
    description: 'Cole um script no HTML ou compartilhe um link. Sem SDK complexo, sem configuracao.',
  },
  {
    icon: 'shield' as const,
    title: 'Dados Sensiveis Protegidos',
    description: 'Campos de senha mascarados automaticamente. Controle total sobre o que e capturado.',
  },
  {
    icon: 'person' as const,
    title: 'Gestao de Feedbacks',
    description: 'Dashboard completo para gerenciar, priorizar e resolver feedbacks da sua equipe.',
  },
]

const steps = [
  {
    number: '1',
    title: 'Crie seu projeto',
    description: 'Cadastre-se e adicione a URL do seu site ou aplicacao.',
  },
  {
    number: '2',
    title: 'Integre em segundos',
    description: 'Compartilhe o link de QA ou cole uma linha de script no HTML.',
  },
  {
    number: '3',
    title: 'Receba feedbacks completos',
    description: 'Cada report vem com screenshot, replay, logs e contexto tecnico.',
  },
]

const faqs = [
  {
    question: 'O Qbug e gratuito?',
    answer: 'Sim! Oferecemos um plano gratuito para comecar, sem necessidade de cartao de credito. Voce pode criar projetos, receber feedbacks e usar todas as funcionalidades principais sem custo.',
  },
  {
    question: 'Como funciona a captura de session replay?',
    answer: 'O Qbug usa a biblioteca rrweb para gravar as interacoes do usuario em tempo real. Cada acao (clique, scroll, digitacao) e capturada e pode ser reproduzida como um video, permitindo que voce veja exatamente o que aconteceu antes do bug.',
  },
  {
    question: 'Preciso instalar algo no meu site?',
    answer: 'Depende do modo de integracao. Com o Link Compartilhado, nao precisa instalar nada — basta compartilhar o link com sua equipe. Com o Script Embed, basta colar uma unica linha de codigo no HTML do seu site.',
  },
  {
    question: 'Os dados dos usuarios ficam seguros?',
    answer: 'Sim. Campos sensiveis como senhas sao automaticamente mascarados nas gravacoes. Alem disso, todos os dados sao armazenados de forma segura no Supabase com criptografia em transito e em repouso.',
  },
  {
    question: 'Posso usar em projetos com frameworks como React, Next.js ou Vue?',
    answer: 'Sim! O Qbug funciona com qualquer tecnologia web. O script embed e framework-agnostico e o modo de link compartilhado funciona com qualquer URL acessivel.',
  },
  {
    question: 'Quantos membros da equipe posso convidar?',
    answer: 'No plano gratuito, voce pode convidar toda a sua equipe sem limites. Todos os membros podem enviar e visualizar feedbacks no dashboard do projeto.',
  },
]

const viewerUrl = 'https://app.qbug.com.br/p/seu-projeto-id'
const embedSnippet = '<script src="https://app.qbug.com.br/embed.js" data-project="ID"></script>'

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

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
        <Row gap="s" vertical="center">
          <Logo size="s" />
          <Heading variant="heading-strong-s">Qbug</Heading>
        </Row>
        <Row gap="s" vertical="center">
          <Link href="/auth/login">
            <Button variant="tertiary" size="s" label="Entrar" />
          </Link>
          <Link href="/auth/register">
            <Button variant="primary" size="s" label="Comecar gratis" />
          </Link>
        </Row>
      </Row>

      {/* Hero */}
      <Flex
        fillWidth
        horizontal="center"
        style={{
          background: 'linear-gradient(180deg, var(--surface-background) 0%, var(--page-background) 100%)',
          overflow: 'hidden',
        }}
      >
        <Column
          maxWidth={64}
          fillWidth
          paddingX="l"
          paddingY="xl"
          gap="l"
          horizontal="center"
          style={{ textAlign: 'center' }}
        >
          <Tag variant="brand" size="l" label="Plataforma de QA em tempo real" />

          <Heading
            variant="display-strong-l"
            as="h1"
            style={{ maxWidth: '48rem' }}
          >
            Capture bugs com screenshot, replay e logs — automaticamente
          </Heading>

          <Text
            variant="body-default-l"
            onBackground="neutral-weak"
            style={{ maxWidth: '36rem' }}
          >
            Sua equipe de QA reporta bugs com contexto tecnico completo.
            Sem prints manuais, sem &ldquo;nao consigo reproduzir&rdquo;.
          </Text>

          <Row gap="m" style={{ marginTop: '0.5rem' }}>
            <Link href="/auth/register">
              <Button variant="primary" size="l" label="Comecar gratis" />
            </Link>
            <a href="#como-funciona">
              <Button variant="secondary" size="l" label="Como funciona" />
            </a>
          </Row>

          {/* Hero visual */}
          <Card
            fillWidth
            padding="0"
            radius="l"
            className="hero-card"
            style={{
              marginTop: '1.5rem',
              overflow: 'hidden',
              border: '1px solid var(--neutral-border-medium)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{
              background: 'var(--neutral-alpha-weak)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              width: '100%',
              position: 'relative',
            }}>
              {/* Animated cursor */}
              <svg className="hero-cursor" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 3l14 8-6 2-4 6-4-16z" fill="var(--brand-solid-strong)" stroke="#fff" strokeWidth="1.5" />
              </svg>

              {/* Mock toolbar */}
              <div className="hero-toolbar" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface-background)',
                borderRadius: '0.75rem',
                border: '1px solid var(--neutral-border-medium)',
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{
                  flex: 1,
                  padding: '4px 12px',
                  background: 'var(--neutral-alpha-weak)',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: 'var(--neutral-on-background-weak)',
                }}>
                  app.seusite.com.br
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="hero-recording-dot" />
                  <Tag variant="success" size="s" label="Capturando" />
                </div>
              </div>

              {/* Mock content area */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr minmax(200px, 280px)',
                gap: '1rem',
                minHeight: '220px',
              }}>
                {/* Mock page */}
                <div className="hero-mock-page" style={{
                  background: 'var(--surface-background)',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--neutral-border-medium)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div className="hero-skeleton" style={{ width: '60%', height: 14, borderRadius: 4, background: 'var(--neutral-alpha-medium)' }} />
                  <div className="hero-skeleton" style={{ width: '90%', height: 10, borderRadius: 4, background: 'var(--neutral-alpha-weak)' }} />
                  <div className="hero-skeleton" style={{ width: '75%', height: 10, borderRadius: 4, background: 'var(--neutral-alpha-weak)' }} />
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <div style={{ width: 80, height: 32, borderRadius: 8, background: 'var(--brand-solid-strong)' }} />
                    <div style={{ width: 80, height: 32, borderRadius: 8, background: 'var(--neutral-alpha-weak)' }} />
                  </div>
                </div>

                {/* Mock feedback panel */}
                <div className="hero-feedback-panel" style={{
                  background: 'var(--surface-background)',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--neutral-border-medium)',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.75rem',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>Enviar Feedback</div>
                  <div style={{
                    height: 60,
                    borderRadius: 8,
                    background: 'var(--neutral-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="camera" size="s" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="hero-skeleton" style={{ width: '100%', height: 8, borderRadius: 3, background: 'var(--neutral-alpha-weak)' }} />
                    <div className="hero-skeleton" style={{ width: '70%', height: 8, borderRadius: 3, background: 'var(--neutral-alpha-weak)' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <span className="hero-tag"><Tag variant="danger" size="s" label="Bug" /></span>
                    <span className="hero-tag"><Tag variant="warning" size="s" label="Medio" /></span>
                  </div>
                  <div style={{
                    marginTop: 'auto',
                    padding: '6px 12px',
                    borderRadius: 6,
                    background: 'var(--brand-solid-strong)',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                  }}>
                    Enviar Feedback
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Column>
      </Flex>

      {/* Features */}
      <Flex fillWidth horizontal="center" background="page">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Funcionalidades" />
            <Heading variant="display-strong-s" as="h2">
              Tudo que sua equipe precisa para QA
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '32rem' }}>
              Cada feedback enviado inclui contexto tecnico completo — automaticamente.
            </Text>
          </Column>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            width: '100%',
          }}>
            {features.map((feature) => (
              <Card key={feature.title} padding="l" radius="l" fillWidth>
                <Column gap="m">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--brand-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name={feature.icon} size="s" onBackground="brand-strong" />
                  </div>
                  <Column gap="xs">
                    <Heading variant="heading-strong-s">{feature.title}</Heading>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {feature.description}
                    </Text>
                  </Column>
                </Column>
              </Card>
            ))}
          </div>
        </Column>
      </Flex>

      {/* How it works */}
      <Flex fillWidth horizontal="center" background="surface" id="como-funciona">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Como funciona" />
            <Heading variant="display-strong-s" as="h2">
              3 passos para QA profissional
            </Heading>
          </Column>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            width: '100%',
          }}>
            {steps.map((step) => (
              <Column key={step.number} gap="m" horizontal="center" style={{ textAlign: 'center' }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--brand-solid-strong)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}>
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

      {/* Integration modes */}
      <Flex fillWidth horizontal="center" background="page">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Integracao" />
            <Heading variant="display-strong-s" as="h2">
              Duas formas de integrar
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '32rem' }}>
              Escolha a que funciona melhor para o seu fluxo de trabalho.
            </Text>
          </Column>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            width: '100%',
          }}>
            {/* Link mode */}
            <Card padding="l" radius="l" fillWidth>
              <Column gap="m">
                <Row gap="s" vertical="center">
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--brand-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="openLink" size="s" onBackground="brand-strong" />
                  </div>
                  <Column gap="2">
                    <Heading variant="heading-strong-s">Link Compartilhado</Heading>
                    <Tag variant="brand" size="s" label="Sem instalacao" />
                  </Column>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Compartilhe um link unico com sua equipe de QA. Eles navegam pelo site normalmente e enviam feedbacks com um clique.
                </Text>
                <Card padding="s" radius="m" fillWidth style={{ background: 'var(--neutral-alpha-weak)', border: 'none' }}>
                  <code style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-all' }}>
                    {viewerUrl}
                  </code>
                </Card>
              </Column>
            </Card>

            {/* Embed mode */}
            <Card padding="l" radius="l" fillWidth>
              <Column gap="m">
                <Row gap="s" vertical="center">
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--brand-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="code" size="s" onBackground="brand-strong" />
                  </div>
                  <Column gap="2">
                    <Heading variant="heading-strong-s">Script Embed</Heading>
                    <Tag variant="info" size="s" label="1 linha de codigo" />
                  </Column>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Adicione uma tag script no HTML do seu site. Um botao flutuante aparece para os usuarios enviarem feedback.
                </Text>
                <Card padding="s" radius="m" fillWidth style={{ background: 'var(--neutral-alpha-weak)', border: 'none' }}>
                  <code style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--neutral-on-background-weak)', wordBreak: 'break-all' }}>
                    {embedSnippet}
                  </code>
                </Card>
              </Column>
            </Card>
          </div>
        </Column>
      </Flex>

      {/* FAQ */}
      <Flex fillWidth horizontal="center" background="surface" id="faq">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="FAQ" />
            <Heading variant="display-strong-s" as="h2">
              Perguntas frequentes
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '32rem' }}>
              Tudo que voce precisa saber sobre o Qbug.
            </Text>
          </Column>

          <Column gap="0" fillWidth style={{ maxWidth: '48rem', margin: '0 auto' }}>
            {faqs.map((faq, index) => (
              <div
                key={index}
                style={{
                  borderBottom: '1px solid var(--neutral-border-medium)',
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem 0',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: '1rem',
                  }}
                >
                  <span style={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--neutral-on-background-strong)',
                  }}>
                    {faq.question}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--neutral-on-background-weak)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      flexShrink: 0,
                      transition: 'transform 0.2s ease',
                      transform: openFaq === index ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <div
                  style={{
                    overflow: 'hidden',
                    maxHeight: openFaq === index ? '200px' : '0',
                    transition: 'max-height 0.3s ease',
                  }}
                >
                  <p style={{
                    margin: 0,
                    paddingBottom: '1.25rem',
                    fontSize: '0.925rem',
                    lineHeight: 1.6,
                    color: 'var(--neutral-on-background-weak)',
                  }}>
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </Column>
        </Column>
      </Flex>

      {/* CTA */}
      <Flex fillWidth horizontal="center" background="page">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="l" horizontal="center" style={{ textAlign: 'center' }}>
          <Heading variant="display-strong-s" as="h2">
            Pronto para acabar com &ldquo;nao consigo reproduzir&rdquo;?
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '28rem' }}>
            Comece gratis agora. Nenhum cartao necessario.
          </Text>
          <Row gap="m" style={{ marginTop: '0.5rem' }}>
            <Link href="/auth/register">
              <Button variant="primary" size="l" label="Criar conta gratis" />
            </Link>
            <Link href="/auth/login">
              <Button variant="tertiary" size="l" label="Ja tenho conta" />
            </Link>
          </Row>
        </Column>
      </Flex>

      {/* Footer */}
      <Flex
        as="footer"
        fillWidth
        horizontal="center"
        borderTop="neutral-medium"
        background="surface"
      >
        <Row
          maxWidth={64}
          fillWidth
          paddingX="l"
          paddingY="m"
          horizontal="between"
          vertical="center"
        >
          <Row gap="xs" vertical="center">
            <Logo size="xs" />
            <Text variant="body-default-xs" onBackground="neutral-weak">
              Qbug &copy; {new Date().getFullYear()}
            </Text>
          </Row>
          <Row gap="m">
            <Link href="/auth/login">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>
                Entrar
              </Text>
            </Link>
            <Link href="/auth/register">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>
                Criar conta
              </Text>
            </Link>
          </Row>
        </Row>
      </Flex>
    </Column>
  )
}
