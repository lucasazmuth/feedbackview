'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
export type DocPageId =
  | 'intro'
  | 'auth'
  | 'projects'
  | 'feedbacks-list'
  | 'feedback-one'
  | 'feedback-patch'
  | 'webhooks'
  | 'signature'
  | 'limits'

const DOC_NAV_GROUPS: { group: string; items: { id: DocPageId; label: string }[] }[] = [
  { group: 'Introdução', items: [{ id: 'intro', label: 'Visão geral' }] },
  { group: 'Autenticação', items: [{ id: 'auth', label: 'API Key (Bearer)' }] },
  {
    group: 'API REST v1',
    items: [
      { id: 'projects', label: 'Listar projetos' },
      { id: 'feedbacks-list', label: 'Listar reports' },
      { id: 'feedback-one', label: 'Obter report' },
      { id: 'feedback-patch', label: 'Atualizar report' },
    ],
  },
  {
    group: 'Webhooks',
    items: [
      { id: 'webhooks', label: 'Receber eventos' },
      { id: 'signature', label: 'Validar assinatura' },
    ],
  },
  { group: 'Referência', items: [{ id: 'limits', label: 'Limites e erros' }] },
]

const METHOD_STYLES: Record<'GET' | 'POST' | 'PATCH', { bg: string; fg: string; border: string }> = {
  GET: {
    bg: 'rgba(34, 197, 94, 0.14)',
    fg: 'var(--success-on-background-strong, #15803d)',
    border: 'rgba(34, 197, 94, 0.35)',
  },
  POST: {
    bg: 'rgba(59, 130, 246, 0.12)',
    fg: 'var(--brand-on-background-strong)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  PATCH: {
    bg: 'rgba(245, 158, 11, 0.14)',
    fg: 'var(--warning-on-background-strong, #b45309)',
    border: 'rgba(245, 158, 11, 0.4)',
  },
}

function MethodBadge({ method }: { method: keyof typeof METHOD_STYLES }) {
  const s = METHOD_STYLES[method]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '3.25rem',
        padding: '0.2rem 0.5rem',
        borderRadius: '0.35rem',
        fontSize: '1.2rem',
        fontWeight: 800,
        letterSpacing: '0.04em',
        fontFamily: 'ui-monospace, monospace',
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
      }}
    >
      {method}
    </span>
  )
}

function EndpointLine({ method, fullUrl }: { method: keyof typeof METHOD_STYLES; fullUrl: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--neutral-border-medium)',
        background: 'var(--surface-background)',
      }}
    >
      <MethodBadge method={method} />
      <code
        style={{
          flex: '1 1 12rem',
          fontSize: '1.4rem',
          fontFamily: 'ui-monospace, monospace',
          wordBreak: 'break-all',
          color: 'var(--neutral-on-background-strong)',
        }}
      >
        {fullUrl}
      </code>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontSize: '1.2rem',
        opacity: 0.85,
      }}
    >
      {children}
    </span>
  )
}

const codeBox: React.CSSProperties = {
  fontSize: '1.2rem',
  fontFamily: 'ui-monospace, monospace',
  display: 'block',
  padding: '0.85rem 1rem',
  borderRadius: '0.5rem',
  background: 'var(--surface-background)',
  border: '1px solid var(--neutral-border-medium)',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.55,
  overflowX: 'auto',
}

function CodeBlock({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div>
      <div>
        <button onClick={onCopy} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--neutral-on-background-weak)', fontSize: '1.4rem', fontWeight: 600, cursor: 'pointer' }}>{copied ? 'Copiado' : 'Copiar'}</button>
      </div>
      <code style={codeBox}>{code}</code>
    </div>
  )
}

function ResponseTable({
  rows,
  firstColumnHeader = 'Código',
  secondColumnHeader = 'Descrição',
}: {
  rows: { status: string; title: string; body?: string }[]
  firstColumnHeader?: string
  secondColumnHeader?: string
}) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--neutral-border-medium)', borderRadius: '0.5rem' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.4rem' }}>
        <thead>
          <tr style={{ background: 'var(--neutral-alpha-weak)', textAlign: 'left' }}>
            <th style={{ padding: '0.5rem 0.75rem', minWidth: '6rem' }}>{firstColumnHeader}</th>
            <th style={{ padding: '0.5rem 0.75rem' }}>{secondColumnHeader}</th>
          </tr>
        </thead>
        <tbody style={{ color: 'var(--neutral-on-background-weak)' }}>
          {rows.map(r => (
            <tr key={r.status} style={{ borderTop: '1px solid var(--neutral-border-medium)' }}>
              <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{r.status}</td>
              <td style={{ padding: '0.5rem 0.75rem' }}>
                {r.title}
                {r.body && (
                  <code style={{ display: 'block', marginTop: '0.35rem', fontSize: '1.2rem', opacity: 0.9 }}>{r.body}</code>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function IntegrationsDocsReference({
  apiBase,
  docPage,
  setDocPage,
}: {
  apiBase: string
  docPage: DocPageId
  setDocPage: (id: DocPageId) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [docLayoutWide, setDocLayoutWide] = useState(true)

  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0
  }, [docPage])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => setDocLayoutWide(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const copy = (id: string, text: string) => {
    try {
      void navigator.clipboard.writeText(text)
    } catch {
      const t = document.createElement('textarea')
      t.value = text
      t.style.position = 'fixed'
      t.style.opacity = '0'
      document.body.appendChild(t)
      t.select()
      document.execCommand('copy')
      document.body.removeChild(t)
    }
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const navButton = (id: DocPageId, label: string) => {
    const active = docPage === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => setDocPage(id)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '0.35rem 0.5rem',
          marginBottom: '0.125rem',
          borderRadius: '0.375rem',
          border: 'none',
          background: active ? 'var(--brand-alpha-weak)' : 'transparent',
          color: active ? 'var(--brand-on-background-strong)' : 'var(--neutral-on-background-weak)',
          fontSize: '1.4rem',
          fontWeight: active ? 600 : 500,
          cursor: 'pointer',
          lineHeight: 1.35,
        }}
      >
        {label}
      </button>
    )
  }

  const pageTitle = (() => {
    const map: Record<DocPageId, string> = {
      intro: 'Visão geral',
      auth: 'Autenticação',
      projects: 'Listar projetos',
      'feedbacks-list': 'Listar reports',
      'feedback-one': 'Obter report',
      'feedback-patch': 'Atualizar report',
      webhooks: 'Webhooks — receber eventos',
      signature: 'Validar assinatura',
      limits: 'Limites e erros',
    }
    return map[docPage]
  })()

  return (
    <div>
      <div
        style={{
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--neutral-border-medium)',
          background: 'var(--neutral-alpha-weak)',
        }}
      >
        <span>
          Referência da API pública <strong>v1</strong> e dos webhooks do Buug. Layout inspirado em documentações de
          API como a do{' '}
          <a href="https://developer.clickup.com/reference/getaccesstoken" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-on-background-strong)', fontWeight: 600 }}>
            ClickUp Developer
          </a>
          . Base atual: <code style={{ fontSize: '0.85em' }}>{apiBase}</code>
        </span>
      </div>

      <div style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <nav
          aria-label="Navegação da referência"
          style={{
            flex: docLayoutWide ? '0 1 220px' : '1 1 100%',
            minWidth: docLayoutWide ? 'min(100%, 200px)' : 0,
            maxWidth: docLayoutWide ? '280px' : '100%',
            width: docLayoutWide ? undefined : '100%',
            position: docLayoutWide ? 'sticky' : 'relative',
            top: docLayoutWide ? '0.5rem' : undefined,
            alignSelf: 'flex-start',
            maxHeight: docLayoutWide ? 'calc(100vh - 120px)' : 'none',
            overflowY: docLayoutWide ? 'auto' : 'visible',
            paddingRight: docLayoutWide ? '1rem' : 0,
            paddingBottom: docLayoutWide ? 0 : '1rem',
            marginBottom: docLayoutWide ? 0 : '0.5rem',
            borderRight: docLayoutWide ? '1px solid var(--neutral-border-medium)' : 'none',
            borderBottom: docLayoutWide ? 'none' : '1px solid var(--neutral-border-medium)',
          }}
        >
          {DOC_NAV_GROUPS.map(section => (
            <div key={section.group} style={{ marginBottom: '1.25rem' }}>
              <span
                style={{ display: 'block', marginBottom: '0.35rem', fontSize: '1.2rem', letterSpacing: '0.06em' }}
              >
                {section.group}
              </span>
              {section.items.map(item => navButton(item.id, item.label))}
            </div>
          ))}
        </nav>

        <article
          ref={panelRef}
          style={{
            flex: '1 1 420px',
            minWidth: 0,
            maxWidth: '100%',
            maxHeight: docLayoutWide ? 'calc(100vh - 120px)' : 'none',
            overflowY: docLayoutWide ? 'auto' : 'visible',
            paddingRight: '0.25rem',
          }}
        >
          <div>
            <header>
              <h1  style={{ marginBottom: '0.35rem' }}>
                {pageTitle}
              </h1>
              <span>
                Buug · API pública v1 / Webhooks
              </span>
            </header>

            {docPage === 'intro' && (
              <>
                <span>
                  Use a <strong>API REST</strong> quando seu sistema precisar <strong>buscar ou atualizar</strong> dados no
                  Buug com uma chave de acesso. Use <strong>webhooks</strong> quando quiser que o Buug{' '}
                  <strong>avisar automaticamente</strong> um endereço seu sempre que algo acontecer. A API e os webhooks de
                  saída exigem <strong>plano Pro ou Business com assinatura ativa</strong> no workspace.
                </span>
                <SectionLabel>Índice de endpoints</SectionLabel>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.4rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--neutral-border-medium)', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Método</th>
                        <th style={{ padding: '0.5rem' }}>Caminho</th>
                        <th style={{ padding: '0.5rem' }}>Descrição</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: 'var(--neutral-on-background-weak)' }}>
                      {[
                        ['GET', '/projects', 'Lista projetos da organização da chave'],
                        ['GET', '/feedbacks', 'Lista reports (filtros e paginação)'],
                        ['GET', '/feedbacks/:id', 'Detalhe de um report'],
                        ['PATCH', '/feedbacks/:id', 'Atualiza status, dueDate, startDate'],
                      ].map(([m, p, d]) => (
                        <tr key={`${m}-${p}`} style={{ borderBottom: '1px solid var(--neutral-border-medium)' }}>
                          <td style={{ padding: '0.5rem 0.5rem 0.5rem 0', fontFamily: 'monospace', fontWeight: 600 }}>{m}</td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{p}</td>
                          <td style={{ padding: '0.5rem' }}>{d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <span>
                  Cada linha da coluna da esquerda deste painel aprofunda um tópico — como nas páginas por endpoint da
                  documentação do ClickUp.
                </span>
              </>
            )}

            {docPage === 'auth' && (
              <>
                <span>
                  Todas as rotas em <code style={{ fontSize: '0.9em' }}>{apiBase}</code> exigem uma chave criada em{' '}
                  <strong>Integrações → Chaves de acesso</strong>. Envie no cabeçalho HTTP{' '}
                  <code style={{ fontSize: '0.9em' }}>Authorization</code> no formato Bearer.
                </span>
                <SectionLabel>Cabeçalhos obrigatórios</SectionLabel>
                <ResponseTable
                  firstColumnHeader="Cabeçalho"
                  secondColumnHeader="Valor / uso"
                  rows={[
                    { status: 'Authorization', title: 'Bearer + sua chave completa (ex.: buug_sk_…)' },
                    { status: 'Content-Type', title: 'application/json (para PATCH com corpo JSON)' },
                  ]}
                />
                <SectionLabel>Respostas de erro</SectionLabel>
                <ResponseTable
                  firstColumnHeader="HTTP"
                  secondColumnHeader="Significado"
                  rows={[
                    { status: '401', title: 'Chave ausente ou inválida' },
                    { status: '403', title: 'Chave sem permissão para a operação' },
                    {
                      status: '403',
                      title:
                        'Organização sem plano pago ativo (código INTEGRATIONS_REQUIRE_PAID_PLAN) — API disponível só em Pro/Business com assinatura ativa',
                    },
                    { status: '429', title: 'Limite de 100 requisições/minuto excedido' },
                  ]}
                />
              </>
            )}

            {docPage === 'projects' && (
              <>
                <span>
                  Retorna os projetos da organização associada à chave. Projetos arquivados não entram na lista.
                </span>
                <EndpointLine method="GET" fullUrl={`${apiBase}/projects`} />
                <SectionLabel>Permissão</SectionLabel>
                <span>
                  <code style={{ fontSize: '0.9em' }}>read:projects</code>
                </span>
                <SectionLabel>Resposta · 200 OK</SectionLabel>
                <span>
                  JSON com <code style={{ fontSize: '0.9em' }}>data</code> (array de projetos: id, name, targetUrl, mode,
                  createdAt, embedLastSeenAt, embedPaused) e <code style={{ fontSize: '0.9em' }}>meta.total</code>.
                </span>
                <CodeBlock
                  code={`GET ${apiBase}/projects
Authorization: Bearer buug_sk_...`}
                  onCopy={() => copy('p1', `GET ${apiBase}/projects\nAuthorization: Bearer buug_sk_...`)}
                  copied={copiedId === 'p1'}
                />
              </>
            )}

            {docPage === 'feedbacks-list' && (
              <>
                <span>
                  Lista reports dos projetos da sua organização, com filtros opcionais e paginação.
                </span>
                <EndpointLine method="GET" fullUrl={`${apiBase}/feedbacks`} />
                <SectionLabel>Query parameters</SectionLabel>
                <ResponseTable
                  firstColumnHeader="Parâmetro"
                  secondColumnHeader="Descrição"
                  rows={[
                    { status: 'project_id', title: 'Opcional — restringe a um projeto' },
                    { status: 'status', title: 'Opcional — OPEN, IN_PROGRESS, UNDER_REVIEW, RESOLVED, CANCELLED' },
                    { status: 'type', title: 'Opcional — filtra por tipo' },
                    { status: 'severity', title: 'Opcional — filtra por severidade' },
                    { status: 'page', title: 'Página (padrão 1)' },
                    { status: 'per_page', title: 'Itens por página (padrão 50, máx. 100)' },
                  ]}
                />
                <SectionLabel>Resposta · 200 OK</SectionLabel>
                <span>
                  <code style={{ fontSize: '0.9em' }}>data</code> — array de reports; <code style={{ fontSize: '0.9em' }}>meta</code> —{' '}
                  total, page, per_page.
                </span>
                <CodeBlock
                  code={`GET ${apiBase}/feedbacks?status=OPEN&page=1&per_page=20
Authorization: Bearer buug_sk_...`}
                  onCopy={() =>
                    copy(
                      'fl1',
                      `GET ${apiBase}/feedbacks?status=OPEN&page=1&per_page=20\nAuthorization: Bearer buug_sk_...`
                    )
                  }
                  copied={copiedId === 'fl1'}
                />
              </>
            )}

            {docPage === 'feedback-one' && (
              <>
                <span>
                  Retorna um único report pelo ID. Se o report não for da organização da chave, a API responde 404.
                </span>
                <EndpointLine method="GET" fullUrl={`${apiBase}/feedbacks/{feedback_id}`} />
                <SectionLabel>Permissão</SectionLabel>
                <span>
                  <code style={{ fontSize: '0.9em' }}>read:feedbacks</code>
                </span>
                <SectionLabel>Resposta · 200 OK</SectionLabel>
                <span>
                  Objeto <code style={{ fontSize: '0.9em' }}>data</code> com os campos do report e relação{' '}
                  <code style={{ fontSize: '0.9em' }}>Project</code> (id, name, organizationId).
                </span>
                <CodeBlock
                  code={`GET ${apiBase}/feedbacks/SEU_FEEDBACK_ID
Authorization: Bearer buug_sk_...`}
                  onCopy={() => copy('fo1', `GET ${apiBase}/feedbacks/SEU_FEEDBACK_ID\nAuthorization: Bearer buug_sk_...`)}
                  copied={copiedId === 'fo1'}
                />
              </>
            )}

            {docPage === 'feedback-patch' && (
              <>
                <span>
                  Atualiza parcialmente um report. Apenas os campos enviados são alterados. Mudança de status pode disparar
                  o webhook <code style={{ fontSize: '0.9em' }}>feedback.status_changed</code>.
                </span>
                <EndpointLine method="PATCH" fullUrl={`${apiBase}/feedbacks/{feedback_id}`} />
                <SectionLabel>Corpo da requisição · JSON</SectionLabel>
                <span>
                  Campos opcionais (pelo menos um obrigatório):
                </span>
                <ResponseTable
                  firstColumnHeader="Campo"
                  secondColumnHeader="Descrição"
                  rows={[
                    {
                      status: 'status',
                      title: 'OPEN | IN_PROGRESS | UNDER_REVIEW | RESOLVED | CANCELLED',
                    },
                    { status: 'dueDate', title: 'ISO 8601 ou null para limpar' },
                    { status: 'startDate', title: 'ISO 8601 ou null para limpar' },
                  ]}
                />
                <SectionLabel>Resposta · 200 OK</SectionLabel>
                <span>
                  <code style={{ fontSize: '0.9em' }}>data</code> com id e campos atualizados.
                </span>
                <CodeBlock
                  code={`PATCH ${apiBase}/feedbacks/SEU_FEEDBACK_ID
Authorization: Bearer buug_sk_...
Content-Type: application/json

{"status": "IN_PROGRESS", "dueDate": "2026-04-01T12:00:00.000Z"}`}
                  onCopy={() =>
                    copy(
                      'fp1',
                      `PATCH ${apiBase}/feedbacks/SEU_FEEDBACK_ID\nAuthorization: Bearer buug_sk_...\nContent-Type: application/json\n\n{"status": "IN_PROGRESS", "dueDate": "2026-04-01T12:00:00.000Z"}`
                    )
                  }
                  copied={copiedId === 'fp1'}
                />
              </>
            )}

            {docPage === 'webhooks' && (
              <>
                <span>
                  O Buug envia um <strong>POST</strong> para a URL cadastrada quando ocorre um evento. Timeout de 10s do
                  lado do Buug. Respostas HTTP <strong>2xx</strong> contam como entrega bem-sucedida.
                </span>
                <EndpointLine method="POST" fullUrl="https://sua-url.com/caminho" />
                <SectionLabel>Cabeçalhos enviados pelo Buug</SectionLabel>
                <ResponseTable
                  firstColumnHeader="Cabeçalho"
                  secondColumnHeader="Descrição"
                  rows={[
                    { status: 'Content-Type', title: 'application/json' },
                    { status: 'X-Buug-Event', title: 'Nome do evento (ex.: feedback.created)' },
                    { status: 'X-Buug-Signature', title: 'sha256=<hex> — HMAC-SHA256 do corpo bruto com o segredo do webhook' },
                    { status: 'User-Agent', title: 'Buug-Webhook/1.0' },
                  ]}
                />
                <SectionLabel>Corpo · JSON</SectionLabel>
                <span>
                  Sempre: <code style={{ fontSize: '0.9em' }}>event</code>, <code style={{ fontSize: '0.9em' }}>data</code>,{' '}
                  <code style={{ fontSize: '0.9em' }}>timestamp</code> (ISO 8601).
                </span>
                <CodeBlock
                  code={`{
  "event": "feedback.created",
  "data": {
    "feedbackId": "abc123",
    "type": "BUG",
    "severity": "CRITICAL",
    "comment": "Botão não funciona...",
    "projectName": "Meu Site"
  },
  "timestamp": "2026-03-23T12:00:00.000Z"
}`}
                  onCopy={() =>
                    copy(
                      'wh1',
                      `{\n  "event": "feedback.created",\n  "data": {\n    "feedbackId": "abc123",\n    "type": "BUG",\n    "severity": "CRITICAL",\n    "comment": "Botão não funciona...",\n    "projectName": "Meu Site"\n  },\n  "timestamp": "2026-03-23T12:00:00.000Z"\n}`
                    )
                  }
                  copied={copiedId === 'wh1'}
                />
                <span>
                  Eventos na interface: feedback.created, feedback.status_changed, feedback.assigned, feedback.due_date_set,
                  project.created, ou * para todos. O conteúdo de <code style={{ fontSize: '0.85em' }}>data</code> pode variar
                  por evento.
                </span>
              </>
            )}

            {docPage === 'signature' && (
              <>
                <span>
                  Para garantir que o POST veio do Buug, recalcule o HMAC-SHA256 do <strong>corpo bruto</strong> (string
                  JSON exatamente como recebida) com o <strong>segredo</strong> do webhook e compare com o cabeçalho{' '}
                  <code style={{ fontSize: '0.9em' }}>X-Buug-Signature</code> (prefixo <code style={{ fontSize: '0.9em' }}>sha256=</code>
                  + hexadecimal).
                </span>
                <SectionLabel>Passos</SectionLabel>
                <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '1.4rem', lineHeight: 1.65, color: 'var(--neutral-on-background-weak)' }}>
                  <li>Leia o corpo da requisição como texto antes do parse JSON.</li>
                  <li>Calcule HMAC-SHA256(secret, rawBody) em hexadecimal.</li>
                  <li>Compare com o valor do cabeçalho (comparação em tempo constante recomendada).</li>
                </ol>
                <CodeBlock
                  code={`import { createHmac } from 'crypto'

const rawBody = /* string exata do POST */
const secret = process.env.BUUG_WEBHOOK_SECRET
const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
const received = req.headers['x-buug-signature']
// Compare expected com received de forma segura (ex.: timingSafeEqual)`}
                  onCopy={() =>
                    copy(
                      'sig1',
                      `import { createHmac } from 'crypto'\n\nconst rawBody = /* string exata do POST */\nconst secret = process.env.BUUG_WEBHOOK_SECRET\nconst expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')\nconst received = req.headers['x-buug-signature']\n// Compare expected com received de forma segura (ex.: timingSafeEqual)`
                    )
                  }
                  copied={copiedId === 'sig1'}
                />
              </>
            )}

            {docPage === 'limits' && (
              <>
                <SectionLabel>Planos e integrações</SectionLabel>
                <span>
                  Chaves de API, chamadas aos endpoints <code style={{ fontSize: '0.9em' }}>/api/v1</code> e entregas de
                  webhooks de saída só funcionam com <strong>Pro ou Business</strong> e assinatura ativa no Stripe. No
                  plano gratuito você pode revogar chaves e remover webhooks já cadastrados.
                </span>
                <SectionLabel>API REST</SectionLabel>
                <ResponseTable
                  firstColumnHeader="HTTP"
                  secondColumnHeader="Significado"
                  rows={[
                    { status: '429', title: 'Rate limit: até 100 requisições por minuto por chave' },
                    { status: '401 / 403', title: 'Autenticação, permissão ou plano sem integrações' },
                    { status: '404', title: 'Recurso inexistente ou fora da organização da chave' },
                  ]}
                />
                <SectionLabel>Webhooks</SectionLabel>
                <span>
                  Entregas são registradas internamente. Falhas de rede ou respostas não-2xx são tratadas como falha na
                  entrega.
                </span>
                <SectionLabel>Chaves</SectionLabel>
                <span>
                  O valor completo da chave só aparece uma vez na criação. Revogue chaves comprometidas e gere outra.
                </span>
              </>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
