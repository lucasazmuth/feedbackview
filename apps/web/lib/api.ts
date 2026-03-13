const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function fetchApi(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  projects: {
    list: (token: string) => fetchApi('/api/projects', token),
    get: (token: string, id: string) => fetchApi(`/api/projects/${id}`, token),
    create: (token: string, data: object) =>
      fetchApi('/api/projects', token, { method: 'POST', body: JSON.stringify(data) }),
    update: (token: string, id: string, data: object) =>
      fetchApi(`/api/projects/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (token: string, id: string) =>
      fetchApi(`/api/projects/${id}`, token, { method: 'DELETE' }),
    feedbacks: (token: string, id: string, params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      return fetchApi(`/api/projects/${id}/feedbacks${qs}`, token)
    },
  },
  feedbacks: {
    get: (token: string, id: string) => fetchApi(`/api/feedbacks/${id}`, token),
    updateStatus: (token: string, id: string, status: string) =>
      fetchApi(`/api/feedbacks/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }),
    submit: (data: object) =>
      fetch(`${API_URL}/api/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
  },
}
