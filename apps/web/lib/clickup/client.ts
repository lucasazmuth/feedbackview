import type { ClickUpTeam, ClickUpList, ClickUpTask, ClickUpSpace } from './types'

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

export async function createTask(
  token: string,
  listId: string,
  params: {
    name: string
    description?: string
    status?: string
    tags?: string[]
  },
): Promise<ClickUpTask> {
  return request<ClickUpTask>(`/list/${listId}/task`, token, {
    method: 'POST',
    body: {
      name: params.name,
      markdown_description: params.description || '',
      status: params.status,
      tags: params.tags,
    },
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
