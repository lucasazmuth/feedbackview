export type Plan = 'FREE' | 'PRO' | 'BUSINESS'

export interface PlanLimits {
  maxProjects: number
  maxMembers: number
  maxReportsPerMonth: number
  retentionDays: number
  hasReplay: boolean
  hasIntegrations: boolean
  hasWhiteLabel: boolean
  hasApi: boolean
}

const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxProjects: 1,
    maxMembers: 1,
    maxReportsPerMonth: 50,
    retentionDays: 7,
    hasReplay: false,
    hasIntegrations: false,
    hasWhiteLabel: false,
    hasApi: false,
  },
  PRO: {
    maxProjects: 5,
    maxMembers: 10,
    maxReportsPerMonth: -1, // unlimited
    retentionDays: 90,
    hasReplay: true,
    hasIntegrations: true,
    hasWhiteLabel: false,
    hasApi: false,
  },
  BUSINESS: {
    maxProjects: -1, // unlimited
    maxMembers: 50,
    maxReportsPerMonth: -1, // unlimited
    retentionDays: 365,
    hasReplay: true,
    hasIntegrations: true,
    hasWhiteLabel: true,
    hasApi: true,
  },
}

export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE
}

export interface Usage {
  projectCount: number
  memberCount: number
  reportsThisMonth: number
}

export interface LimitCheck {
  allowed: boolean
  reason?: string
  current: number
  limit: number
}

export function checkProjectLimit(usage: Usage, limits: PlanLimits): LimitCheck {
  if (limits.maxProjects === -1) {
    return { allowed: true, current: usage.projectCount, limit: -1 }
  }
  const allowed = usage.projectCount < limits.maxProjects
  return {
    allowed,
    current: usage.projectCount,
    limit: limits.maxProjects,
    reason: allowed ? undefined : `Limite de ${limits.maxProjects} projeto(s) atingido. Faça upgrade para criar mais projetos.`,
  }
}

export function checkMemberLimit(usage: Usage, limits: PlanLimits): LimitCheck {
  if (limits.maxMembers === -1) {
    return { allowed: true, current: usage.memberCount, limit: -1 }
  }
  const allowed = usage.memberCount < limits.maxMembers
  return {
    allowed,
    current: usage.memberCount,
    limit: limits.maxMembers,
    reason: allowed ? undefined : `Limite de ${limits.maxMembers} membro(s) atingido. Faça upgrade para convidar mais membros.`,
  }
}

export function checkReportLimit(usage: Usage, limits: PlanLimits): LimitCheck {
  if (limits.maxReportsPerMonth === -1) {
    return { allowed: true, current: usage.reportsThisMonth, limit: -1 }
  }
  const allowed = usage.reportsThisMonth < limits.maxReportsPerMonth
  return {
    allowed,
    current: usage.reportsThisMonth,
    limit: limits.maxReportsPerMonth,
    reason: allowed ? undefined : `Limite de ${limits.maxReportsPerMonth} reports/mês atingido. Faça upgrade para reports ilimitados.`,
  }
}
