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

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

function ownerMsg(msg: string) {
  return msg
}

function memberMsg(msg: string) {
  return msg.replace(/Faça upgrade.*$/, 'Peça ao administrador do workspace para fazer upgrade do plano.')
}

function limitMsg(base: string, role?: Role) {
  if (!role || role === 'OWNER' || role === 'ADMIN') return ownerMsg(base)
  return memberMsg(base)
}

export function checkProjectLimit(usage: Usage, limits: PlanLimits, role?: Role): LimitCheck {
  if (limits.maxProjects === -1) {
    return { allowed: true, current: usage.projectCount, limit: -1 }
  }
  const allowed = usage.projectCount < limits.maxProjects
  return {
    allowed,
    current: usage.projectCount,
    limit: limits.maxProjects,
    reason: allowed ? undefined : limitMsg(`Limite de ${limits.maxProjects} projeto(s) atingido. Faça upgrade para criar mais projetos.`, role),
  }
}

export function checkMemberLimit(usage: Usage, limits: PlanLimits, role?: Role): LimitCheck {
  if (limits.maxMembers === -1) {
    return { allowed: true, current: usage.memberCount, limit: -1 }
  }
  const allowed = usage.memberCount < limits.maxMembers
  return {
    allowed,
    current: usage.memberCount,
    limit: limits.maxMembers,
    reason: allowed ? undefined : limitMsg(`Limite de ${limits.maxMembers} membro(s) atingido. Faça upgrade para convidar mais membros.`, role),
  }
}

export function checkReportLimit(usage: Usage, limits: PlanLimits, role?: Role): LimitCheck {
  if (limits.maxReportsPerMonth === -1) {
    return { allowed: true, current: usage.reportsThisMonth, limit: -1 }
  }
  const allowed = usage.reportsThisMonth < limits.maxReportsPerMonth
  return {
    allowed,
    current: usage.reportsThisMonth,
    limit: limits.maxReportsPerMonth,
    reason: allowed ? undefined : limitMsg(`Limite de ${limits.maxReportsPerMonth} reports/mês atingido. Faça upgrade para reports ilimitados.`, role),
  }
}

export function getUsageWarning(usage: Usage, limits: PlanLimits, role?: Role): string | null {
  // Check if any limit is at 100%
  if (limits.maxProjects !== -1 && usage.projectCount >= limits.maxProjects) {
    return limitMsg(`Limite de projetos atingido (${usage.projectCount}/${limits.maxProjects}). Faça upgrade para criar mais projetos.`, role)
  }
  if (limits.maxReportsPerMonth !== -1 && usage.reportsThisMonth >= limits.maxReportsPerMonth) {
    return limitMsg(`Limite de reports atingido (${usage.reportsThisMonth}/${limits.maxReportsPerMonth}). Faça upgrade para reports ilimitados.`, role)
  }
  // Check if any limit is above 80%
  if (limits.maxProjects !== -1 && usage.projectCount >= limits.maxProjects * 0.8) {
    return limitMsg(`Você está usando ${usage.projectCount} de ${limits.maxProjects} projetos. Faça upgrade antes de atingir o limite.`, role)
  }
  if (limits.maxReportsPerMonth !== -1 && usage.reportsThisMonth >= limits.maxReportsPerMonth * 0.8) {
    return limitMsg(`Você já usou ${usage.reportsThisMonth} de ${limits.maxReportsPerMonth} reports este mês. Faça upgrade para reports ilimitados.`, role)
  }
  return null
}
