'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import Script from 'next/script'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })
import { createClient } from '@/lib/supabase/client'
import {
  Flex,
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Icon,
  Tag,
} from '@once-ui-system/core'

const featureIcons: Record<string, React.ReactNode> = {
  replay: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>,
  screenshot: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  logs: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
  bolt: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
  lock: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
}

const features = [
  {
    iconKey: 'replay',
    title: 'Session Replay',
    description: 'Grave e reproduza a sessão completa do usuário. Veja exatamente o que aconteceu antes do bug.',
  },
  {
    iconKey: 'screenshot',
    title: 'Screenshot Automático',
    description: 'Captura automática de tela com anotações visuais. Destaque áreas com problemas diretamente.',
  },
  {
    iconKey: 'logs',
    title: 'Console & Network Logs',
    description: 'Logs de console e requisições de rede capturados automaticamente junto com cada report.',
  },
  {
    iconKey: 'bolt',
    title: 'Integração em 1 Minuto',
    description: 'Cole um script no HTML ou compartilhe um link. Sem SDK complexo, sem configuração.',
  },
  {
    iconKey: 'lock',
    title: 'Dados Sensíveis Protegidos',
    description: 'Campos de senha mascarados automaticamente. Controle total sobre o que é capturado.',
  },
  {
    iconKey: 'dashboard',
    title: 'Gestão de Reports',
    description: 'Dashboard completo para gerenciar, priorizar e resolver reports da sua equipe.',
  },
]

const steps = [
  {
    number: '1',
    title: 'Crie seu projeto',
    description: 'Cadastre-se e adicione a URL do seu site ou aplicação.',
  },
  {
    number: '2',
    title: 'Integre em segundos',
    description: 'Compartilhe o link de QA ou cole uma linha de script no HTML.',
  },
  {
    number: '3',
    title: 'Receba reports completos',
    description: 'Cada report vem com screenshot, replay, logs e contexto técnico.',
  },
]

const faqs = [
  {
    question: 'O QBugs é gratuito?',
    answer: 'Sim! Oferecemos um plano gratuito para começar, sem necessidade de cartão de crédito. Você pode criar projetos, receber reports e usar todas as funcionalidades principais sem custo.',
  },
  {
    question: 'Como funciona a captura de session replay?',
    answer: 'O QBugs usa a biblioteca rrweb para gravar as interações do usuário em tempo real. Cada ação (clique, scroll, digitação) é capturada e pode ser reproduzida como um vídeo, permitindo que você veja exatamente o que aconteceu antes do bug.',
  },
  {
    question: 'Preciso instalar algo no meu site?',
    answer: 'Depende do modo de integração. Com o Link Compartilhado, não precisa instalar nada — basta compartilhar o link com sua equipe. Com o Script Embed, basta colar uma única linha de código no HTML do seu site.',
  },
  {
    question: 'Os dados dos usuários ficam seguros?',
    answer: 'Sim. Campos sensíveis como senhas são automaticamente mascarados nas gravações. Além disso, todos os dados são armazenados de forma segura com criptografia em trânsito e em repouso.',
  },
  {
    question: 'Funciona com React, Next.js, Vue?',
    answer: 'Sim! O QBugs funciona com qualquer tecnologia web. O script embed é framework-agnóstico e o modo de link compartilhado funciona com qualquer URL acessível.',
  },
  {
    question: 'Quantos membros da equipe posso convidar?',
    answer: 'No plano gratuito, você pode convidar toda a sua equipe sem limites. Todos os membros podem enviar e visualizar reports no dashboard do projeto.',
  },
]

const viewerUrl = 'https://app.qbugs.com.br/p/seu-projeto-id'
const embedSnippet = '<script src="https://app.qbugs.com.br/embed.js"\n  data-project="SEU_PROJECT_ID">\n</script>'

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [typingAnim, setTypingAnim] = useState<object | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true)
    })
    fetch('/typing-animation.json')
      .then((r) => r.json())
      .then(setTypingAnim)
      .catch(() => {})
  }, [])

  const [demoTriggered, setDemoTriggered] = useState(false)

  const openDemoWidget = useCallback(() => {
    if (!demoTriggered) {
      // First click: show the floating trigger with animation
      document.dispatchEvent(new CustomEvent('feedbackview:show-trigger'))
      setDemoTriggered(true)
    } else {
      // Subsequent clicks: open the widget directly
      document.dispatchEvent(new CustomEvent('feedbackview:open'))
    }
  }, [demoTriggered])

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
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>QBugs</span>
        </Row>
        <Row gap="s" vertical="center">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button variant="primary" size="s" label="Painel" />
            </Link>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="tertiary" size="s" label="Entrar" />
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="s" label="Começar grátis" />
              </Link>
            </>
          )}
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
            Cada bug com screenshot, replay e logs. Automaticamente.
          </Heading>

          <Text
            variant="body-default-l"
            onBackground="neutral-weak"
            style={{ maxWidth: '36rem' }}
          >
            Sua equipe de QA reporta bugs com contexto técnico completo.
            Sem prints manuais, sem &ldquo;não consigo reproduzir&rdquo;.
          </Text>

          <Row gap="m" style={{ marginTop: '0.5rem' }}>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="primary" size="l" label="Acessar Painel" />
              </Link>
            ) : (
              <Link href="/auth/register">
                <Button variant="primary" size="l" label="Começar grátis" />
              </Link>
            )}
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

                {/* Mock report panel */}
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
                  <div style={{ fontWeight: 600, color: 'var(--neutral-on-background-strong)' }}>Reportar</div>
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
                    <span className="hero-tag"><Tag variant="warning" size="s" label="Médio" /></span>
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
                    Enviar Bug
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
              Cada report inclui contexto técnico completo, automaticamente.
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
                    <div style={{ color: 'var(--brand-on-background-strong)' }}>{featureIcons[feature.iconKey]}</div>
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

      {/* Demo section */}
      <Flex fillWidth horizontal="center" background="surface" id="demo">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="l" horizontal="center" style={{ textAlign: 'center' }}>
          <Tag variant="neutral" size="m" label="Demo ao vivo" />
          <Heading variant="display-strong-s" as="h2">
            Experimente agora mesmo
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '32rem' }}>
            Clique no botão abaixo para abrir o widget de report. Esta landing page funciona como demo: veja o screenshot, os logs e o formulário completo.
          </Text>
          <button
            onClick={openDemoWidget}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem 2rem',
              borderRadius: '1rem',
              border: '2px solid var(--brand-solid-strong)',
              background: 'var(--brand-alpha-weak)',
              color: 'var(--brand-on-background-strong)',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--brand-solid-strong)'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--brand-alpha-weak)'
              e.currentTarget.style.color = 'var(--brand-on-background-strong)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m8 2 1.88 1.88" /><path d="M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
              <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
              <path d="M12 20v-9" /><path d="M6.53 9C4.6 8.8 3 7.1 3 5" /><path d="M6 13H2" />
              <path d="M3 21c0-2.1 1.7-3.9 3.8-4" /><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
              <path d="M22 13h-4" /><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
            </svg>
            Abrir widget de report
          </button>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            O mesmo widget que seus usuários veem. Nenhum dado sera enviado nesta demo.
          </Text>
        </Column>
      </Flex>

      {/* How it works */}
      <Flex fillWidth horizontal="center" background="page" id="como-funciona">
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
      <Flex fillWidth horizontal="center" background="surface">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Integração" />
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
                    <Tag variant="brand" size="s" label="Sem instalação" />
                  </Column>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Compartilhe um link único com sua equipe de QA. Eles navegam pelo site normalmente e enviam reports com um clique.
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
                    <Tag variant="info" size="s" label="1 linha de código" />
                  </Column>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Adicione uma tag script no HTML do seu site. Um botão flutuante aparece para os usuários enviarem reports.
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

      {/* Platforms & Technologies */}
      <Flex fillWidth horizontal="center" background="page">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl" horizontal="center">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Multiplataforma" />
            <Heading variant="display-strong-s" as="h2">
              Funciona com qualquer stack
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '36rem' }}>
              O QBugs é compatível com todas as tecnologias web e mobile modernas. Basta adicionar uma linha de código e pronto.
            </Text>
          </Column>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 140px)', gap: '1.25rem', justifyContent: 'center' }}>
            {[
              { name: 'React', logo: '/logos/react.svg' },
              { name: 'Next.js', logo: '/logos/nextjs.svg' },
              { name: 'Vue.js', logo: '/logos/vue.svg' },
              { name: 'Angular', logo: '/logos/angular.svg' },
              { name: 'Svelte', logo: '/logos/svelte.svg' },
              { name: 'HTML/JS', logo: '/logos/html.svg' },
              { name: 'React Native', logo: '/logos/react-native.svg' },
              { name: 'Flutter', logo: '/logos/flutter.svg' },
            ].map((tech) => (
              <div key={tech.name} style={{ width: 140, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', borderRadius: '1rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)' }}>
                <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <img src={tech.logo} alt={tech.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--neutral-on-background-strong)' }}>{tech.name}</span>
              </div>
            ))}
          </div>

          <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textAlign: 'center' }}>
            Compatível com qualquer site ou app que rode no navegador. Sem dependências extras.
          </Text>
        </Column>
      </Flex>

      {/* Pricing */}
      <Flex fillWidth horizontal="center" background="page" id="planos">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl" horizontal="center">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Planos" />
            <Heading variant="display-strong-s" as="h2">
              Simples e transparente
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '32rem' }}>
              Comece grátis e escale conforme sua equipe cresce.
            </Text>
          </Column>

          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', width: '100%', maxWidth: '64rem' }}>
            {/* Free plan */}
            <div style={{ flex: '1 1 260px', maxWidth: '20rem', padding: '1.75rem', borderRadius: '1rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)' }}>
              <Column gap="m">
                <Column gap="xs">
                  <Text variant="label-default-s" onBackground="neutral-medium">Gratuito</Text>
                  <Row gap="xs" vertical="end">
                    <Heading variant="display-strong-s" as="span">R$ 0</Heading>
                    <Text variant="body-default-m" onBackground="neutral-medium" style={{ paddingBottom: '4px' }}>/mês</Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Para testar a plataforma e projetos pessoais.
                  </Text>
                </Column>

                <div style={{ height: '1px', background: 'var(--neutral-border-medium)' }} />

                <Column gap="s">
                  {[
                    '1 projeto',
                    '50 reports/mês',
                    'Screenshot automático',
                    'Console & network logs',
                    '1 membro',
                    'Retenção de 7 dias',
                  ].map((item) => (
                    <Row key={item} gap="s" vertical="center">
                      <Text variant="body-default-m" onBackground="brand-strong" style={{ flexShrink: 0 }}>✓</Text>
                      <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                    </Row>
                  ))}
                </Column>

                <a href="/auth/register" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                  <Button variant="secondary" size="l" label="Começar grátis" fillWidth />
                </a>
              </Column>
            </div>

            {/* Pro plan */}
            <div style={{ flex: '1 1 260px', maxWidth: '20rem', padding: '1.75rem', borderRadius: '1rem', border: '1px solid var(--brand-border-medium)', background: 'var(--surface-background)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--brand-solid-strong)' }} />
              <Column gap="m">
                <Column gap="xs">
                  <Row gap="s" vertical="center">
                    <Text variant="label-default-s" onBackground="neutral-medium">Pro</Text>
                    <Tag variant="brand" size="s" label="Popular" />
                  </Row>
                  <Row gap="xs" vertical="end">
                    <Heading variant="display-strong-s" as="span">R$ 49</Heading>
                    <Text variant="body-default-m" onBackground="neutral-medium" style={{ paddingBottom: '4px' }}>/mês</Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Para equipes que precisam de QA profissional.
                  </Text>
                </Column>

                <div style={{ height: '1px', background: 'var(--neutral-border-medium)' }} />

                <Column gap="s">
                  {[
                    '5 projetos',
                    'Reports ilimitados',
                    'Screenshot + replay de sessão',
                    'Console, network & custom logs',
                    'Até 10 membros',
                    'Retenção de 90 dias',
                    'Integrações (Slack, Jira)',
                    'Suporte por email',
                  ].map((item) => (
                    <Row key={item} gap="s" vertical="center">
                      <Text variant="body-default-m" onBackground="brand-strong" style={{ flexShrink: 0 }}>✓</Text>
                      <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                    </Row>
                  ))}
                </Column>

                <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--brand-solid-strong)', color: 'white', textAlign: 'center', fontWeight: 600, fontSize: '0.95rem', opacity: 0.6, cursor: 'not-allowed' }}>
                  Em breve
                </div>
              </Column>
            </div>

            {/* Business plan */}
            <div style={{ flex: '1 1 260px', maxWidth: '20rem', padding: '1.75rem', borderRadius: '1rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)' }}>
              <Column gap="m">
                <Column gap="xs">
                  <Text variant="label-default-s" onBackground="neutral-medium">Business</Text>
                  <Row gap="xs" vertical="end">
                    <Heading variant="display-strong-s" as="span">R$ 149</Heading>
                    <Text variant="body-default-m" onBackground="neutral-medium" style={{ paddingBottom: '4px' }}>/mês</Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Para softhouses e equipes grandes.
                  </Text>
                </Column>

                <div style={{ height: '1px', background: 'var(--neutral-border-medium)' }} />

                <Column gap="s">
                  {[
                    'Projetos ilimitados',
                    'Reports ilimitados',
                    'Replay + white-label',
                    'Todos os logs + API',
                    'Até 50 membros',
                    'Retenção de 1 ano',
                    'Slack, Jira, Linear, Webhook',
                    'Suporte prioritário',
                  ].map((item) => (
                    <Row key={item} gap="s" vertical="center">
                      <Text variant="body-default-m" onBackground="brand-strong" style={{ flexShrink: 0 }}>✓</Text>
                      <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                    </Row>
                  ))}
                </Column>

                <div style={{ marginTop: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--neutral-on-background-strong)', color: 'white', textAlign: 'center', fontWeight: 600, fontSize: '0.95rem', opacity: 0.6, cursor: 'not-allowed' }}>
                  Em breve
                </div>
              </Column>
            </div>
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
              Tudo que você precisa saber sobre o QBugs.
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
      <Flex fillWidth horizontal="center" background="surface">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="l" gap="m" horizontal="center" style={{ textAlign: 'center' }}>
          {typingAnim && (
            <div style={{ width: '100%', maxWidth: '16rem', margin: '0 auto' }}>
              <Lottie animationData={typingAnim} loop autoplay />
            </div>
          )}
          <Heading variant="display-strong-s" as="h2">
            Chega de &ldquo;não consigo reproduzir&rdquo;
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '28rem' }}>
            Comece grátis agora. Nenhum cartão necessário.
          </Text>
          <Row gap="m" style={{ marginTop: '0.5rem' }}>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button variant="primary" size="l" label="Acessar Painel" />
              </Link>
            ) : (
              <>
                <Link href="/auth/register">
                  <Button variant="primary" size="l" label="Criar conta grátis" />
                </Link>
                <Link href="/auth/login">
                  <Button variant="tertiary" size="l" label="Já tenho conta" />
                </Link>
              </>
            )}
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
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-weak)' }}>QBugs</span>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              &copy; {new Date().getFullYear()}
            </Text>
          </Row>
          <Row gap="m">
            <Link href="/termos">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>
                Termos
              </Text>
            </Link>
            <Link href="/privacidade">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>
                Privacidade
              </Text>
            </Link>
            <Link href="/contato">
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>
                Contato
              </Text>
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>
                  Painel
                </Text>
              </Link>
            ) : (
              <Link href="/auth/login">
                <Text variant="body-default-xs" onBackground="neutral-weak" style={{ textDecoration: 'none' }}>
                  Entrar
                </Text>
              </Link>
            )}
          </Row>
        </Row>
      </Flex>

      {/* Embed widget for demo */}
      <Script
        src="/embed.js?v=8"
        data-project="demo"
        data-hidden-trigger="true"
        strategy="afterInteractive"
      />
    </Column>
  )
}
