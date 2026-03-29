'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const Lottie = dynamic(() => import('lottie-react'), { ssr: false })
import { createClient } from '@/lib/supabase/client'
import { usePrices } from '@/hooks/usePrices'
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
  vitals: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  click: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9l5 12 1.8-5.2L21 14 9 9z"/><path d="M7.2 2.2L8 5.1"/><path d="M5.1 8l-2.9-.8"/><path d="M14 4.1L12 6"/><path d="M6 12l-1.9 2"/></svg>,
  globe: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  plug: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/></svg>,
  download: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
}

const features = [
  {
    iconKey: 'replay',
    title: 'Session Replay',
    description: 'Grave e reproduza a sessão completa do usuário. Veja exatamente o que aconteceu antes do bug.',
  },
  {
    iconKey: 'vitals',
    title: 'Core Web Vitals',
    description: 'LCP, CLS e INP em cada report. Saiba se o problema é de performance ou de código — sem abrir o Lighthouse.',
  },
  {
    iconKey: 'click',
    title: 'Rage & Dead Clicks',
    description: 'Detecta cliques de frustração e em elementos sem ação. Identifique problemas de UX automaticamente.',
  },
  {
    iconKey: 'logs',
    title: 'Console, Network & Screenshot',
    description: 'Logs de console, requisições de rede e screenshot automático — tudo capturado junto com cada report.',
  },
  {
    iconKey: 'globe',
    title: 'Contexto Completo',
    description: 'Device, rede, timezone, resolução, breadcrumb de cliques e mais. Senhas mascaradas automaticamente.',
  },
  {
    iconKey: 'bolt',
    title: 'Setup em 1 Minuto',
    description: 'Cole um script no HTML ou compartilhe um link. Sem SDK complexo. Dashboard completo para a equipe.',
  },
  {
    iconKey: 'plug',
    title: 'API, webhooks e ClickUp',
    description:
      'Nos planos Pro e Business com assinatura ativa: REST API com chaves, webhooks de saída para o seu backend e integração ClickUp com automações por projeto.',
  },
  {
    iconKey: 'download',
    title: 'Exportar reports filtrados',
    description:
      'Na área Reports, baixe em CSV ou Excel (.xlsx) exatamente o que está filtrado — ideal para análises e planilhas. Incluído nos planos Pro e Business com assinatura ativa.',
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
    description:
      'Screenshot, replay, logs, Web Vitals, rage clicks, breadcrumbs e contexto técnico completo. Com Pro ou Business, conecte API, webhooks, ClickUp e exporte reports filtrados.',
  },
]

const faqs = [
  {
    question: 'O Buug é gratuito?',
    answer:
      'Sim! O plano gratuito inclui 10 reports no total, sem cartão. Você usa widget, link compartilhado, dashboard e captura completa de QA. Integrações avançadas (API REST com chave, webhooks de saída e ClickUp) e a exportação filtrada para CSV ou Excel ficam nos planos Pro e Business com assinatura ativa.',
  },
  {
    question: 'Como funciona a captura de session replay?',
    answer: 'O Buug usa a biblioteca rrweb para gravar as interações do usuário em tempo real. Cada ação (clique, scroll, digitação) é capturada e pode ser reproduzida como um vídeo, permitindo que você veja exatamente o que aconteceu antes do bug.',
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
    answer: 'Sim! O Buug funciona com qualquer tecnologia web. O script embed é framework-agnóstico e o modo de link compartilhado funciona com qualquer URL acessível.',
  },
  {
    question: 'Quantos membros da equipe posso convidar?',
    answer: 'Todos os planos incluem membros ilimitados. Convide toda a sua equipe sem custo adicional. O plano gratuito inclui 10 reports no total, e os planos pagos têm limite mensal renovável.',
  },
  {
    question: 'O que é a API REST do Buug?',
    answer:
      'É uma API HTTPS autenticada por chave (Bearer) para listar projetos e reports e atualizar status e prazos a partir do seu sistema, CI ou ferramentas como n8n. A criação de chaves e o uso dos endpoints exigem plano Pro ou Business com assinatura ativa.',
  },
  {
    question: 'Como funcionam os webhooks?',
    answer:
      'Você cadastra uma URL e o Buug envia avisos JSON quando ocorrem eventos (por exemplo, novo report ou mudança de status), com assinatura HMAC para validação. Disponível nos planos Pro e Business com assinatura ativa.',
  },
  {
    question: 'A integração com ClickUp inclui o quê?',
    answer:
      'Conecte o workspace com token de API, crie automações por projeto Buug (lista/workspace no ClickUp) e sincronize criação de tarefas e status nos dois sentidos. Exige plano Pro ou Business com assinatura ativa.',
  },
  {
    question: 'Posso exportar os reports para planilha?',
    answer:
      'Sim. Na página Reports você pode exportar o conjunto filtrado (busca, projeto, tipo, status, responsável etc.) em CSV ou Excel (.xlsx). A exportação exige plano Pro ou Business com assinatura ativa, como as integrações avançadas.',
  },
]

const viewerUrl = 'https://buug.io/p/seu-projeto-id'
const embedSnippet = '<script src="https://buug.io/embed.js"\n  data-project="SEU_PROJECT_ID">\n</script>'

export default function LandingPage() {
  const { prices } = usePrices()
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

  const [heroStep, setHeroStep] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroStep(s => (s + 1) % 4)
    }, 6000)
    return () => clearInterval(timer)
  }, [heroStep])


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
        <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>Buug</span>
        <Row as="ul" gap="2" vertical="center" className="nav-links" style={{ listStyle: 'none', margin: 0, padding: 0, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {[
            { label: 'Demo', href: '#como-funciona' },
            { label: 'Planos', href: '#planos' },
            { label: 'Stack', href: '#integracoes-pro' },
            { label: 'FAQ', href: '#faq' },
          ].map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: 'var(--neutral-on-background-weak)',
                  textDecoration: 'none',
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  transition: 'color 0.15s, background 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--neutral-on-background-strong)'
                  e.currentTarget.style.background = 'var(--neutral-alpha-weak)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--neutral-on-background-weak)'
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
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

      {/* Hero — Main heading */}
      <Flex
        fillWidth
        horizontal="center"
        style={{
          background: 'linear-gradient(180deg, var(--surface-background) 0%, var(--page-background) 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Animated grid background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          <div style={{
            position: 'absolute', inset: 0,
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 30%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 30%, black 0%, transparent 70%)',
          }}>
            <div className="hero-dot-grid" style={{
              position: 'absolute', inset: '-50%',
              backgroundImage: 'linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }} />
          </div>
          <div className="hero-orb-1" style={{
            position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.06) 0%, transparent 70%)',
            top: '-10%', right: '-5%', filter: 'blur(60px)',
          }} />
          <div className="hero-orb-2" style={{
            position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 70%)',
            bottom: '5%', left: '-8%', filter: 'blur(60px)',
          }} />
        </div>

        <Column
          maxWidth={64}
          fillWidth
          paddingX="l"
          paddingY="xl"
          gap="l"
          horizontal="center"
          style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}
        >
          <Tag variant="brand" size="l" label="Plataforma de QA em tempo real" />

          <Heading
            variant="display-strong-l"
            as="h1"
            style={{ maxWidth: '48rem' }}
          >
            Bug reporting com Web Vitals, replay e rage clicks.
          </Heading>

          <Text
            variant="body-default-l"
            onBackground="neutral-weak"
            style={{ maxWidth: '36rem' }}
          >
            Core Web Vitals, rage clicks e session replay em cada report — e, nos planos Pro e Business, API REST, webhooks, ClickUp e exportação filtrada (CSV/Excel) para encaixar no seu fluxo. Setup em 1 minuto, sem SDK complexo.
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
        </Column>
      </Flex>

      {/* Metrics bar */}
      <Flex fillWidth horizontal="center" background="page" style={{ borderTop: '1px solid var(--neutral-border-medium)', borderBottom: '1px solid var(--neutral-border-medium)' }}>
        <Row maxWidth={64} fillWidth paddingX="l" paddingY="l" horizontal="center" gap="xl" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { value: '50.000+', label: 'Reports processados' },
            { value: '500+', label: 'Projetos ativos' },
            { value: '30+', label: 'Países' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center', minWidth: 120, flex: '1 1 120px', maxWidth: 180 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.03em', lineHeight: 1.1 }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--neutral-on-background-weak)', marginTop: 4, fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </Row>
      </Flex>

      {/* How it works — Clean split demo */}
      <Flex
        fillWidth
        horizontal="center"
        background="surface"
        id="como-funciona"
        style={{
          overflow: 'hidden',
          position: 'relative',
        }}
      >

        {/* Split layout */}
        {(() => {
          const heroLabels = ['Configurar', 'Widget', 'Report', 'Dashboard']
          const heroUrls = ['buug.io/projects/new', 'meusite.com.br', 'meusite.com.br', 'buug.io/projects/meu-ecommerce']
          const heroTitles = [
            'Configure seu projeto em segundos',
            'Widget aparece no seu site',
            'Usuário reporta com contexto completo',
            'Gerencie tudo no dashboard',
          ]
          const heroDescs = [
            'Cole a URL do seu site, escolha o modo de integração e pronto — o Buug está ativo.',
            'Um botão discreto aparece no canto do site. Replay, screenshot, Web Vitals e clicks são capturados automaticamente.',
            'O formulário já vem com replay, logs, rage clicks e contexto técnico. Zero atrito para o usuário.',
            'Reports com Web Vitals, breadcrumbs, device info, rede e mais — tudo organizado para resolver rápido.',
          ]
            const stepVisuals = [
              /* Step 0: Project config — Buug app-like UI */
              <div key="s0" style={{ background: '#fafbfc', height: 400 }}>
                {/* App header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #eef0f2', background: '#fff' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>Novo Projeto</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>Passo 1 de 2</span>
                </div>
                {/* Form body — centered card */}
                <div style={{ padding: '24px 36px', maxWidth: 440, margin: '0 auto' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 8, letterSpacing: '-0.01em' }}>URL do site</label>
                      <div style={{ padding: '11px 14px', border: '2px solid #111', borderRadius: 10, fontSize: 13, color: '#111', background: 'rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 0 3px rgba(0,0,0,0.04)' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                        <span>meusite.com.br</span>
                        <span className="hero-typing-cursor" style={{ width: 2, height: 16, background: '#111', marginLeft: -2 }} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 8, letterSpacing: '-0.01em' }}>Modo de integração</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1, padding: '10px 10px', borderRadius: 10, border: '2px solid #111', background: 'rgba(0,0,0,0.02)', textAlign: 'center' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" style={{ display: 'block', margin: '0 auto 4px' }}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>URL Compartilhada</div>
                          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>Sem instalação</div>
                        </div>
                        <div style={{ flex: 1, padding: '10px 10px', borderRadius: 10, border: '1px solid #e5e7eb', textAlign: 'center', background: '#fff' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ display: 'block', margin: '0 auto 4px' }}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                          <div style={{ fontSize: 11, fontWeight: 500, color: '#374151' }}>Script Embed</div>
                          <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2 }}>1 linha de código</div>
                        </div>
                      </div>
                    </div>
                    <button style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#111', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'default' }}>
                      Criar Projeto
                    </button>
                  </div>
                </div>
              </div>,

              /* Step 1: Widget on user's site — realistic site mock */
              <div key="s1" style={{ background: '#f8f9fa', height: 400, position: 'relative' }}>
                {/* Site nav mock */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #eef0f2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #374151, #111)' }} />
                    <div style={{ height: 9, width: 72, background: '#e5e7eb', borderRadius: 4 }} />
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
                    {['Home', 'Produtos', 'Pedidos'].map(t => (
                      <span key={t} style={{ fontSize: 11, color: t === 'Home' ? '#111' : '#9ca3af', fontWeight: t === 'Home' ? 600 : 400 }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ marginLeft: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: '#f3f4f6' }} />
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #e5e7eb, #d1d5db)', border: '2px solid #fff' }} />
                  </div>
                </div>
                {/* Dashboard content */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 2 }}>Dashboard</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Visão geral do seu e-commerce</div>
                    </div>
                    <div style={{ padding: '6px 12px', borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', fontSize: 10, color: '#374151', fontWeight: 500 }}>Últimos 30 dias</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    {[{ v: '2,847', l: 'Visitantes', icon: '↑ 12%', ic: '#059669' }, { v: '89%', l: 'Conversão', icon: '↑ 3%', ic: '#059669' }, { v: 'R$ 12.4k', l: 'Receita', icon: '↓ 2%', ic: '#dc2626' }].map((c, i) => (
                      <div key={i} style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #eef0f2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>{c.l}</span>
                          <span style={{ fontSize: 9, color: c.ic, fontWeight: 600 }}>{c.icon}</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>{c.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Chart placeholder */}
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eef0f2', padding: '16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#111', marginBottom: 12 }}>Vendas por dia</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48 }}>
                      {[35, 52, 40, 65, 48, 72, 58, 80, 62, 75, 55, 68].map((h, i) => (
                        <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: i === 7 ? '#111' : '#e5e7eb' }} />
                      ))}
                    </div>
                  </div>
                  {/* Table placeholder */}
                  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eef0f2', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
                      {['Produto', 'Vendas', 'Receita'].map(h => (
                        <span key={h} style={{ flex: 1, fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</span>
                      ))}
                    </div>
                    {[1, 2].map(r => (
                      <div key={r} style={{ display: 'flex', gap: 8, padding: '6px 16px', borderTop: '1px solid #f3f4f6' }}>
                        <div style={{ flex: 1, height: 7, background: '#f3f4f6', borderRadius: 3 }} />
                        <div style={{ flex: 1, height: 7, background: '#f3f4f6', borderRadius: 3 }} />
                        <div style={{ flex: 1, height: 7, background: '#f3f4f6', borderRadius: 3 }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Buug widget button */}
                <div className="demo-widget-pulse" style={{ position: 'absolute', bottom: 20, right: 20, padding: '10px 24px', background: '#111', color: '#fff', borderRadius: 24, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: 'none', fontFamily: 'var(--font-logo)', letterSpacing: '-0.01em' }}>
                  Buug report
                </div>
                {/* Animated cursor */}
                <div className="hero-cursor-click" style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10 }}>
                  <svg width="18" height="22" viewBox="0 0 24 28" fill="none">
                    <path d="M5 2L5 19.5L9.5 15.5L13.5 23L16.5 21.5L12.5 13.5L18 12.5L5 2Z" fill="#111" stroke="#fff" strokeWidth="1.5"/>
                  </svg>
                  <div className="hero-cursor-ripple" />
                </div>
              </div>,

              /* Step 2: Report popup over site background */
              <div key="s2" style={{ background: '#f8f9fa', height: 400, position: 'relative' }}>
                {/* Site background (dimmed) */}
                <div style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {/* Site nav mock */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', background: '#fff', borderBottom: '1px solid #eef0f2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
                      <div style={{ height: 9, width: 72, background: '#e5e7eb', borderRadius: 4 }} />
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
                      {['Home', 'Produtos', 'Pedidos'].map(t => (
                        <span key={t} style={{ fontSize: 11, color: t === 'Home' ? '#111' : '#9ca3af', fontWeight: t === 'Home' ? 600 : 400 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 6 }}>Dashboard</div>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      {[{ v: '2,847', l: 'Visitantes' }, { v: '89%', l: 'Conversão' }, { v: 'R$ 12.4k', l: 'Receita' }].map((c, i) => (
                        <div key={i} style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '14px 16px', border: '1px solid #eef0f2' }}>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>{c.l}</span>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 4 }}>{c.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eef0f2', padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 48 }}>
                        {[35, 52, 40, 65, 48, 72, 58, 80, 62, 75, 55, 68].map((h, i) => (
                          <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 3, background: i === 7 ? '#111' : '#e5e7eb' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Report popup overlay */}
                <div style={{ position: 'absolute', top: 16, right: 20, width: 300, background: '#fff', borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #eef0f2', overflow: 'hidden' }}>
                  {/* Popup header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #eef0f2' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>Reportar Bug</span>
                    <div style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </div>
                  </div>
                  {/* Popup content */}
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Session Replay mini */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#111', marginBottom: 4 }}>
                        <span className="hero-recording-dot" />
                        Session Replay
                      </div>
                      <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #1e293b', background: '#0f172a' }}>
                        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, position: 'relative' }}>
                          <div style={{ width: '85%', height: 28, background: '#1e293b', borderRadius: 3, display: 'flex', flexDirection: 'column', padding: 5, gap: 2 }}>
                            <div style={{ height: 2, width: '35%', background: '#334155', borderRadius: 2 }} />
                            <div style={{ height: 2, width: '60%', background: '#334155', borderRadius: 2 }} />
                            <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                              <div style={{ flex: 1, height: 8, background: '#334155', borderRadius: 2 }} />
                              <div style={{ flex: 1, height: 8, background: '#334155', borderRadius: 2 }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderTop: '1px solid #1e293b' }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="5" height="5" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                          <div style={{ flex: 1, height: 2, borderRadius: 2, background: '#334155' }}>
                            <div style={{ width: '65%', height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #111, #374151)' }} />
                          </div>
                          <span style={{ fontSize: 7, color: '#64748b', fontFamily: 'monospace' }}>00:21</span>
                        </div>
                      </div>
                    </div>
                    {/* Form fields */}
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#111', marginBottom: 3 }}>Título</label>
                      <div style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 10, color: '#111', background: '#fff' }}>Botão de pagamento não funciona</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#111', marginBottom: 3 }}>Descrição</label>
                      <div style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 9, color: '#374151', lineHeight: 1.4, background: '#fff' }}>Erro 500 ao finalizar compra</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#111', marginBottom: 3 }}>Tipo</label>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[{ l: 'Bug', a: true }, { l: 'Sugestão', a: false }].map(t => (
                            <div key={t.l} style={{ flex: 1, padding: '4px 3px', borderRadius: 5, fontSize: 9, border: t.a ? '2px solid #111' : '1px solid #e5e7eb', background: t.a ? 'rgba(0,0,0,0.04)' : '#fff', color: t.a ? '#111' : '#6b7280', fontWeight: t.a ? 600 : 500, textAlign: 'center' }}>{t.l}</div>
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#111', marginBottom: 3 }}>Prioridade</label>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[{ l: 'Alta', c: '#f97316', a: true }, { l: 'Baixa', a: false }].map(s => (
                            <div key={s.l} style={{ flex: 1, padding: '4px 3px', borderRadius: 5, fontSize: 9, border: s.a ? `2px solid ${s.c}` : '1px solid #e5e7eb', background: s.a ? `${s.c}12` : '#fff', color: s.a ? s.c : '#6b7280', fontWeight: s.a ? 600 : 500, textAlign: 'center' }}>{s.l}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button style={{ width: '100%', padding: '8px', borderRadius: 6, border: 'none', background: '#111', color: '#fff', fontWeight: 600, fontSize: 11, cursor: 'default' }}>
                      Enviar Report
                    </button>
                  </div>
                </div>
              </div>,

              /* Step 3: Dashboard — polished Buug app */
              <div key="s3" style={{ background: '#fff', display: 'flex', height: 400 }}>
                {/* Sidebar */}
                <div style={{ width: 44, background: '#fafbfc', borderRight: '1px solid #eef0f2', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4, flexShrink: 0 }}>
                  {[{ active: true, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                    { active: false, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                    { active: false, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }].map((n, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: 6, background: n.active ? '#f3f4f6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={n.active ? '#111' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon}/></svg>
                    </div>
                  ))}
                </div>
                {/* Main content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Top bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #eef0f2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>Projetos</span>
                      <span style={{ fontSize: 11, color: '#d1d5db' }}>/</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>Meu E-commerce</span>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 8, fontWeight: 600, color: '#374151' }}>LC</span>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #eef0f2', padding: '0 16px' }}>
                    {['Reports', 'Histórico', 'Config'].map((t, i) => (
                      <div key={t} style={{ padding: '6px 10px 8px', borderBottom: `2px solid ${i === 0 ? '#111' : 'transparent'}`, marginBottom: -1, fontSize: 11, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#111' : '#9ca3af' }}>{t}</div>
                    ))}
                  </div>
                  {/* Report list */}
                  <div style={{ margin: '8px 16px', border: '1px solid #eef0f2', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 48px 52px', gap: 6, padding: '6px 12px', background: '#fafbfc', borderBottom: '1px solid #eef0f2', fontSize: 8, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <span>Tipo</span><span>Descrição</span><span>Sever.</span><span>Status</span>
                    </div>
                    {[
                      { type: 'Bug', typeBg: '#fef2f2', typeC: '#dc2626', desc: 'Botão de pagamento não funciona', sev: 'Alta', sevBg: '#fef2f2', sevC: '#dc2626', st: 'Aberto', stBg: '#fefce8', stC: '#a16207' },
                      { type: 'Bug', typeBg: '#fef2f2', typeC: '#dc2626', desc: 'Imagem quebrada na página de produto', sev: 'Média', sevBg: '#fefce8', sevC: '#a16207', st: 'Aberto', stBg: '#fefce8', stC: '#a16207' },
                      { type: 'Bug', typeBg: '#fef2f2', typeC: '#dc2626', desc: 'Carrinho não atualiza quantidade', sev: 'Alta', sevBg: '#fef2f2', sevC: '#dc2626', st: 'Em prog.', stBg: '#dbeafe', stC: '#1d4ed8' },
                      { type: 'Sugestão', typeBg: '#ede9fe', typeC: '#7c3aed', desc: 'Adicionar modo escuro', sev: 'Baixa', sevBg: '#f3f4f6', sevC: '#6b7280', st: 'Resolvido', stBg: '#ecfdf5', stC: '#059669' },
                    ].map((r, i, arr) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 48px 52px', gap: 6, padding: '7px 12px', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', fontSize: 10, background: i === 0 ? 'rgba(0,0,0,0.02)' : 'transparent' }}>
                        <span style={{ padding: '2px 5px', borderRadius: 4, fontSize: 8, fontWeight: 600, background: r.typeBg, color: r.typeC, textAlign: 'center' }}>{r.type}</span>
                        <span style={{ color: '#374151', fontWeight: i === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</span>
                        <span style={{ padding: '2px 5px', borderRadius: 4, fontSize: 8, fontWeight: 600, background: r.sevBg, color: r.sevC, textAlign: 'center' }}>{r.sev}</span>
                        <span style={{ padding: '2px 5px', borderRadius: 4, fontSize: 8, fontWeight: 600, background: r.stBg, color: r.stC, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.st}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>,
            ]

          return (
            <div className="hero-split" style={{
              position: 'relative', zIndex: 1,
              width: '100%', maxWidth: 1200, margin: '0 auto',
              padding: '80px clamp(24px, 5vw, 64px) 64px',
              display: 'flex', gap: 56, alignItems: 'center',
            }}>
              {/* Left side — Text content using design system */}
              <Column className="hero-split-text" gap="l" style={{ flex: '0 0 380px' }}>
                <Tag variant="brand" size="l" label="Como funciona" />

                <Column key={`title-${heroStep}`} className="hero-step-visual" gap="s">
                  <Heading
                    variant="display-strong-m"
                    as="h2"
                  >
                    {heroTitles[heroStep]}
                  </Heading>
                  <Text
                    variant="body-default-l"
                    onBackground="neutral-weak"
                  >
                    {heroDescs[heroStep]}
                  </Text>
                </Column>

                {/* Step indicators */}
                <Row gap="xs" style={{ marginTop: 'var(--static-space-8)' }}>
                  {heroLabels.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroStep(i)}
                      style={{
                        padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: i === heroStep ? 'var(--brand-alpha-weak)' : 'transparent',
                        transition: 'all 0.3s ease',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      <span style={{
                        width: 20, height: 20, borderRadius: 6, fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: i === heroStep ? '#111' : 'var(--neutral-alpha-weak)',
                        color: i === heroStep ? '#fff' : 'var(--neutral-on-background-weak)',
                        transition: 'all 0.3s ease',
                      }}>{i + 1}</span>
                      <span className="hero-step-label" style={{
                        fontSize: 12, fontWeight: i === heroStep ? 600 : 400,
                        color: i === heroStep ? 'var(--neutral-on-background-strong)' : 'var(--neutral-on-background-weak)',
                        transition: 'all 0.3s ease',
                      }}>{label}</span>
                    </button>
                  ))}
                </Row>
              </Column>

              {/* Right side — Browser mockup */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: '1px solid var(--neutral-border-medium)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
                  background: '#fff',
                }}>
                  {/* macOS chrome — light */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 16px',
                    background: '#f8f9fa',
                    borderBottom: '1px solid var(--neutral-border-medium)',
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                    </div>
                    <div style={{
                      flex: 1, padding: '5px 14px',
                      background: '#fff',
                      borderRadius: 7,
                      border: '1px solid var(--neutral-border-medium)',
                      fontSize: 12, fontFamily: 'monospace',
                      color: 'var(--neutral-on-background-weak)',
                      transition: 'all 0.3s ease',
                    }}>
                      {heroUrls[heroStep]}
                    </div>
                    {heroStep >= 1 && heroStep <= 2 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className="hero-recording-dot" />
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#22c55e' }}>REC</span>
                      </div>
                    )}
                  </div>

                  {/* Screen content */}
                  <div style={{ position: 'relative', height: 400, overflow: 'hidden' }}>
                    <div key={heroStep} className="hero-step-visual">
                      {stepVisuals[heroStep]}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </Flex>

      {/* Features */}
      <Flex fillWidth horizontal="center" background="page" id="funcionalidades">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Funcionalidades" />
            <Heading variant="display-strong-s" as="h2">
              Tudo que sua equipe precisa para QA
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '34rem' }}>
              De screenshot a Core Web Vitals — cada report inclui o contexto técnico completo. Com Pro ou Business você ainda leva API, webhooks, ClickUp e exportação dos reports filtrados.
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
      <Flex fillWidth horizontal="center" background="surface" id="integracao">
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
                <Row gap="4" style={{ flexWrap: 'wrap' }}>
                  <Tag variant="success" size="s" label="✓ Screenshot" />
                  <Tag variant="success" size="s" label="✓ Console Logs" />
                  <Tag variant="success" size="s" label="✓ Network Logs" />
                  <Tag variant="danger" size="s" label="✗ Session Replay" />
                </Row>
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
                <Row gap="4" style={{ flexWrap: 'wrap' }}>
                  <Tag variant="success" size="s" label="✓ Screenshot" />
                  <Tag variant="success" size="s" label="✓ Console Logs" />
                  <Tag variant="success" size="s" label="✓ Network Logs" />
                  <Tag variant="success" size="s" label="✓ Session Replay" />
                </Row>
              </Column>
            </Card>
          </div>
        </Column>
      </Flex>

      {/* Pro/Business integrations */}
      <Flex fillWidth horizontal="center" background="page" id="integracoes-pro">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="brand" size="m" label="Pro e Business" />
            <Heading variant="display-strong-s" as="h2">
              Integrações para o seu stack
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '36rem' }}>
              Ligue o Buug ao resto da empresa: automação, ERP, quadros, pipelines e exportação dos reports filtrados. Incluído nos planos pagos com assinatura ativa (não disponível no gratuito).
            </Text>
          </Column>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            width: '100%',
          }}>
            <Card padding="l" radius="l" fillWidth>
              <Column gap="m">
                <Row gap="s" vertical="center">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--brand-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Icon name="code" size="s" onBackground="brand-strong" />
                  </div>
                  <Heading variant="heading-strong-s" style={{ margin: 0 }}>API REST</Heading>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Chaves de acesso, documentação em app e endpoints para ler reports e projetos e atualizar status e datas. Ideal para scripts internos e orquestradores.
                </Text>
                <Row gap="xs" wrap>
                  <Tag variant="neutral" size="s" label="Bearer token" />
                  <Tag variant="neutral" size="s" label="Rate limit" />
                </Row>
              </Column>
            </Card>

            <Card padding="l" radius="l" fillWidth>
              <Column gap="m">
                <Row gap="s" vertical="center">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--brand-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-on-background-strong)',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <Heading variant="heading-strong-s" style={{ margin: 0 }}>Webhooks de saída</Heading>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Receba POST em JSON quando houver novo report, mudança de status, atribuição e mais. Valide com assinatura <code style={{ fontSize: '0.8em' }}>X-Buug-Signature</code>.
                </Text>
                <Row gap="xs" wrap>
                  <Tag variant="neutral" size="s" label="HTTPS" />
                  <Tag variant="neutral" size="s" label="HMAC" />
                </Row>
              </Column>
            </Card>

            <Card padding="l" radius="l" fillWidth>
              <Column gap="m">
                <Row gap="s" vertical="center">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--brand-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img src="/integrations/clickup.svg" alt="" width={28} height={28} />
                  </div>
                  <Heading variant="heading-strong-s" style={{ margin: 0 }}>ClickUp</Heading>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Tarefas criadas a partir de reports, mapa de status Buug ↔ ClickUp e automações por projeto (workspace, espaço, lista). Sincronização quando a assinatura está ativa.
                </Text>
                <Row gap="xs" wrap>
                  <Tag variant="neutral" size="s" label="Automações" />
                  <Tag variant="neutral" size="s" label="Webhook inbound" />
                </Row>
              </Column>
            </Card>

            <Card padding="l" radius="l" fillWidth>
              <Column gap="m">
                <Row gap="s" vertical="center">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--brand-alpha-weak)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-on-background-strong)',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <Heading variant="heading-strong-s" style={{ margin: 0 }}>Exportar filtrado</Heading>
                </Row>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Na página Reports, exporte o que está visível após filtros e busca para CSV ou Excel (.xlsx). Útil para auditorias, retrospectivas e planilhas — com assinatura Pro ou Business ativa.
                </Text>
                <Row gap="xs" wrap>
                  <Tag variant="neutral" size="s" label="CSV" />
                  <Tag variant="neutral" size="s" label="XLSX" />
                </Row>
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
              O Buug é compatível com todas as tecnologias web e mobile modernas. Basta adicionar uma linha de código e pronto.
            </Text>
          </Column>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', justifyContent: 'center' }}>
            {[
              { name: 'React', logo: '/logos/react.svg' },
              { name: 'Next.js', logo: '/logos/nextjs.svg' },
              { name: 'Vue.js', logo: '/logos/vue.svg' },
              { name: 'Angular', logo: '/logos/angular.svg' },
              { name: 'Svelte', logo: '/logos/svelte.svg' },
              { name: 'HTML/JS', logo: '/logos/html.svg' },
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

      {/* Why Buug — Competitor Comparison */}
      <Flex fillWidth horizontal="center" background="surface">
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl" horizontal="center">
          <Column horizontal="center" gap="s" style={{ textAlign: 'center' }}>
            <Tag variant="neutral" size="m" label="Comparativo" />
            <Heading variant="display-strong-s" as="h2">
              O que só o Buug entrega
            </Heading>
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '32rem' }}>
              Ferramentas tradicionais capturam screenshot e replay. O Buug vai além.
            </Text>
          </Column>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 500 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 13 }}>Funcionalidade</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '2px solid #111', fontWeight: 700, color: '#111', fontSize: 13, background: '#f9fafb', borderRadius: '8px 8px 0 0' }}>Buug</th>
                  <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: 500, fontSize: 13 }}>Concorrentes</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Screenshot automático', buug: true, others: true },
                  { feature: 'Session Replay', buug: true, others: true },
                  { feature: 'Console & Network Logs', buug: true, others: true },
                  { feature: 'Core Web Vitals (LCP, CLS, INP)', buug: true, others: false },
                  { feature: 'Rage & Dead Clicks', buug: true, others: false },
                  { feature: 'Click Breadcrumbs', buug: true, others: false },
                  { feature: 'Device + Rede + Geo', buug: true, others: false },
                  { feature: 'Link compartilhado (sem instalar)', buug: true, others: false },
                  { feature: 'API REST + webhooks + ClickUp (planos pagos)', buug: true, others: false },
                  { feature: 'Português nativo', buug: true, others: false },
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', color: '#374151', fontWeight: 500 }}>{row.feature}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', textAlign: 'center', background: '#f9fafb' }}>
                      {row.buug ? <span style={{ color: '#059669', fontSize: 18 }}>&#10003;</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                      {row.others ? <span style={{ color: '#059669', fontSize: 18 }}>&#10003;</span> : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '34rem' }}>
              Comece grátis e, quando precisar, ative Pro ou Business para API, webhooks, integração ClickUp e exportação filtrada (CSV/Excel) com assinatura ativa.
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
                    '10 reports (total)',
                    'Projetos ilimitados',
                    'Membros ilimitados',
                    'Screenshot + replay de sessão',
                    'Console & network logs',
                    'Sem API REST, webhooks, ClickUp e exportação CSV/Excel',
                    'Retenção de 7 dias',
                    'Suporte por email',
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
                    <Heading variant="display-strong-s" as="span">{prices.PRO.monthlyFormatted}</Heading>
                    <Text variant="body-default-m" onBackground="neutral-medium" style={{ paddingBottom: '4px' }}>/mês</Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Para equipes que precisam de QA profissional.
                  </Text>
                </Column>

                <div style={{ height: '1px', background: 'var(--neutral-border-medium)' }} />

                <Column gap="s">
                  {[
                    '2.000 reports/mês',
                    'Projetos ilimitados',
                    'Membros ilimitados',
                    'Exportar reports filtrados — CSV ou Excel (assinatura ativa)',
                    'API REST, webhooks e ClickUp (assinatura ativa)',
                    'Screenshot + replay de sessão',
                    'Console, network & custom logs',
                    'Retenção de 90 dias',
                    'Suporte por email',
                  ].map((item) => (
                    <Row key={item} gap="s" vertical="center">
                      <Text variant="body-default-m" onBackground="brand-strong" style={{ flexShrink: 0 }}>✓</Text>
                      <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                    </Row>
                  ))}
                </Column>

                <a href={isLoggedIn ? '/plans' : '/auth/register'} style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                  <Button variant="primary" size="l" label="Fazer upgrade" fillWidth />
                </a>
              </Column>
            </div>

            {/* Business plan */}
            <div style={{ flex: '1 1 260px', maxWidth: '20rem', padding: '1.75rem', borderRadius: '1rem', border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)' }}>
              <Column gap="m">
                <Column gap="xs">
                  <Text variant="label-default-s" onBackground="neutral-medium">Business</Text>
                  <Row gap="xs" vertical="end">
                    <Heading variant="display-strong-s" as="span">{prices.BUSINESS.monthlyFormatted}</Heading>
                    <Text variant="body-default-m" onBackground="neutral-medium" style={{ paddingBottom: '4px' }}>/mês</Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    Para softhouses e equipes grandes.
                  </Text>
                </Column>

                <div style={{ height: '1px', background: 'var(--neutral-border-medium)' }} />

                <Column gap="s">
                  {[
                    '10.000 reports/mês',
                    'Projetos ilimitados',
                    'Membros ilimitados',
                    'Exportar reports filtrados — CSV ou Excel (assinatura ativa)',
                    'API REST, webhooks e ClickUp (assinatura ativa)',
                    'Screenshot + replay de sessão',
                    'Console, network & custom logs',
                    'Retenção de 1 ano',
                    'Suporte prioritário',
                  ].map((item) => (
                    <Row key={item} gap="s" vertical="center">
                      <Text variant="body-default-m" onBackground="brand-strong" style={{ flexShrink: 0 }}>✓</Text>
                      <Text variant="body-default-m" onBackground="neutral-strong">{item}</Text>
                    </Row>
                  ))}
                </Column>

                <a href={isLoggedIn ? '/plans' : '/auth/register'} style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                  <Button variant="secondary" size="l" label="Fazer upgrade" fillWidth />
                </a>
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
              Tudo que você precisa saber sobre o Buug.
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
                    maxHeight: openFaq === index ? '480px' : '0',
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
            <div style={{ width: '100%', maxWidth: '28rem', margin: '0 auto' }}>
              <Lottie animationData={typingAnim} loop autoplay />
            </div>
          )}
          <Heading variant="display-strong-s" as="h2">
            Chega de &ldquo;não consigo reproduzir&rdquo;
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '30rem' }}>
            Comece grátis agora — nenhum cartão. Quando fizer sentido, suba para Pro ou Business e desbloqueie API, webhooks, ClickUp e exportação filtrada dos reports.
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
          {/* Trust badges */}
          <Row gap="l" style={{ marginTop: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, text: 'Sem cartão de crédito' },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, text: 'Setup em 2 minutos' },
              { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, text: 'Cancele a qualquer momento' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--neutral-on-background-weak)', fontSize: 13 }}>
                {b.icon}
                <span>{b.text}</span>
              </div>
            ))}
          </Row>
          {/* Avatars row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{ display: 'flex' }}>
              {['#111', '#6366f1', '#059669', '#d97706', '#dc2626'].map((c, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i > 0 ? -8 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                  {['L', 'A', 'P', 'M', 'J'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--neutral-on-background-weak)' }}>Junte-se a +500 equipes</span>
          </div>
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
        <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
          {/* Footer grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 32, width: '100%' }}>
            {/* Brand column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: '#111' }}>Buug</span>
              <Text variant="body-default-xs" onBackground="neutral-weak" style={{ lineHeight: 1.6 }}>
                Plataforma de QA em tempo real: replay, Web Vitals e recursos Pro/Business (API, webhooks, ClickUp, exportação CSV/Excel).
              </Text>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {/* LinkedIn */}
                <a href="https://www.linkedin.com/company/buug/about" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neutral-on-background-weak)' }} aria-label="LinkedIn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                {/* Instagram */}
                <a href="https://instagram.com/buug.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neutral-on-background-weak)' }} aria-label="Instagram">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>
            </div>

            {/* Produto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Produto</span>
              {[
                { label: 'Funcionalidades', href: '#funcionalidades' },
                { label: 'Widget e link', href: '#integracao' },
                { label: 'API, export e ClickUp', href: '#integracoes-pro' },
                { label: 'Planos', href: '#planos' },
                { label: 'FAQ', href: '#faq' },
                { label: 'Demo', href: '#como-funciona' },
              ].map(link => (
                <a key={link.label} href={link.href} style={{ fontSize: 13, color: 'var(--neutral-on-background-weak)', textDecoration: 'none' }}>{link.label}</a>
              ))}
            </div>

            {/* Empresa */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Empresa</span>
              {[
                { label: 'Sobre', href: '#' },
                { label: 'Blog', href: '#' },
                { label: 'Contato', href: '/contato' },
                { label: 'Carreiras', href: '#' },
              ].map(link => (
                <a key={link.label} href={link.href} style={{ fontSize: 13, color: 'var(--neutral-on-background-weak)', textDecoration: 'none' }}>{link.label}</a>
              ))}
            </div>

            {/* Legal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>Legal</span>
              {[
                { label: 'Termos de Uso', href: '/termos' },
                { label: 'Privacidade', href: '/privacidade' },
                { label: 'Segurança', href: '#' },
                { label: 'Status', href: '#' },
              ].map(link => (
                <a key={link.label} href={link.href} style={{ fontSize: 13, color: 'var(--neutral-on-background-weak)', textDecoration: 'none' }}>{link.label}</a>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid var(--neutral-border-medium)', paddingTop: 20, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              &copy; {new Date().getFullYear()} Buug. Todos os direitos reservados.
            </Text>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {[
                { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>, text: 'LGPD' },
                { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, text: 'SSL' },
                { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>, text: 'Dados criptografados' },
              ].map((badge, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--neutral-on-background-weak)', fontSize: 11 }}>
                  {badge.icon}
                  <span>{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </Column>
      </Flex>

    </Column>
  )
}
