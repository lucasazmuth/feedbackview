export function normalizeDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return url.toLowerCase().replace(/^www\./, '').replace(/\/$/, '')
  }
}
