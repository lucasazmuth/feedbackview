/**
 * Tamanhos de ícones (viewBox 24×24) — padrão da plataforma Buug.
 * Use `AppIcon` ou estes valores em Lucide (`size={ICON_PX.md}`).
 */
export const ICON_PX = {
  /** Controles muito densos, badges */
  xs: 12,
  /** Linhas secundárias, timeline compacta, tabs densas */
  sm: 14,
  /** Sidebar rail colapsada (encaixe ótimo no hit target 32px) */
  navCollapsed: 15,
  /** Padrão: nav expandida, botões com texto, listas, inputs */
  md: 16,
  /** Header (hit 36px), destaque leve */
  lg: 18,
  /** Cards vazios, hero de seção */
  xl: 20,
  /** Modais, ilustrações de estado */
  xxl: 24,
} as const

export type IconSizeName = keyof typeof ICON_PX

/** Traço único para ícones outline (alinhado à shell: Sidebar, PageHeader) */
export const ICON_STROKE = {
  default: 1.5,
  emphasis: 2,
} as const

/** Tamanho padrão para ícones Lucide no app */
export const LUCIDE_ICON_PX = ICON_PX.md
