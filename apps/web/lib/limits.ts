export type Plan = 'FREE' | 'PRO' | 'BUSINESS'

export interface PlanLimits {
  maxReports: number
  /** If true, maxReports is a lifetime total. If false, resets monthly. */
  isLifetimeLimit: boolean
  retentionDays: number
  hasReplay: boolean
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxReports: 10,
    isLifetimeLimit: true,
    retentionDays: 7,
    hasReplay: true,
  },
  PRO: {
    maxReports: 2000,
    isLifetimeLimit: false,
    retentionDays: 90,
    hasReplay: true,
  },
  BUSINESS: {
    maxReports: 10000,
    isLifetimeLimit: false,
    retentionDays: 365,
    hasReplay: true,
  },
}

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE
}

export interface Usage {
  reportsUsed: number
}

export interface LimitCheck {
  allowed: boolean
  reason?: string
  current: number
  limit: number
}

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

function limitMsg(base: string, role?: Role) {
  if (!role || role === 'OWNER' || role === 'ADMIN') return base
  return base.replace(/Faça upgrade.*$/, 'Peça ao administrador do workspace para fazer upgrade do plano.')
}

export function checkReportLimit(usage: Usage, limits: PlanLimits, role?: Role): LimitCheck {
  if (limits.maxReports === -1) {
    return { allowed: true, current: usage.reportsUsed, limit: -1 }
  }
  const allowed = usage.reportsUsed < limits.maxReports
  const periodLabel = limits.isLifetimeLimit ? '' : '/mês'
  return {
    allowed,
    current: usage.reportsUsed,
    limit: limits.maxReports,
    reason: allowed ? undefined : limitMsg(`Limite de ${limits.maxReports} reports${periodLabel} atingido. Faça upgrade para continuar reportando.`, role),
  }
}

export function getUsageWarning(usage: Usage, limits: PlanLimits, role?: Role): string | null {
  if (limits.maxReports === -1) return null
  const periodLabel = limits.isLifetimeLimit ? '' : ' este mês'
  if (usage.reportsUsed >= limits.maxReports) {
    return limitMsg(`Limite de reports atingido (${usage.reportsUsed}/${limits.maxReports}). Faça upgrade para continuar reportando.`, role)
  }
  if (usage.reportsUsed >= limits.maxReports * 0.8) {
    return limitMsg(`Você já usou ${usage.reportsUsed} de ${limits.maxReports} reports${periodLabel}. Faça upgrade para não perder reports.`, role)
  }
  return null
}

/** Returns usage percentage (0-100). Returns -1 for unlimited plans. */
export function getReportsUsagePercent(usage: Usage, limits: PlanLimits): number {
  if (limits.maxReports === -1) return -1
  return Math.min(100, Math.round((usage.reportsUsed / limits.maxReports) * 100))
}
