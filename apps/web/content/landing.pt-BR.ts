/**
 * Copy da landing (PT-BR). Fonte única para marketing da home.
 * Skill: .cursor/skills/landing-copy-br (no repo feedback_view)
 */

/** SEO da home; alinhado ao tom de `landingHero` */
export const landingMeta = {
  title: 'Buug: Bug report com sessão gravada',
  description:
    'Link de teste ou botão no site: relatório com gravação, tela, console, rede e Web Vitals. Homologação sem código; produção com uma linha. API, webhooks, ClickUp e exportação filtrada nos planos Pro e Business.',
  openGraphTitle: 'Buug: Bug no site? Você vê o que a pessoa fez e o registro técnico',
  openGraphDescription:
    'Quem reporta clica; seu time recebe sessão gravada, logs e métricas de carregamento num relatório. Pro e Business: API, webhooks, ClickUp e exportação filtrada.',
  twitterTitle: 'Buug: Bug report com sessão gravada',
  twitterDescription:
    'Link ou botão no site. Gravação, tela, console, rede e Web Vitals juntos. API e webhooks nos planos pagos ativos.',
} as const

export type LandingFeatureItem = {
  iconKey: string
  title: string
  description: string
}

export type LandingFaqItem = { question: string; answer: string }

export type LandingTestimonialItem = {
  quote: string
  name: string
  role: string
  rating: number
}

export type LandingNavItem = { label: string; href: string }

export const landingViewerUrl = 'https://buug.io/p/seu-projeto-id'

export const landingEmbedSnippet =
  '<script src="https://buug.io/embed.js"\n  data-project="SEU_PROJECT_ID">\n</script>'

export const landingNavLinks: LandingNavItem[] = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Stacks', href: '#stacks' },
  { label: 'Planos', href: '#planos' },
  { label: 'API e integrações', href: '#integracoes-pro' },
  { label: 'Avaliações', href: '#avaliacoes' },
  { label: 'FAQ', href: '#faq' },
]

export const landingAuth = {
  panel: 'Painel',
  login: 'Entrar',
  signupFree: 'Começar grátis',
  accessPanel: 'Acessar Painel',
  createFreeAccount: 'Criar conta grátis',
  alreadyHaveAccount: 'Já tenho conta',
} as const

export const landingHero = {
  tag: 'Bug report com sessão gravada',
  /** Duas linhas fixas no hero; linhas curtas para não quebrar de novo no meio */
  h1Line1: 'Veja exatamente o bug',
  h1Line2: 'que o usuário encontrou.',
  sub:
    'Replay da sessão, console, rede e Web Vitals no mesmo relatório. Sem pedir print, sem adivinhar.',
  /** Selo sobre a animação do hero; gravação contínua para o relatório */
  liveCaptureLabel: 'Capturando ao vivo',
  ctaHow: 'Ver como funciona',
  proofItems: [
    'Grátis para começar',
    'No ar em minutos',
    'Sem cartão de crédito',
  ],
} as const

/** Destaques factuais (sem números inventados); `value` é o título em destaque na barra */
export const landingMetrics: { value: string; label: string }[] = [
  { value: 'Replay', label: 'Reproduz a sessão sem pedir passo a passo de novo' },
  { value: 'Web Vitals', label: 'LCP, CLS e INP ao lado do erro e dos logs' },
  { value: 'Link ou embed', label: 'Staging sem deploy ou botão no site público' },
  { value: 'Pro & Business', label: 'API Bearer, webhooks, ClickUp e CSV/XLSX filtrado' },
]

/** Carrossel “Como funciona” + textos do mock */
export const landingFlow = {
  sectionTag: 'Como funciona',
  sectionTitle: 'No painel, tudo chega em um só lugar',
  sectionLead:
    'Lista de reports, busca e prioridades: a visão do time depois do envio pelo widget (que você vê no topo da página). Abaixo, do projeto a essa triagem em quatro ideias.',
  stepLabels: ['Projeto', 'No site', 'Relato', 'Painel'],
  browserUrls: [
    'buug.io/criar-projeto',
    'meusite.com.br',
    'meusite.com.br',
    'buug.io/projects/meu-ecommerce',
  ],
  titles: [
    'Projeto criado: link ou script, você escolhe.',
    'Widget leve: quem navega manda quando travar.',
    'Um envio: replay, vitals, logs e tela fechados.',
    'Painel único: triagem, status e histórico.',
  ],
  descriptions: [
    'URL do site, modo de integração e pronto. Nada de sprint só para “ativar o coletor”.',
    'Captura, replay e métricas rodam em silêncio. Quem reporta só clica e descreve.',
    'O time de produto ou dev abre e já enxerga o que aconteceu, sem pedir mais evidência.',
    'Bug, sugestão ou crítica com severidade e rastro. E-commerce, SaaS interno ou entrega para cliente.',
  ],
} as const

/** Só o essencial para venda; integrações e export ficam em planos/FAQ */
export const landingFeatures: LandingFeatureItem[] = [
  {
    iconKey: 'replay',
    title: 'Session replay',
    description: 'Play e veja o caminho até o bug. Sem pedir “passo a passo” de novo.',
  },
  {
    iconKey: 'vitals',
    title: 'Web Vitals',
    description: 'LCP, CLS e INP junto ao erro. Performance ou lógica: resposta na primeira leitura.',
  },
  {
    iconKey: 'logs',
    title: 'Console e rede',
    description: 'Stack JS, requests falhando e screenshot juntos. Um lugar, quadro completo.',
  },
  {
    iconKey: 'bolt',
    title: 'Setup em minutos',
    description: 'Link de teste ou uma linha de script. Sem SDK pesado.',
  },
]

export const landingSteps: { number: string; title: string; description: string }[] = [
  {
    number: '1',
    title: 'Cria o projeto',
    description: 'URL do sistema, modo link ou embed. Em poucos minutos o coletor está definido.',
  },
  {
    number: '2',
    title: 'Compartilha o acesso',
    description: 'QA e stakeholders pelo link de teste; ou script no ar e o botão fica público.',
  },
  {
    number: '3',
    title: 'Triagem com contexto',
    description:
      'Cada ticket traz replay, vitals, logs e sinais de frustração na UI. Pro e Business: API, webhooks, ClickUp e planilha.',
  },
]

export const landingFaqs: LandingFaqItem[] = [
  {
    question: 'Tem gratuito mesmo ou é pegadinha?',
    answer:
      'Tem sim. Dez relatórios no total, sem cartão: link ou widget, painel e pacote completo de captura. API com chave, webhooks, ClickUp e exportação filtrada ficam em Pro e Business com assinatura ativa.',
  },
  {
    question: 'Como funciona esse replay?',
    answer:
      'Gravamos interação com rrweb (clique, scroll, tecla). Na hora de debugar você dá play e vê a sequência. Isso mata a dependência de print gigante e do “não sei reproduzir”.',
  },
  {
    question: 'Preciso publicar código no site?',
    answer:
      'Só se quiser o widget. O modo link não mexe no deploy: a pessoa abre a URL de teste e envia dali.',
  },
  {
    question: 'Dado de usuário vaza?',
    answer:
      'Senha e campos sensíveis são mascarados. Tráfego e armazenamento com criptografia, alinhado a LGPD e boas práticas.',
  },
  {
    question: 'Rola com React, Next, Vue?',
    answer:
      'Rola com qualquer coisa que rode no navegador. O script não escolhe framework. O link vale pra qualquer URL.',
  },
  {
    question: 'Quantas pessoas entram no workspace?',
    answer:
      'Ilimitado em qualquer plano. O que muda é volume de relatório: dez no free; nos pagos, teto mensal que renova.',
  },
  {
    question: 'A API faz o quê?',
    answer:
      'HTTPS com Bearer: lista projetos e relatórios, atualiza status e prazo. Integra com CI, n8n ou sistema próprio. Chave e uso exigem Pro ou Business ativo.',
  },
  {
    question: 'Webhook é como?',
    answer:
      'Você cadastra URL; mandamos POST em JSON em evento (novo relatório, mudança de status…). Valida com HMAC no header X-Buug-Signature. Pro ou Business ativo.',
  },
  {
    question: 'ClickUp sincroniza o quê?',
    answer:
      'Com token da API, automação por projeto: lista ou espaço, tarefa aberta a partir do relatório, status Buug e ClickUp conversando. Plano pago ativo.',
  },
  {
    question: 'Consigo jogar isso no Excel?',
    answer:
      'Sim. Reports → exporta o conjunto filtrado em CSV ou .xlsx. Mesma regra das integrações avançadas: Pro ou Business ativo.',
  },
]

export const landingFeaturesSection = {
  tag: 'Funcionalidades',
  title: 'Tudo no mesmo relatório',
  sub: 'Replay, Vitals, logs e rede no mesmo envio. API, webhooks e export vêm nos planos pagos.',
} as const

export const landingThreeStepsSection = {
  tag: 'Resumo',
  title: 'Três passos, zero manual grosso.',
} as const

export const landingIntegrationSection = {
  tag: 'Integração',
  title: 'Homologação por link ou botão no site',
  sub: 'O mesmo projeto aceita os dois: link para quem testa staging e script quando você quer feedback em produção.',
  linkCard: {
    title: 'Link compartilhado',
    badge: 'Sem deploy',
    body: 'QA ou cliente abre a URL de teste e envia dali. Zero commit só para coletar relatório.',
    tagsInclude: ['✓ Tela', '✓ Console', '✓ Rede'] as string[],
    tagsExclude: ['✗ Replay da sessão'] as string[],
  },
  embedCard: {
    title: 'Script no site',
    badge: 'Uma linha',
    body: 'Cola no layout: botão visível, captura completa com replay e vitals para quem usa o site.',
    tagsInclude: ['✓ Tela', '✓ Console', '✓ Rede', '✓ Replay da sessão'] as string[],
  },
} as const

/** Depoimentos ilustrativos (personas fictícias; ver `disclaimer` na seção) */
export const landingTestimonialsSection = {
  tag: 'Avaliações',
  title: 'Quem manda relatório, seu time agradece',
  sub: 'Menos “consegue reproduzir?” e mais contexto na primeira abertura.',
  disclaimer:
    'Personas e falas de exemplo para ilustrar o uso; não são depoimentos de clientes reais.',
} as const

export const landingTestimonials: LandingTestimonialItem[] = [
  {
    rating: 5,
    name: 'Rafaela M.',
    role: 'PM, e-commerce',
    quote:
      'Antes era print no WhatsApp e três dias até alguém entender o fluxo. Com replay e prioridade no mesmo card, o dev já abre sabendo onde olhar.',
  },
  {
    rating: 5,
    name: 'Guilherme T.',
    role: 'Desenvolvedor front-end',
    quote:
      'Console e rede no mesmo relatório que a sessão. Parei de pedir extensão ou “abre o DevTools e manda foto”.',
  },
  {
    rating: 5,
    name: 'Camila R.',
    role: 'Líder de QA',
    quote:
      'O link de homologação salvou: stakeholder testa sem commit meu. Quando quebra, o pacote chega fechado.',
  },
]

export const landingProSection = {
  tag: 'Integrações',
  title: 'Conecta com o que você já usa',
  sub: 'Bug vira tarefa, evento ou planilha, sem copiar e colar. Planos Pro e Business.',
  cards: [
    {
      iconKey: 'plug',
      title: 'API REST',
      body: 'Endpoints para ler e atualizar relatórios. Bearer token, rate limit, docs na app.',
      label: 'Automação',
    },
    {
      iconKey: 'bolt',
      title: 'Webhooks',
      body: 'POST assinado no seu endpoint quando algo muda. Valide com HMAC.',
      label: 'Tempo real',
    },
    {
      iconKey: 'clickup',
      title: 'ClickUp',
      body: 'Tarefa nasce do relatório. Status sincroniza entre Buug e quadro.',
      label: 'Gestão',
    },
    {
      iconKey: 'download',
      title: 'Exportação',
      body: 'CSV ou XLSX do que você filtrou em Reports. Mesmo recorte da tela.',
      label: 'Dados',
    },
  ],
} as const

export const landingTechStack = [
  { name: 'React', logo: '/logos/react.svg' },
  { name: 'Next.js', logo: '/logos/nextjs.svg' },
  { name: 'Vue.js', logo: '/logos/vue.svg' },
  { name: 'Angular', logo: '/logos/angular.svg' },
  { name: 'Svelte', logo: '/logos/svelte.svg' },
  { name: 'HTML/JS', logo: '/logos/html.svg' },
  { name: 'Flutter', logo: '/logos/flutter.svg' },
] as const

export const landingPlatformsSection = {
  tag: 'Multiplataforma',
  title: 'Roda onde há navegador',
  sub: 'Next.js, Flutter, React, Vue, Angular ou HTML puro: o script não escolhe framework. O modo link vale para qualquer URL aberta no browser.',
  footnote: 'E-commerce, SaaS, intranet ou landing estática: se renderiza no cliente, o pacote de contexto segue igual.',
} as const

export const landingComparisonSection = {
  tag: 'Comparativo',
  title: 'O pacote Buug vs. “só print”',
  sub: 'Além da captura: Web Vitals, rage/dead clicks, trilha e contexto de aparelho, mais homologação por link sem tocar no repo. Camada paga quando você quiser API, webhooks e ClickUp.',
  tableHeaders: {
    feature: 'Funcionalidade',
    buug: 'Buug',
    others: 'Outras soluções',
  },
  rows: [
    { feature: 'Captura de tela automática', buug: true, others: true },
    { feature: 'Replay da sessão', buug: true, others: true },
    { feature: 'Logs de console e rede', buug: true, others: true },
    { feature: 'Core Web Vitals (LCP, CLS, INP)', buug: true, others: false },
    { feature: 'Cliques frustrados (rage e dead)', buug: true, others: false },
    { feature: 'Trilha de cliques (breadcrumbs)', buug: true, others: false },
    { feature: 'Aparelho, rede e contexto', buug: true, others: false },
    { feature: 'Link de homologação (sem alterar código)', buug: true, others: false },
    { feature: 'API, webhooks e ClickUp (planos pagos)', buug: true, others: false },
    { feature: 'Produto e suporte em português', buug: true, others: false },
  ],
} as const

export const landingPricingSection = {
  tag: 'Planos',
  title: 'Preço claro, em reais',
  sub: 'Começa no free com o pacote completo de captura até o teto de relatórios. Volume maior? Pro e Business liberam API, webhooks, ClickUp e exportação com assinatura ativa.',
  period: '/mês',
  free: {
    name: 'Gratuito',
    blurb: 'Pra validar ideia, MVP ou uso pessoal.',
    bullets: [
      '10 relatórios no total',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Captura de tela + replay da sessão',
      'Logs de console e rede',
      'Sem API, webhooks, ClickUp nem exportação CSV/Excel',
      'Retenção de 7 dias',
      'Suporte por e-mail',
    ],
    cta: 'Começar grátis',
  },
  pro: {
    name: 'Pro',
    popularLabel: 'Popular',
    blurb: 'Time de produto, dev e QA no ritmo do mês.',
    bullets: [
      '2.000 relatórios por mês',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Exportar filtrado em CSV ou Excel (com assinatura ativa)',
      'API REST, webhooks e ClickUp (com assinatura ativa)',
      'Captura de tela + replay da sessão',
      'Console, rede e logs customizados',
      'Retenção de 90 dias',
      'Suporte por e-mail',
    ],
    cta: 'Fazer upgrade',
  },
  business: {
    name: 'Business',
    blurb: 'Agência, softhouse ou operação com muito volume.',
    bullets: [
      '10.000 relatórios por mês',
      'Projetos ilimitados',
      'Membros ilimitados',
      'Exportar filtrado em CSV ou Excel (com assinatura ativa)',
      'API REST, webhooks e ClickUp (com assinatura ativa)',
      'Captura de tela + replay da sessão',
      'Console, rede e logs customizados',
      'Retenção de 1 ano',
      'Suporte prioritário',
    ],
    cta: 'Fazer upgrade',
  },
} as const

export const landingFaqSection = {
  tag: 'FAQ',
  title: 'Perguntas frequentes',
  sub: 'Plano, técnica, segurança e LGPD, direto ao ponto.',
} as const

export const landingCtaSection = {
  title: 'Pare de debugar no escuro',
  sub: 'Replay, vitals e logs no mesmo envio. Conta grátis, sem cartão.',
  trust: ['Sem cartão', 'No ar em minutos', 'Cancele quando quiser'],
} as const

export const landingFooter = {
  blurb:
    'Feedback técnico com replay, Core Web Vitals, console e rede. Pro e Business: API, webhooks, ClickUp e exportação filtrada.',
  productHeading: 'Produto',
  productLinks: [
    { label: 'Funcionalidades', href: '#funcionalidades' },
    { label: 'Widget e link', href: '#integracao' },
    { label: 'API e integrações', href: '#integracoes-pro' },
    { label: 'Avaliações', href: '#avaliacoes' },
    { label: 'Planos', href: '#planos' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Ver fluxo', href: '#como-funciona' },
  ],
  companyHeading: 'Empresa',
  companyLinks: [{ label: 'Contato', href: '/contato' }],
  legalHeading: 'Legal',
  legalLinks: [
    { label: 'Termos de Uso', href: '/termos' },
    { label: 'Privacidade', href: '/privacidade' },
  ],
  copyright: 'Buug. Todos os direitos reservados.',
  badges: ['LGPD', 'SSL', 'Dados criptografados'],
} as const

/** Textos dentro dos mocks animados da dobra “Como funciona” (alinhados às telas reais da app) */
export const landingDemo = {
  step0: {
    backLabel: 'Projetos',
    crumbLabel: 'Novo Projeto',
    stepperSite: 'Site',
    stepperIntegration: 'Integração',
    stepperData: 'Dados',
    stepperWidget: 'Widget',
    heading: 'Qual site você quer monitorar?',
    lead: 'Cole o endereço do seu site, aquele que aparece na barra do navegador.',
    urlSample: 'meusite.com.br',
    urlHint: 'Ex: meusite.com.br, minhaloja.shopify.com, app.meuservico.com',
    continueLabel: 'Continuar',
  },
  step1: {
    widgetCta: 'Reportar Bug',
    nav: ['Home', 'Produtos', 'Pedidos'],
    dashboardTitle: 'Painel',
    dashboardSub: 'Visão geral da loja',
    rangeLabel: 'Últimos 30 dias',
    kpiVisitors: 'Visitantes',
    kpiConversion: 'Conversão',
    kpiRevenue: 'Receita',
    chartTitle: 'Vendas por dia',
    tableHeaders: ['Produto', 'Vendas', 'Receita'],
  },
  /** Mock alinhado a `components/viewer/FeedbackModal.tsx` (Novo report) */
  step2: {
    modalTitle: 'Reportar Bug',
    headerDate: '31 de mar. de 2026, 23:20',
    tabReplay: 'Replay',
    tabScreenshot: 'Screenshot',
    replayCaption: 'Um envio: replay, vitals, logs e tela fechados.',
    replayCurrent: '0:09',
    replayTotal: '0:17',
    descriptionLabel: 'Descrição',
    descriptionPlaceholder:
      'Descreva o problema ou sugestão em detalhes… (mínimo 10 caracteres)',
    descriptionSample: '',
    typeLabel: 'Tipo',
    typeLabels: ['Bug', 'Sugestão', 'Dúvida', 'Elogio'] as const,
    priorityLabel: 'Prioridade',
    priorityLabels: ['Baixa', 'Média', 'Alta', 'Crítica'] as const,
    priorityColors: ['#22c55e', '#f59e0b', '#f97316', '#ef4444'] as const,
    activePriorityIndex: 1,
    sidebarBrowser: 'Chrome 142.0.7444.265',
    sidebarOs: 'macOS 10.15.7',
    sidebarViewport: '1052 × 894',
    sidebarSource: 'Widget embed',
    pageOpen: 'Abrir',
    consoleSummary: '0 logs',
    networkSummary: '0 req.',
    submitCta: 'Enviar Bug',
    poweredBy: 'Powered by Buug',
  },
  step3: {
    projectName: 'Meu e-commerce',
    displayUrl: 'https://meusite.com.br',
    connectionPill: 'Conectado',
    tabs: ['Reports', 'Histórico', 'Configurações'],
    statTotal: 'Total',
    statOpen: 'Abertos',
    statResolved: 'Concluídas',
    rows: [
      {
        type: 'Bug',
        typeBg: '#fef2f2',
        typeC: '#dc2626',
        desc: 'Botão de pagamento não funciona',
        sev: 'Alta',
        sevBg: '#fef2f2',
        sevC: '#dc2626',
        st: 'Aberto',
        stBg: '#fefce8',
        stC: '#a16207',
      },
      {
        type: 'Bug',
        typeBg: '#fef2f2',
        typeC: '#dc2626',
        desc: 'Imagem quebrada na página de produto',
        sev: 'Média',
        sevBg: '#fefce8',
        sevC: '#a16207',
        st: 'Aberto',
        stBg: '#fefce8',
        stC: '#a16207',
      },
      {
        type: 'Bug',
        typeBg: '#fef2f2',
        typeC: '#dc2626',
        desc: 'Carrinho não atualiza quantidade',
        sev: 'Alta',
        sevBg: '#fef2f2',
        sevC: '#dc2626',
        st: 'Em andamento',
        stBg: '#dbeafe',
        stC: '#1d4ed8',
      },
      {
        type: 'Sugestão',
        typeBg: '#ede9fe',
        typeC: '#7c3aed',
        desc: 'Adicionar modo escuro',
        sev: 'Baixa',
        sevBg: '#f3f4f6',
        sevC: '#6b7280',
        st: 'Resolvido',
        stBg: '#ecfdf5',
        stC: '#059669',
      },
    ],
  },
} as const
