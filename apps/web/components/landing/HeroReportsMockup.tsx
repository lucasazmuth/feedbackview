'use client'

import clsx from 'clsx'

const purple = '#5b45f5'
/** Alinhado a `--brand-solid-strong` / gradiente do produto */
const brandMid = '#1e40af'
const brandHi = '#3b82f6'
const border = '#e2e8f0'
const demoUserInitial = 'L'

function SidebarIcon({
  children,
  active,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <div
      className={clsx(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md sm:h-9 sm:w-9',
        active ? 'bg-black/[0.06] text-slate-800' : 'text-slate-400'
      )}
    >
      {children}
    </div>
  )
}

function TypeBadge({
  type,
}: {
  type: 'bug' | 'sugestao' | 'elogio'
}) {
  const map = {
    bug: 'bg-red-500/15 text-red-400 border-red-500/25',
    sugestao: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    elogio: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  }
  const label = { bug: 'Bug', sugestao: 'Sugestão', elogio: 'Elogio' }[type]
  return (
    <span
      className={clsx(
        'inline-flex rounded-md border px-1.5 py-0.5 font-medium whitespace-nowrap',
        'text-[0.5625rem] sm:text-[0.625rem]',
        map[type]
      )}
    >
      {label}
    </span>
  )
}

function PriorityBadge({ level }: { level: 'critico' | 'medio' | null }) {
  if (!level)
    return <span className="text-slate-400">-</span>
  if (level === 'critico')
    return (
      <span className="inline-flex rounded-md border border-red-500/25 bg-red-500/15 px-1.5 py-0.5 text-[0.5625rem] font-medium text-red-400 sm:text-[0.625rem]">
        Crítico
      </span>
    )
  return (
    <span className="inline-flex rounded-md border border-amber-500/25 bg-amber-500/15 px-1.5 py-0.5 text-[0.5625rem] font-medium text-amber-400 sm:text-[0.625rem]">
      Médio
    </span>
  )
}

function StatusPill({
  label,
  tone,
}: {
  label: string
  tone: 'amber' | 'blue' | 'violet' | 'emerald'
}) {
  const tones = {
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    violet: 'bg-violet-500/15 text-violet-500 border-violet-500/25',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  }
  return (
    <span
      className={clsx(
        'inline-flex rounded-full border px-2 py-0.5 text-[0.5625rem] font-medium whitespace-nowrap sm:text-[0.625rem]',
        tones[tone]
      )}
    >
      {label}
    </span>
  )
}

type Row = {
  type: 'bug' | 'sugestao' | 'elogio'
  project: string
  comment: string
  priority: 'critico' | 'medio' | null
  status: string
  statusTone: 'amber' | 'blue' | 'violet' | 'emerald'
  assignee: 'plus' | 'initial'
  initial?: string
  deadline: string
  overdue?: boolean
}

function ReportTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[36rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[0.5625rem] font-medium tracking-wide text-slate-400 uppercase sm:text-[0.625rem]">
            <th className="w-6 pb-2 pl-1 pr-0 sm:w-8" aria-hidden />
            <th className="pb-2 pr-2">Tipo</th>
            <th className="pb-2 pr-2">Projeto</th>
            <th className="min-w-[7rem] pb-2 pr-2">Comentário</th>
            <th className="pb-2 pr-2">Prioridade</th>
            <th className="pb-2 pr-2">Status</th>
            <th className="pb-2 pr-2">Resp.</th>
            <th className="pb-2 pr-3">Prazo</th>
          </tr>
        </thead>
        <tbody className="text-[0.5625rem] text-slate-800 sm:text-[0.625rem]">
          {rows.map((r, i) => (
            <tr
              key={i}
              className="group border-b border-slate-100 transition-colors hover:bg-slate-50"
            >
              <td className="py-2 pl-1 align-middle text-slate-300">
                <span className="inline-flex flex-col gap-0.5">
                  <span className="block h-px w-2 rounded-full bg-current" />
                  <span className="block h-px w-2 rounded-full bg-current" />
                  <span className="block h-px w-2 rounded-full bg-current" />
                </span>
              </td>
              <td className="py-2 pr-2 align-middle">
                <TypeBadge type={r.type} />
              </td>
              <td className="max-w-[5.5rem] truncate py-2 pr-2 align-middle text-blue-600/80 sm:max-w-[7rem]">
                {r.project}
              </td>
              <td className="max-w-[10rem] truncate py-2 pr-2 align-middle text-slate-700 sm:max-w-[14rem]">
                {r.comment}
              </td>
              <td className="py-2 pr-2 align-middle">
                <PriorityBadge level={r.priority} />
              </td>
              <td className="py-2 pr-2 align-middle">
                <StatusPill label={r.status} tone={r.statusTone} />
              </td>
              <td className="py-2 pr-2 align-middle">
                {r.assignee === 'plus' ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">
                    +
                  </span>
                ) : (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[0.625rem] font-medium text-slate-700">
                    {r.initial}
                  </span>
                )}
              </td>
              <td className="py-2 pr-3 align-middle">
                <span
                  className={clsx(
                    'whitespace-nowrap',
                    r.overdue ? 'font-medium text-red-500' : 'text-slate-400'
                  )}
                >
                  {r.deadline}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupHeader({
  label,
  count,
  accent,
}: {
  label: string
  count: number
  accent: 'amber' | 'blue' | 'violet' | 'emerald'
}) {
  const bar = {
    amber: 'bg-amber-400',
    blue: 'bg-blue-400',
    violet: 'bg-violet-400',
    emerald: 'bg-emerald-400',
  }[accent]
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 sm:px-4">
      <span className={clsx('h-4 w-0.5 shrink-0 rounded-full sm:h-5', bar)} />
      <svg
        className="h-3 w-3 shrink-0 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
      <span className="text-[0.6875rem] font-semibold text-slate-800 sm:text-xs">{label}</span>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[0.625rem] font-medium text-slate-600">
        {count}
      </span>
    </div>
  )
}

const abertoRows: Row[] = [
  {
    type: 'bug',
    project: 'Report Bug',
    comment: 'PIX: cliente paga e fica só “processando”, não confirma',
    priority: 'critico',
    status: 'Aberto',
    statusTone: 'amber',
    assignee: 'initial',
    initial: 'E',
    deadline: '2d atrás',
  },
  {
    type: 'bug',
    project: 'iFood Parceiros',
    comment: 'Me joga pra login no meio do cadastro de loja, perdi tudo',
    priority: 'medio',
    status: 'Aberto',
    statusTone: 'amber',
    assignee: 'plus',
    deadline: '4d atrás',
  },
  {
    type: 'sugestao',
    project: 'iFood Parceiros',
    comment: 'Salvar rascunho do cardápio: fecho o navegador e some',
    priority: null,
    status: 'Aberto',
    statusTone: 'amber',
    assignee: 'plus',
    deadline: '5d atrás',
  },
  {
    type: 'bug',
    project: 'Maria Cândida',
    comment: 'Carrinho some se volto do checkout no Safari iOS',
    priority: null,
    status: 'Aberto',
    statusTone: 'amber',
    assignee: 'plus',
    deadline: '7d atrás',
    overdue: true,
  },
  {
    type: 'sugestao',
    project: 'Bubble',
    comment: 'Publicar não atualiza o preview; tenho que dar hard refresh',
    priority: 'medio',
    status: 'Aberto',
    statusTone: 'amber',
    assignee: 'initial',
    initial: 'L',
    deadline: '8d atrás',
  },
  {
    type: 'bug',
    project: 'Report Bug',
    comment: '“Esqueci minha senha” abre 404 (Chrome 134, aba anônima)',
    priority: null,
    status: 'Aberto',
    statusTone: 'amber',
    assignee: 'plus',
    deadline: '11d atrás',
  },
]

const emAndamentoRows: Row[] = [
  {
    type: 'sugestao',
    project: 'Bubble',
    comment: 'Atalho Cmd+K pra buscar registros (tipo Linear)',
    priority: null,
    status: 'Em andamento',
    statusTone: 'blue',
    assignee: 'initial',
    initial: 'R',
    deadline: '8d atrás',
  },
]

const sobRevisaoRows: Row[] = [
  {
    type: 'bug',
    project: 'Report Bug',
    comment: 'Anexo PNG >2MB trava e depois “Algo deu errado” sem código',
    priority: 'medio',
    status: 'Sob revisão',
    statusTone: 'violet',
    assignee: 'plus',
    deadline: '12d atrás',
  },
]

const concluidaRows: Row[] = [
  {
    type: 'elogio',
    project: 'Maria Cândida',
    comment: 'Checkout novo ficou MUITO mais claro, parabéns ao time',
    priority: null,
    status: 'Concluída',
    statusTone: 'emerald',
    assignee: 'initial',
    initial: 'M',
    deadline: '12d atrás',
  },
  {
    type: 'sugestao',
    project: 'iFood Parceiros',
    comment: 'Modo escuro no painel, cansaço de olho à noite',
    priority: null,
    status: 'Concluída',
    statusTone: 'emerald',
    assignee: 'plus',
    deadline: '12d atrás',
  },
  {
    type: 'bug',
    project: 'Report Bug',
    comment: 'Busca global dava timeout com acento (ex: “São Paulo”)',
    priority: 'critico',
    status: 'Concluída',
    statusTone: 'emerald',
    assignee: 'plus',
    deadline: '14d atrás',
  },
]

export function HeroReportsMockup() {
  return (
    <div
      className="relative flex min-h-[17rem] w-full overflow-hidden rounded-[inherit] bg-white text-left font-sans antialiased sm:min-h-[22rem] md:min-h-[26rem] lg:min-h-[30rem]"
      style={{ borderColor: border }}
    >
      {/* Sidebar */}
      <aside className="flex w-11 shrink-0 flex-col justify-between border-r border-slate-200 bg-[#f8fafc] py-3 sm:w-14 sm:py-4">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white sm:h-9 sm:w-9" /* text-white kept: on purple bg */
            style={{ backgroundColor: purple }}
          >
            B
          </div>
          <SidebarIcon>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 6h16M4 12h10M4 18h16" />
            </svg>
          </SidebarIcon>
          <SidebarIcon active>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </SidebarIcon>
          <SidebarIcon>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </SidebarIcon>
          <SidebarIcon>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </SidebarIcon>
        </div>
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <SidebarIcon>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </SidebarIcon>
          <SidebarIcon>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          </SidebarIcon>
          <SidebarIcon>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </SidebarIcon>
          <SidebarIcon>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </SidebarIcon>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200 px-2 sm:h-11 sm:px-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">Buug</span>
            <span
              className="rounded border px-1.5 py-px text-[0.5625rem] font-medium sm:text-[0.625rem]"
              style={{ borderColor: `${purple}99`, color: purple }}
            >
              Pro
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className="hidden items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-[0.5625rem] text-slate-600 sm:inline-flex sm:px-3 sm:text-[0.625rem]"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Convidar
            </button>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 sm:h-8 sm:w-8"
              aria-label="Notificações"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </button>
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold tabular-nums text-white sm:h-7 sm:w-7 sm:text-[0.7rem]"
              style={{
                background: `linear-gradient(145deg, ${brandMid} 0%, ${brandHi} 100%)`,
                border: `1px solid ${purple}33`,
                boxShadow: `0 0 0 1px ${purple}22`,
              }}
              aria-hidden
            >
              {demoUserInitial}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-6 pt-3 sm:px-4 sm:pt-4">
          <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg md:text-xl">Reports</h2>
              <p className="mt-0.5 text-[0.625rem] text-slate-400 sm:text-xs">
                Todos os reports recebidos de todos os projetos
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[0.625rem] sm:gap-4 sm:text-xs">
              <span className="text-slate-400">
                <span className="font-semibold text-slate-800">17</span> Total
              </span>
              <span className="text-amber-400/90">
                <span className="font-semibold">6</span> Abertos
              </span>
              <span className="text-red-400/90">
                <span className="font-semibold">1</span> Críticos
              </span>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:gap-2">
            <div className="flex min-h-8 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 sm:min-h-9 sm:px-3">
              <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <span className="truncate text-[0.625rem] text-slate-400 sm:text-xs">
                Buscar por comentário, URL ou projeto...
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {['filter', 'download', 'grid', 'list', 'columns'].map((id) => (
                <button
                  key={id}
                  type="button"
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400',
                    id === 'list' && 'border-slate-300 bg-slate-100 text-slate-600'
                  )}
                  aria-hidden
                >
                  {id === 'filter' && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 6h16M7 12h10M10 18h4" />
                    </svg>
                  )}
                  {id === 'download' && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  )}
                  {id === 'grid' && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  )}
                  {id === 'list' && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  )}
                  {id === 'columns' && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4M9 3v18M9 3h10a2 2 0 012 2v14a2 2 0 01-2 2H9" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <GroupHeader label="Aberto" count={6} accent="amber" />
              <div className="px-1 pb-2 pt-1 sm:px-2">
                <ReportTable rows={abertoRows} />
              </div>
              <div className="border-t border-slate-100 px-3 py-1.5 text-[0.5625rem] text-slate-400 sm:px-4 sm:text-[0.625rem]">
                6/17 reports
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <GroupHeader label="Em andamento" count={1} accent="blue" />
              <div className="px-1 pb-2 pt-1 sm:px-2">
                <ReportTable rows={emAndamentoRows} />
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <GroupHeader label="Sob revisão" count={1} accent="violet" />
              <div className="px-1 pb-2 pt-1 sm:px-2">
                <ReportTable rows={sobRevisaoRows} />
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <GroupHeader label="Concluída" count={3} accent="emerald" />
              <div className="px-1 pb-2 pt-1 sm:px-2">
                <ReportTable rows={concluidaRows} />
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Floating Buug report tab */}
      <div
        className="pointer-events-none absolute right-0 top-1/2 z-10 hidden sm:block"
        style={{ transform: 'translateY(-50%) translateX(45%) rotate(-90deg)' }}
        aria-hidden
      >
        <div
          className="rounded-md border border-purple-200 px-3 py-1 shadow-lg"
          style={{ backgroundColor: purple }}
        >
          <span className="whitespace-nowrap text-[0.5625rem] font-semibold tracking-wide text-white sm:text-[0.625rem]">
            Buug report
          </span>
        </div>
      </div>
    </div>
  )
}
