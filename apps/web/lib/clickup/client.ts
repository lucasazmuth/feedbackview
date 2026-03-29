import type {
  ClickUpTeam,
  ClickUpList,
  ClickUpTask,
  ClickUpSpace,
  ClickUpListDetails,
  ClickUpCustomFieldDef,
} from './types'

const BASE = 'https://api.clickup.com/api/v2'
const TIMEOUT_MS = 10_000

class ClickUpError extends Error {
  constructor(
    message: string,
    public status: number | null = null,
    public responseBody: string | null = null,
  ) {
    super(message)
    this.name = 'ClickUpError'
  }
}

async function request<T>(
  path: string,
  token: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { method = 'GET', body } = options
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  const text = await res.text().catch(() => '')

  if (!res.ok) {
    throw new ClickUpError(
      `ClickUp ${method} ${path} → ${res.status}`,
      res.status,
      text.slice(0, 500),
    )
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

export async function getAuthorizedUser(token: string) {
  return request<{ user: { id: number; username: string; email: string } }>('/user', token)
}

export async function getTeams(token: string): Promise<ClickUpTeam[]> {
  const data = await request<{ teams: { id: string; name: string }[] }>('/team', token)
  return data.teams.map(t => ({ id: t.id, name: t.name }))
}

export async function getSpaces(token: string, teamId: string): Promise<ClickUpSpace[]> {
  const data = await request<{ spaces: { id: string; name: string }[] }>(
    `/team/${teamId}/space?archived=false`,
    token,
  )
  return data.spaces.map(s => ({ id: s.id, name: s.name }))
}

export async function getLists(token: string, spaceId: string): Promise<ClickUpList[]> {
  const foldersData = await request<{ folders: { id: string; lists: any[] }[] }>(
    `/space/${spaceId}/folder?archived=false`,
    token,
  )
  const folderlessData = await request<{ lists: any[] }>(
    `/space/${spaceId}/list?archived=false`,
    token,
  )

  const allLists: ClickUpList[] = []
  for (const folder of foldersData.folders) {
    for (const l of folder.lists) {
      allLists.push({
        id: l.id,
        name: l.name,
        statuses: (l.statuses || []).map((s: any) => ({
          status: s.status,
          orderindex: s.orderindex,
        })),
      })
    }
  }
  for (const l of folderlessData.lists) {
    allLists.push({
      id: l.id,
      name: l.name,
      statuses: (l.statuses || []).map((s: any) => ({
        status: s.status,
        orderindex: s.orderindex,
      })),
    })
  }
  return allLists
}

function mapRawCustomField(f: any): ClickUpCustomFieldDef {
  return {
    id: String(f.id),
    name: f.name || '',
    type: (f.type || '').toLowerCase(),
    typeConfig: f.type_config
      ? {
          options: (f.type_config.options || []).map((o: any) => ({
            id: String(o.id),
            name: o.name || '',
            orderindex: o.orderindex,
          })),
        }
      : undefined,
  }
}

export async function getListDetails(token: string, listId: string): Promise<ClickUpListDetails> {
  const data = await request<any>(`/list/${listId}`, token)
  const statuses = (data.statuses || []).map((s: any) => ({
    status: s.status,
    orderindex: s.orderindex,
  }))
  const rawFields = data.custom_fields || data.customFields || []
  const customFields: ClickUpCustomFieldDef[] = Array.isArray(rawFields)
    ? rawFields.map(mapRawCustomField)
    : []

  return {
    id: String(data.id),
    name: data.name || '',
    statuses,
    customFields,
  }
}

export type CreateTaskParams = {
  name: string
  description?: string
  status?: string
  tags?: string[]
  priority?: number | null
  dueDateMs?: number | null
  dueDateTime?: boolean
  customFields?: { id: string; value: string | number }[]
}

export async function createTask(
  token: string,
  listId: string,
  params: CreateTaskParams,
): Promise<ClickUpTask> {
  const body: Record<string, unknown> = {
    name: params.name,
    markdown_description: params.description || '',
  }
  if (params.status) body.status = params.status
  if (params.tags?.length) body.tags = params.tags
  if (params.priority != null && params.priority >= 1 && params.priority <= 4) {
    body.priority = params.priority
  }
  if (params.dueDateMs != null && params.dueDateMs > 0) {
    body.due_date = params.dueDateMs
    body.due_date_time = params.dueDateTime ?? false
  }
  if (params.customFields?.length) {
    body.custom_fields = params.customFields.map(cf => ({ id: cf.id, value: cf.value }))
  }

  return request<ClickUpTask>(`/list/${listId}/task`, token, {
    method: 'POST',
    body,
  })
}

export async function updateTaskStatus(
  token: string,
  taskId: string,
  status: string,
): Promise<ClickUpTask> {
  return request<ClickUpTask>(`/task/${taskId}`, token, {
    method: 'PUT',
    body: { status },
  })
}

export { ClickUpError }
