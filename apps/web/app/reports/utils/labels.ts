export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function parseUserAgent(ua: string): { os: string; browser: string } {
  let os = 'Desconhecido'
  let browser = 'Desconhecido'
  if (ua.includes('Mac OS X')) { const v = ua.match(/Mac OS X ([\d_.]+)/); os = 'macOS ' + (v ? v[1].replace(/_/g, '.') : '') }
  else if (ua.includes('Windows NT')) { const v = ua.match(/Windows NT ([\d.]+)/); const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }; os = 'Windows ' + (v ? (map[v[1]] || v[1]) : '') }
  else if (ua.includes('Android')) { const v = ua.match(/Android ([\d.]+)/); os = 'Android ' + (v ? v[1] : '') }
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('iPhone') || ua.includes('iPad')) { const v = ua.match(/OS ([\d_]+)/); os = 'iOS ' + (v ? v[1].replace(/_/g, '.') : '') }
  if (ua.includes('Edg/')) { const v = ua.match(/Edg\/([\d.]+)/); browser = 'Edge ' + (v ? v[1] : '') }
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) { const v = ua.match(/Chrome\/([\d.]+)/); browser = 'Chrome ' + (v ? v[1] : '') }
  else if (ua.includes('Firefox/')) { const v = ua.match(/Firefox\/([\d.]+)/); browser = 'Firefox ' + (v ? v[1] : '') }
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) { const v = ua.match(/Version\/([\d.]+)/); browser = 'Safari ' + (v ? v[1] : '') }
  return { os, browser }
}

export type TagVariant = 'brand' | 'danger' | 'warning' | 'success' | 'neutral' | 'info'

const TAG_COLORS: Record<TagVariant, { bg: string; color: string }> = {
  danger:  { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' },
  warning: { bg: 'rgba(234, 179, 8, 0.15)',  color: '#facc15' },
  success: { bg: 'rgba(34, 197, 94, 0.15)',  color: '#4ade80' },
  info:    { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  brand:   { bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' },
  neutral: { bg: 'rgba(255, 255, 255, 0.06)', color: '#9ca3af' },
}

/** Returns background + text color for a tag value (e.g. 'BUG', 'OPEN'). */
export function getTagColors(value: string): { bg: string; color: string } {
  return TAG_COLORS[getTagVariant(value)] || TAG_COLORS.neutral
}

export function getTagVariant(value: string): TagVariant {
  const map: Record<string, TagVariant> = {
    BUG: 'danger',
    SUGGESTION: 'info',
    QUESTION: 'warning',
    PRAISE: 'success',
    CRITICAL: 'danger',
    HIGH: 'danger',
    MEDIUM: 'warning',
    LOW: 'neutral',
    OPEN: 'warning',
    IN_PROGRESS: 'info',
    UNDER_REVIEW: 'brand',
    RESOLVED: 'success',
    CANCELLED: 'danger',
    CLOSED: 'neutral',
  }
  return map[value] || 'neutral'
}

export function getTypeLabel(type: string) {
  const map: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
  return map[type] || type
}

export function getStatusLabel(status: string) {
  const map: Record<string, string> = { OPEN: 'Aberto', IN_PROGRESS: 'Em andamento', UNDER_REVIEW: 'Sob revisão', RESOLVED: 'Concluída', CANCELLED: 'Cancelado' }
  return map[status] || status
}

export function getSeverityLabel(sev: string) {
  const map: Record<string, string> = { CRITICAL: 'Crítico', HIGH: 'Alto', MEDIUM: 'Médio', LOW: 'Baixo' }
  return map[sev] || sev
}

// Severity weights for sorting
export const SEVERITY_WEIGHT: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

// Status workflow order for sorting
export const STATUS_ORDER: Record<string, number> = { OPEN: 1, IN_PROGRESS: 2, UNDER_REVIEW: 3, RESOLVED: 4, CANCELLED: 5, ARCHIVED: 6 }

// Kanban-visible statuses (ordered)
export const KANBAN_STATUSES = ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'RESOLVED'] as const

// All manageable statuses
export const ALL_STATUSES = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'UNDER_REVIEW', label: 'Sob revisão' },
  { value: 'RESOLVED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelado' },
] as const

export const ALL_TYPES = [
  { value: 'BUG', label: 'Bug' },
  { value: 'SUGGESTION', label: 'Sugestão' },
  { value: 'QUESTION', label: 'Dúvida' },
  { value: 'PRAISE', label: 'Elogio' },
] as const

export const ALL_SEVERITIES = [
  { value: 'CRITICAL', label: 'Crítico' },
  { value: 'HIGH', label: 'Alto' },
  { value: 'MEDIUM', label: 'Médio' },
  { value: 'LOW', label: 'Baixo' },
] as const
