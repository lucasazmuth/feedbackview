'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { IoMdClose } from 'react-icons/io'

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
    question: 'O Buug é gratuito?',
    answer: 'Sim! Oferecemos um plano gratuito com 10 reports incluídos, sem necessidade de cartão de crédito. Você pode criar projetos, convidar membros e usar todas as funcionalidades principais.',
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
]

const viewerUrl = 'https://buug.io/p/seu-projeto-id'
const embedSnippet = '<script src="https://buug.io/embed.js"\n  data-project="SEU_PROJECT_ID">\n</script>'

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

  const [demoOpen, setDemoOpen] = useState(false)
  const [demoStep, setDemoStep] = useState(0)

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
          <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-strong)' }}>Buug</span>
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
              background: '#f8f9fa',
              width: '100%',
              position: 'relative',
            }}>
              {/* Browser chrome */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '10px 16px',
                background: '#1a1a2e',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                </div>
                <div style={{
                  flex: 1,
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontFamily: 'monospace',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  app.seusite.com.br
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="hero-recording-dot" />
                  <Tag variant="success" size="s" label="Capturando" />
                </div>
              </div>

              {/* Site content with widget panel sliding in */}
              <div style={{ display: 'flex', minHeight: 520, position: 'relative' }}>
                {/* Mock page — dimmed behind overlay */}
                <div style={{ flex: 1, background: '#fff', position: 'relative', overflow: 'hidden', display: 'flex' }}>
                  {/* Mini sidebar */}
                  <div style={{ width: 44, background: '#fafafa', borderRight: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 6, flexShrink: 0 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                      <span style={{ color: '#fff', fontSize: 7, fontWeight: 800 }}>RB</span>
                    </div>
                    {[1,2,3,4].map(n => <div key={n} style={{ width: 16, height: 16, borderRadius: 4, background: n === 1 ? '#ede9fe' : '#f3f4f6' }} />)}
                    <div style={{ flex: 1 }} />
                    <div style={{ width: 16, height: 16, borderRadius: 4, background: '#f3f4f6' }} />
                  </div>
                  <div style={{ flex: 1, padding: '16px 20px' }}>
                    {/* Top nav */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>Projetos</span>
                        <span style={{ fontSize: 10, color: '#d1d5db' }}>/</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#111' }}>Meu E-commerce</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div style={{ padding: '2px 6px', borderRadius: 4, background: '#ede9fe', fontSize: 8, fontWeight: 600, color: '#4f46e5' }}>PRO</div>
                        <div style={{ width: 22, height: 22, borderRadius: 11, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>LC</span>
                        </div>
                      </div>
                    </div>
                    {/* Project title + stats */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Meu E-commerce</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 999, background: '#ecfdf5', fontSize: 8, fontWeight: 600, color: '#059669' }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />Ativo
                          </span>
                        </div>
                        <span style={{ fontSize: 9, color: '#9ca3af', fontFamily: 'monospace' }}>meusite.com.br</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {[{ n: '15', l: 'Total', c: '#111' }, { n: '3', l: 'Abertos', c: '#d97706' }, { n: '12', l: 'Resolvidos', c: '#059669' }].map(s => (
                          <div key={s.l} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: s.c }}>{s.n}</div>
                            <div style={{ fontSize: 7, color: '#9ca3af', textTransform: 'uppercase' }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #f3f4f6', marginBottom: 12 }}>
                      {['Reports', 'Histórico', 'Config'].map((t, i) => (
                        <div key={t} style={{ padding: '5px 10px 7px', borderBottom: `2px solid ${i === 0 ? '#4f46e5' : 'transparent'}`, marginBottom: -2, fontSize: 10, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#4f46e5' : '#9ca3af' }}>{t}</div>
                      ))}
                    </div>
                    {/* List rows */}
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', padding: '5px 8px', background: '#fafafa', borderBottom: '1px solid #e5e7eb', fontSize: 7, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', gap: 4 }}>
                        <span style={{ width: 36 }}>Tipo</span><span style={{ flex: 1 }}>Descrição</span><span style={{ width: 36 }}>Status</span>
                      </div>
                      {[
                        { type: 'Bug', desc: 'Botão de pagamento não funciona', st: 'Aberto', stBg: '#fefce8', stC: '#a16207' },
                        { type: 'Bug', desc: 'Imagem quebrada na página', st: 'Aberto', stBg: '#fefce8', stC: '#a16207' },
                        { type: 'Bug', desc: 'Carrinho não atualiza', st: 'Em prog.', stBg: '#dbeafe', stC: '#1d4ed8' },
                        { type: 'Sugestão', desc: 'Adicionar modo escuro', st: 'Resolvido', stBg: '#ecfdf5', stC: '#059669' },
                      ].map((r, i, arr) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '5px 8px', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none', gap: 4, fontSize: 9 }}>
                          <span style={{ padding: '1px 4px', borderRadius: 3, fontSize: 7, fontWeight: 600, background: r.type === 'Bug' ? '#fef2f2' : '#dbeafe', color: r.type === 'Bug' ? '#dc2626' : '#1d4ed8', width: 36, textAlign: 'center' }}>{r.type}</span>
                          <span style={{ flex: 1, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</span>
                          <span style={{ padding: '1px 4px', borderRadius: 3, fontSize: 7, fontWeight: 600, background: r.stBg, color: r.stC, width: 36, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Floating widget button */}
                  <div className="demo-widget-pulse" style={{ position: 'absolute', bottom: 14, right: 14, padding: '8px 18px', background: '#4f46e5', color: '#fff', borderRadius: 20, fontWeight: 700, fontSize: 11, boxShadow: '0 4px 16px rgba(79,70,229,0.35)', border: 'none', zIndex: 1, fontFamily: 'var(--font-logo)', letterSpacing: '-0.01em' }}>
                    Reportar Bug
                  </div>
                  {/* Dark overlay — animated */}
                  <div className="demo-hero-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
                  {/* Animated cursor */}
                  <svg className="hero-cursor" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', zIndex: 2 }}>
                    <path d="M5 3l14 8-6 2-4 6-4-16z" fill="var(--brand-solid-strong)" stroke="#fff" strokeWidth="1.5" />
                  </svg>
                </div>

                {/* Widget panel — exact replica of real embed, slides in as overlay */}
                <div className="demo-bg-site demo-hero-panel" style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 320,
                  background: '#fff',
                  borderLeft: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
                  zIndex: 3,
                }}>
                  {/* Panel header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Reportar</span>
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </div>
                  </div>

                  {/* Session Replay */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                      Session Replay
                      <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af' }}>(gravação automática)</span>
                    </div>
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #1e293b', background: '#0f172a' }}>
                      <div style={{ minHeight: 65, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, position: 'relative' }}>
                        <div style={{ width: '85%', height: 44, background: '#1e293b', borderRadius: 3, display: 'flex', flexDirection: 'column', padding: 6, gap: 3 }}>
                          <div style={{ height: 3, width: '40%', background: '#334155', borderRadius: 2 }} />
                          <div style={{ height: 3, width: '65%', background: '#334155', borderRadius: 2 }} />
                          <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                            <div style={{ flex: 1, height: 12, background: '#334155', borderRadius: 2 }} />
                            <div style={{ flex: 1, height: 12, background: '#334155', borderRadius: 2 }} />
                            <div style={{ flex: 1, height: 12, background: '#334155', borderRadius: 2 }} />
                          </div>
                        </div>
                        {/* Cursor in replay */}
                        <div style={{ position: 'absolute', top: '48%', left: '55%', width: 8, height: 8, borderRadius: '50%', background: 'rgba(73,80,246,0.5)', border: '1.5px solid rgba(73,80,246,0.8)' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderTop: '1px solid #1e293b' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </div>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#334155' }}>
                          <div style={{ width: '60%', height: '100%', borderRadius: 2, background: '#4f46e5' }} />
                        </div>
                        <span style={{ fontSize: 8, color: '#64748b', fontFamily: 'monospace' }}>00:21 / 00:32</span>
                      </div>
                    </div>
                  </div>

                  {/* Form fields */}
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    {/* Title */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Título</label>
                      <div style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 11, color: '#111827' }}>Botão de pagamento não funciona</div>
                    </div>
                    {/* Description */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Descrição <span style={{ color: '#ef4444' }}>*</span></label>
                      <div style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 10, color: '#374151', lineHeight: 1.5, minHeight: 36 }}>Ao clicar em &quot;Finalizar compra&quot;, o botão fica carregando e retorna erro 500.</div>
                    </div>
                    {/* Type segmented buttons with icons */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Tipo</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[
                          { label: 'Bug', active: true, icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/></svg> },
                          { label: 'Sugestão', active: false, icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> },
                          { label: 'Dúvida', active: false, icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg> },
                          { label: 'Elogio', active: false, icon: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></svg> },
                        ].map(t => (
                          <div key={t.label} style={{ flex: 1, padding: '5px 2px', borderRadius: 7, fontSize: 9, border: t.active ? '2px solid #4f46e5' : '1px solid #d1d5db', background: t.active ? 'rgba(79,70,229,0.05)' : '#fff', color: t.active ? '#4f46e5' : '#374151', fontWeight: t.active ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            {t.icon} {t.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Priority segmented buttons */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Prioridade</label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[
                          { label: 'Baixa', color: '#22c55e', active: false },
                          { label: 'Média', color: '#f59e0b', active: false },
                          { label: 'Alta', color: '#f97316', active: true },
                          { label: 'Crítica', color: '#ef4444', active: false },
                        ].map(s => (
                          <div key={s.label} style={{ flex: 1, padding: '5px 2px', borderRadius: 7, fontSize: 9, border: s.active ? `2px solid ${s.color}` : '1px solid #d1d5db', background: s.active ? `${s.color}15` : '#fff', color: s.active ? s.color : '#374151', fontWeight: s.active ? 600 : 400, textAlign: 'center' }}>
                            {s.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Passos para reproduzir */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Passos para reproduzir</label>
                      <div style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 10, color: '#374151', lineHeight: 1.5, minHeight: 40 }}>
                        1. Abra a página de checkout{'\n'}2. Clique em &quot;Finalizar compra&quot;{'\n'}3. Observe o erro
                      </div>
                    </div>
                    {/* Resultado esperado / Resultado real */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Resultado esperado</label>
                        <div style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 10, color: '#374151', lineHeight: 1.5, minHeight: 32 }}>Pagamento processado com sucesso</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Resultado real</label>
                        <div style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 10, color: '#374151', lineHeight: 1.5, minHeight: 32 }}>Erro 500 e botão trava</div>
                      </div>
                    </div>
                    {/* Anexos */}
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Anexos</label>
                      <div style={{ padding: '10px', border: '1.5px dashed #d1d5db', borderRadius: 7, textAlign: 'center', color: '#9ca3af', fontSize: 9, lineHeight: 1.5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 2px' }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Arraste ou clique para anexar
                      </div>
                    </div>
                    {/* Submit */}
                    <button style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginTop: 'auto' }}>
                      Enviar Bug
                    </button>
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
            Veja como funciona
          </Heading>
          <Text variant="body-default-m" onBackground="neutral-weak" style={{ maxWidth: '32rem' }}>
            Explore cada etapa do widget de report: do botão flutuante até o envio completo com screenshot, replay e logs.
          </Text>
          <button
            onClick={() => { setDemoStep(0); setDemoOpen(true) }}
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
            Ver demo interativa
          </button>
        </Column>
      </Flex>

      {/* Demo Modal — replica exacta da UI real do produto */}
      {demoOpen && (() => {
        const S = {
          browser: { background: '#1a1a2e', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties,
          browserBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#12121f', borderBottom: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
          dot: (c: string) => ({ width: 8, height: 8, borderRadius: '50%', background: c }) as React.CSSProperties,
          urlBar: { flex: 1, marginLeft: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' } as React.CSSProperties,
          pageBg: { background: '#fff', padding: '20px', minHeight: 280, position: 'relative' } as React.CSSProperties,
          skeletonLine: (w: string) => ({ height: 8, borderRadius: 4, background: '#e5e7eb', width: w, marginBottom: 6 }) as React.CSSProperties,
          skeletonBlock: { height: 40, borderRadius: 8, background: '#f3f4f6', marginBottom: 10 } as React.CSSProperties,
          widgetBtn: { position: 'absolute', bottom: 16, right: 16, padding: '10px 22px', background: '#4f46e5', color: '#fff', borderRadius: 24, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px rgba(79,70,229,0.35)', letterSpacing: '-0.01em', border: 'none' } as React.CSSProperties,
          panel: { background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e5e7eb', overflow: 'hidden' } as React.CSSProperties,
          panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' } as React.CSSProperties,
          input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#111', background: '#fafafa', outline: 'none' } as React.CSSProperties,
          textarea: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, color: '#374151', background: '#fafafa', minHeight: 60, resize: 'none' as const, outline: 'none', fontFamily: 'inherit' } as React.CSSProperties,
          pill: (active: boolean, color?: string) => ({ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? (color || '#4f46e5') : '#f3f4f6', color: active ? '#fff' : '#6b7280', transition: 'all 0.15s' }) as React.CSSProperties,
          submitBtn: { width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' } as React.CSSProperties,
          tag: (bg: string, color: string) => ({ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color, display: 'inline-block' }) as React.CSSProperties,
          logRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', background: '#fafafa', borderLeft: '3px solid transparent' } as React.CSSProperties,
        }

        const demoSteps = [
          {
            title: 'Widget aparece no seu site',
            description: 'Um botão flutuante é adicionado automaticamente. Basta uma linha de código.',
            visual: (
              <div style={S.browser}>
                <div style={S.browserBar}>
                  <div style={S.dot('#ff5f57')} /><div style={S.dot('#febc2e')} /><div style={S.dot('#28c840')} />
                  <div style={S.urlBar}>app.seusite.com.br/dashboard</div>
                </div>
                <div style={S.pageBg}>
                  {/* Fake page content */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: '#4f46e5' }} />
                      <div style={S.skeletonLine('80px')} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ ...S.skeletonLine('50px'), background: '#e5e7eb', borderRadius: 6, height: 28, marginBottom: 0 }} />
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    {[1,2,3].map(n => (
                      <div key={n} style={{ flex: 1, background: '#f9fafb', borderRadius: 10, padding: 14, border: '1px solid #f3f4f6' }}>
                        <div style={S.skeletonLine('60%')} />
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#111', marginTop: 4 }}>{n === 1 ? '2,847' : n === 2 ? '89%' : '$12.4k'}</div>
                        <div style={{ ...S.skeletonLine('80%'), marginTop: 6 }} />
                      </div>
                    ))}
                  </div>
                  <div style={S.skeletonBlock} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ ...S.skeletonBlock, flex: 2 }} />
                    <div style={{ ...S.skeletonBlock, flex: 1 }} />
                  </div>
                  {/* Widget button */}
                  <div className="demo-widget-pulse" style={S.widgetBtn}>
                    <span style={{ fontFamily: 'var(--font-logo)' }}>Reportar Bug</span>
                  </div>
                  {/* Cursor animation hint */}
                  <div style={{ position: 'absolute', bottom: 42, right: 48, fontSize: 18, opacity: 0.7, animation: 'none' }}>
                    <svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M1 1L1 14.5L5.5 10.5L9 18L12 16.5L8.5 9H14.5L1 1Z" fill="#111" stroke="#fff" strokeWidth="1"/></svg>
                  </div>
                </div>
              </div>
            ),
          },
          {
            title: 'Usuário preenche o report',
            description: 'Painel lateral desliza com o formulário completo — idêntico ao widget real.',
            visual: (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', background: '#fff' }}>
                {/* Header — exact fv-header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0 }}>Reportar</h2>
                  <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </div>
                </div>

                {/* Two-column body — form left, preview right */}
                <div style={{ display: 'flex', minHeight: 0 }}>
                  {/* Left: form */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Session Replay section */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
                        Session Replay <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af' }}>(gravação automática)</span>
                      </div>
                      <div style={{ borderRadius: 10, border: '1px solid #1e293b', overflow: 'hidden', background: '#0f172a' }}>
                        <div style={{ minHeight: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 8 }}>
                          <div style={{ width: '85%', height: 50, background: '#1e293b', borderRadius: 3, display: 'flex', flexDirection: 'column', padding: 6, gap: 3 }}>
                            <div style={{ height: 3, width: '35%', background: '#334155', borderRadius: 2 }} />
                            <div style={{ height: 3, width: '60%', background: '#334155', borderRadius: 2 }} />
                            <div style={{ display: 'flex', gap: 3, marginTop: 3 }}>
                              <div style={{ flex: 1, height: 14, background: '#334155', borderRadius: 2 }} />
                              <div style={{ flex: 1, height: 14, background: '#334155', borderRadius: 2 }} />
                            </div>
                          </div>
                          <div style={{ position: 'absolute', top: '52%', left: '58%', width: 10, height: 10, borderRadius: '50%', background: 'rgba(73,80,246,0.5)', border: '1.5px solid rgba(73,80,246,0.8)' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderTop: '1px solid #1e293b', background: '#0f172a' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </div>
                          <div style={{ flex: 1, height: 3, borderRadius: 2, background: '#334155', position: 'relative' }}>
                            <div style={{ width: '65%', height: '100%', borderRadius: 2, background: '#4f46e5' }} />
                          </div>
                          <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>00:21 / 00:32</span>
                        </div>
                      </div>
                    </div>

                    {/* Form fields */}
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Título</label>
                        <div style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, color: '#111827' }}>Botão de pagamento não funciona</div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Descrição <span style={{ color: '#ef4444' }}>*</span></label>
                        <div style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 11, color: '#374151', lineHeight: 1.5, minHeight: 44 }}>Ao clicar em &quot;Finalizar compra&quot;, o botão fica carregando infinitamente e retorna erro 500.</div>
                      </div>
                      {/* Type — segmented buttons */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Tipo</label>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {[
                            { label: 'Bug', active: true, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/></svg> },
                            { label: 'Sugestão', active: false, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> },
                            { label: 'Dúvida', active: false, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg> },
                            { label: 'Elogio', active: false, icon: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></svg> },
                          ].map(t => (
                            <div key={t.label} style={{ flex: 1, padding: '6px 2px', borderRadius: 8, fontSize: 10, border: t.active ? '2px solid #4f46e5' : '1px solid #d1d5db', background: t.active ? 'rgba(79,70,229,0.05)' : '#fff', color: t.active ? '#4f46e5' : '#374151', fontWeight: t.active ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                              {t.icon} {t.label}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Priority — segmented buttons with colors */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Prioridade</label>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {[
                            { label: 'Baixa', color: '#22c55e', active: false },
                            { label: 'Média', color: '#f59e0b', active: false },
                            { label: 'Alta', color: '#f97316', active: true },
                            { label: 'Crítica', color: '#ef4444', active: false },
                          ].map(s => (
                            <div key={s.label} style={{ flex: 1, padding: '6px 2px', borderRadius: 8, fontSize: 10, border: s.active ? `2px solid ${s.color}` : '1px solid #d1d5db', background: s.active ? `${s.color}15` : '#fff', color: s.active ? s.color : '#374151', fontWeight: s.active ? 600 : 400, textAlign: 'center' }}>
                              {s.label}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Attachments */}
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5 }}>Anexos</label>
                        <div style={{ padding: 8, borderRadius: 8, border: '2px dashed #d1d5db', fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                          Clique para anexar arquivos (máx. 5)
                        </div>
                      </div>
                      <button style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        Enviar Bug
                      </button>
                    </div>
                  </div>

                  {/* Right: live preview */}
                  <div className="demo-bg-site" style={{ width: 200, flexShrink: 0, borderLeft: '1px solid #e5e7eb', background: '#f9fafb', padding: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Pré-visualização</div>
                    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: '#fef2f2', color: '#dc2626', alignSelf: 'flex-start' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/></svg>
                        Bug
                      </span>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>Botão de pagamento não funciona</div>
                      <p style={{ fontSize: 10, color: '#374151', lineHeight: 1.5, margin: 0 }}>Ao clicar em &quot;Finalizar compra&quot;, o botão fica carregando...</p>
                      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                          <span style={{ color: '#2563eb' }}>meusite.com.br/checkout</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                          <span style={{ color: '#374151' }}>macOS • Chrome</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                          <span style={{ color: '#374151' }}>3 errors • 12 warns</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            title: 'Dados capturados automaticamente',
            description: 'Sem esforço do usuário: screenshot, replay da sessão, logs do console e requisições de rede.',
            visual: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Session Replay — exact replica of FeedbackModal replay player */}
                <div style={{ borderRadius: 12, border: '1px solid #1e293b', overflow: 'hidden' }}>
                  {/* Dark replay viewport */}
                  <div style={{ background: '#0f172a', minHeight: 100, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Miniature page rendering */}
                    <div style={{ width: '80%', height: 70, background: '#1e293b', borderRadius: 4, display: 'flex', flexDirection: 'column', padding: 8, gap: 4 }}>
                      <div style={{ height: 4, width: '40%', background: '#334155', borderRadius: 2 }} />
                      <div style={{ height: 4, width: '70%', background: '#334155', borderRadius: 2 }} />
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 20, background: '#334155', borderRadius: 2 }} />
                        <div style={{ flex: 1, height: 20, background: '#334155', borderRadius: 2 }} />
                      </div>
                      {/* Animated cursor */}
                      <div style={{ position: 'absolute', top: '55%', left: '60%' }}>
                        <svg width="12" height="16" viewBox="0 0 16 20" fill="none"><path d="M1 1L1 14.5L5.5 10.5L9 18L12 16.5L8.5 9H14.5L1 1Z" fill="#fff" stroke="#0f172a" strokeWidth="1"/></svg>
                      </div>
                    </div>
                    {/* Stats bar — matches embed */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', padding: '6px 16px', background: '#1e293b', fontSize: 11, color: '#94a3b8' }}>
                      <span>142 eventos</span>
                      <span>32s gravados</span>
                    </div>
                  </div>
                  {/* Replay controls — matches embed player exactly */}
                  <div style={{ background: '#fff', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Play button */}
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                      {/* Timeline */}
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, position: 'relative' }}>
                          <div style={{ width: '65%', height: '100%', background: '#4f46e5', borderRadius: 3 }} />
                          <div style={{ position: 'absolute', top: -4, left: '65%', width: 14, height: 14, borderRadius: '50%', background: '#4f46e5', border: '2px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace', flexShrink: 0 }}>00:21 / 00:32</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      {['0.5x', '1x', '2x', '4x'].map((s, i) => (
                        <span key={s} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: i === 1 ? 600 : 400, background: i === 1 ? '#4f46e5' : 'transparent', color: i === 1 ? '#fff' : '#9ca3af', cursor: 'pointer' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Expandable sections — matches FeedbackModal exactly */}
                {/* Console Logs */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Console Logs</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>3 errors</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fef9c3', color: '#a16207' }}>12 warn</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                  <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                    {[
                      { level: 'ERROR', msg: 'TypeError: Cannot read properties of undefined (reading \'id\')', bg: '#fee2e2', color: '#b91c1c' },
                      { level: 'ERROR', msg: 'POST /api/checkout 500 (Internal Server Error)', bg: '#fee2e2', color: '#b91c1c' },
                      { level: 'ERROR', msg: 'Uncaught (in promise) Error: Payment failed', bg: '#fee2e2', color: '#b91c1c' },
                      { level: 'WARN', msg: 'componentWillMount has been renamed', bg: '#fef9c3', color: '#a16207' },
                      { level: 'INFO', msg: 'React DevTools: Connected', bg: '#dbeafe', color: '#1d4ed8' },
                    ].map((log, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 14px', borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, lineHeight: '16px', background: log.bg, color: log.color }}>{log.level}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', wordBreak: 'break-word' }}>{log.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Network Logs */}
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f9fafb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Network Requests</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#b91c1c' }}>1 failed</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                  <div>
                    {[
                      { method: 'GET', url: '/api/products?category=electronics', status: 200, time: '45ms', mColor: '#2563eb' },
                      { method: 'GET', url: '/api/cart/items', status: 200, time: '23ms', mColor: '#2563eb' },
                      { method: 'POST', url: '/api/checkout/process', status: 500, time: '1.2s', mColor: '#d97706' },
                      { method: 'GET', url: '/api/user/me', status: 200, time: '32ms', mColor: '#2563eb' },
                    ].map((req, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderTop: '1px solid #f3f4f6', fontFamily: 'monospace', fontSize: 11, background: req.status >= 400 ? '#fef2f2' : 'transparent' }}>
                        <span style={{ fontWeight: 700, color: req.mColor, width: 36, flexShrink: 0 }}>{req.method}</span>
                        <span style={{ flex: 1, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.url}</span>
                        <span style={{ fontWeight: 600, color: req.status >= 400 ? '#dc2626' : '#059669', flexShrink: 0 }}>{req.status}</span>
                        <span style={{ color: '#9ca3af', width: 36, textAlign: 'right', flexShrink: 0 }}>{req.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ),
          },
          {
            title: 'Gerencie no painel',
            description: 'Reports organizados com status, replay integrado, filtros e contexto completo para resolver rápido.',
            visual: (
              <div style={{ ...S.browser, background: '#fff' }}>
                <div style={S.browserBar}>
                  <div style={S.dot('#ff5f57')} /><div style={S.dot('#febc2e')} /><div style={S.dot('#28c840')} />
                  <div style={S.urlBar}>buug.io/projects/meu-site</div>
                </div>
                <div style={{ background: '#fff', display: 'flex', minHeight: 310 }}>
                  {/* Sidebar */}
                  <div style={{ width: 48, background: '#fafafa', borderRight: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 4 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <span style={{ color: '#fff', fontSize: 9, fontWeight: 800 }}>RB</span>
                    </div>
                    {/* Nav items */}
                    {[
                      { active: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
                      { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg> },
                      { active: false, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg> },
                    ].map((item, i) => (
                      <div key={i} style={{ width: 32, height: 32, borderRadius: 6, background: item.active ? '#ede9fe' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        {item.icon}
                      </div>
                    ))}
                    <div style={{ flex: 1 }} />
                    <div style={{ width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                    </div>
                  </div>

                  {/* Main content */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Top header bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Projetos</span>
                        <span style={{ fontSize: 11, color: '#d1d5db' }}>/</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>Meu E-commerce</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ padding: '3px 8px', borderRadius: 4, background: '#ede9fe', fontSize: 9, fontWeight: 600, color: '#4f46e5' }}>PRO</div>
                        <div style={{ width: 24, height: 24, borderRadius: 12, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>LC</span>
                        </div>
                      </div>
                    </div>

                    {/* Project header with stats */}
                    <div style={{ padding: '12px 14px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Meu E-commerce</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#ecfdf5', fontSize: 9, fontWeight: 600, color: '#059669' }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }} />Conectado
                            </span>
                          </div>
                          <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>meusite.com.br</span>
                        </div>
                        <div style={{ display: 'flex', gap: 14 }}>
                          {[
                            { n: '15', l: 'Total', c: '#111' },
                            { n: '3', l: 'Abertos', c: '#d97706' },
                            { n: '2', l: 'Críticos', c: '#dc2626' },
                            { n: '12', l: 'Resolvidos', c: '#059669' },
                          ].map(s => (
                            <div key={s.l} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 15, fontWeight: 700, color: s.c }}>{s.n}</div>
                              <div style={{ fontSize: 8, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{s.l}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tabs */}
                      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #f3f4f6' }}>
                        {[
                          { label: 'Reports', count: '15', active: true },
                          { label: 'Histórico', active: false },
                          { label: 'Configurações', active: false },
                        ].map(tab => (
                          <div key={tab.label} style={{ padding: '6px 12px 8px', borderBottom: `2px solid ${tab.active ? '#4f46e5' : 'transparent'}`, marginBottom: -2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: tab.active ? 600 : 400, color: tab.active ? '#4f46e5' : '#9ca3af' }}>{tab.label}</span>
                            {tab.count && <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: 9, fontWeight: 600, background: tab.active ? '#ede9fe' : '#f3f4f6', color: tab.active ? '#4f46e5' : '#9ca3af' }}>{tab.count}</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Search + filters toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 8, top: 8 }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        <div style={{ width: '100%', padding: '5px 8px 5px 24px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af', background: '#fff' }}>Buscar reports...</div>
                      </div>
                      <div style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
                      </div>
                    </div>

                    {/* List view table */}
                    <div style={{ margin: '0 14px 14px', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
                      {/* List header */}
                      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 46px 50px 64px', gap: 4, padding: '5px 8px', background: '#fafafa', borderBottom: '1px solid #e5e7eb', fontSize: 8, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <span>Tipo</span><span>Descrição</span><span>Sever.</span><span>Status</span><span>Data</span>
                      </div>
                      {/* List rows */}
                      {[
                        { type: 'Bug', typeBg: '#fef2f2', typeC: '#dc2626', desc: 'Botão de pagamento não funciona', sev: 'Alta', sevBg: '#fef2f2', sevC: '#dc2626', status: 'Aberto', stBg: '#fefce8', stC: '#a16207', date: '15 mar 09:42' },
                        { type: 'Bug', typeBg: '#fef2f2', typeC: '#dc2626', desc: 'Imagem quebrada na página de produto', sev: 'Média', sevBg: '#fefce8', sevC: '#a16207', status: 'Aberto', stBg: '#fefce8', stC: '#a16207', date: '14 mar 18:15' },
                        { type: 'Bug', typeBg: '#fef2f2', typeC: '#dc2626', desc: 'Carrinho não atualiza quantidade', sev: 'Alta', sevBg: '#fef2f2', sevC: '#dc2626', status: 'Em progresso', stBg: '#dbeafe', stC: '#1d4ed8', date: '14 mar 11:30' },
                        { type: 'Sugestão', typeBg: '#dbeafe', typeC: '#1d4ed8', desc: 'Adicionar modo escuro', sev: 'Baixa', sevBg: '#f3f4f6', sevC: '#6b7280', status: 'Resolvido', stBg: '#ecfdf5', stC: '#059669', date: '13 mar 16:20' },
                        { type: 'Bug', typeBg: '#fef2f2', typeC: '#dc2626', desc: 'Erro 500 ao aplicar cupom', sev: 'Crítica', sevBg: '#fef2f2', sevC: '#dc2626', status: 'Resolvido', stBg: '#ecfdf5', stC: '#059669', date: '12 mar 14:05' },
                      ].map((r, i, arr) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 46px 50px 64px', gap: 4, padding: '6px 8px', borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', fontSize: 10, cursor: 'pointer' }}>
                          <span style={{ padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 600, background: r.typeBg, color: r.typeC, textAlign: 'center' }}>{r.type}</span>
                          <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.desc}</span>
                          <span style={{ padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 600, background: r.sevBg, color: r.sevC, textAlign: 'center' }}>{r.sev}</span>
                          <span style={{ padding: '2px 4px', borderRadius: 4, fontSize: 8, fontWeight: 600, background: r.stBg, color: r.stC, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.status}</span>
                          <span style={{ color: '#9ca3af', fontSize: 9 }}>{r.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
        ]

        const step = demoSteps[demoStep]

        return (
          <div
            onClick={() => setDemoOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'var(--surface-background)', borderRadius: 24, width: '100%', maxWidth: 640, maxHeight: 'calc(100vh - 2rem)', overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--neutral-border-medium)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--neutral-on-background-strong)' }}>Buug</span>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--brand-alpha-weak)', color: 'var(--brand-on-background-strong)' }}>Demo interativa</span>
                </div>
                <button onClick={() => setDemoOpen(false)} style={{ background: 'var(--neutral-alpha-weak)', border: 'none', cursor: 'pointer', color: 'var(--neutral-on-background-weak)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  <IoMdClose />
                </button>
              </div>

              {/* Step indicators */}
              <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0' }}>
                {demoSteps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setDemoStep(i)}
                    style={{ flex: 1, height: 3, borderRadius: 2, border: 'none', cursor: 'pointer', background: i <= demoStep ? 'var(--brand-solid-strong)' : 'var(--neutral-alpha-medium)', transition: 'background 0.3s' }}
                  />
                ))}
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-on-background-strong)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Etapa {demoStep + 1} de {demoSteps.length}
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--neutral-on-background-strong)', margin: '0 0 4px' }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--neutral-on-background-weak)', margin: 0, lineHeight: 1.5 }}>{step.description}</p>
                </div>
                {step.visual}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderTop: '1px solid var(--neutral-border-medium)', background: 'var(--neutral-alpha-weak)', flexShrink: 0 }}>
                <button
                  onClick={() => setDemoStep(Math.max(0, demoStep - 1))}
                  disabled={demoStep === 0}
                  style={{ padding: '10px 22px', borderRadius: 12, border: '1px solid var(--neutral-border-medium)', background: 'var(--surface-background)', color: demoStep === 0 ? 'var(--neutral-on-background-weak)' : 'var(--neutral-on-background-strong)', fontWeight: 600, fontSize: 14, cursor: demoStep === 0 ? 'default' : 'pointer', opacity: demoStep === 0 ? 0.4 : 1 }}
                >
                  Anterior
                </button>
                {demoStep < demoSteps.length - 1 ? (
                  <button
                    onClick={() => setDemoStep(demoStep + 1)}
                    style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'var(--brand-solid-strong)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}
                  >
                    Próxima etapa
                  </button>
                ) : (
                  <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '10px 28px', borderRadius: 12, border: 'none', background: 'var(--brand-solid-strong)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.3)' }}>
                      Começar grátis
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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
                    '10 reports (total)',
                    'Projetos ilimitados',
                    'Membros ilimitados',
                    'Screenshot + replay de sessão',
                    'Console & network logs',
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
                    '2.000 reports/mês',
                    'Projetos ilimitados',
                    'Membros ilimitados',
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
                    '10.000 reports/mês',
                    'Projetos ilimitados',
                    'Membros ilimitados',
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
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '-0.02em', color: 'var(--neutral-on-background-weak)' }}>Buug</span>
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

    </Column>
  )
}
