export interface ClickUpIntegrationConfig {
  enabled: boolean
  encryptedToken: string
  teamId: string
  listId: string
  statusMapBuugToClickUp: Record<string, string>
  statusMapClickUpToBuug: Record<string, string>
  webhookId?: string
  webhookSecret?: string
}

export interface ClickUpTeam {
  id: string
  name: string
}

export interface ClickUpSpace {
  id: string
  name: string
}

export interface ClickUpList {
  id: string
  name: string
  statuses: { status: string; orderindex: number }[]
}

export interface ClickUpTask {
  id: string
  name: string
  status: { status: string }
  url: string
}

export const DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP: Record<string, string> = {
  OPEN: 'to do',
  IN_PROGRESS: 'in progress',
  UNDER_REVIEW: 'in progress',
  RESOLVED: 'complete',
  CANCELLED: 'closed',
}

export const DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG: Record<string, string> = {
  'to do': 'OPEN',
  'in progress': 'IN_PROGRESS',
  complete: 'RESOLVED',
  closed: 'CANCELLED',
}
