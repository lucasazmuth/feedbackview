// @feedbackview/tracker — injected into tested sites via proxy
// Captures console logs, JS errors, network requests, and DOM session replay

import { record } from 'rrweb'

type TrackerMessage = {
  source: 'feedbackview-tracker'
  projectId: string
  type: string
  payload: unknown
  timestamp: number
}

function getProjectId(): string {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[data-project]')
  for (const s of Array.from(scripts)) {
    if (s.dataset.project) return s.dataset.project
  }
  return ''
}

function send(type: string, payload: unknown) {
  const msg: TrackerMessage = {
    source: 'feedbackview-tracker',
    projectId: getProjectId(),
    type,
    payload,
    timestamp: Date.now(),
  }
  try {
    window.parent.postMessage(msg, '*')
  } catch {}
}

// ─── Console interception ──────────────────────────────────────────────────────
const levels = ['log', 'warn', 'error', 'info'] as const
levels.forEach((level) => {
  const original = console[level].bind(console)
  console[level] = (...args: unknown[]) => {
    original(...args)
    // Don't capture tracker's own messages
    if (args[0] === '[feedbackview]') return
    send('CONSOLE_LOG', { level, args: args.map(safeSerialize) })
  }
})

// ─── JS Errors ────────────────────────────────────────────────────────────────
window.onerror = (message, source, lineno, colno, error) => {
  send('JS_ERROR', {
    message: String(message),
    stack: error?.stack,
    source,
    lineno,
    colno,
  })
  return false
}

window.onunhandledrejection = (event) => {
  send('JS_ERROR', {
    message: `Unhandled Promise Rejection: ${event.reason}`,
    stack: event.reason?.stack,
  })
}

// ─── Network interception ─────────────────────────────────────────────────────
const originalFetch = window.fetch.bind(window)
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const start = Date.now()
  const url = String(typeof args[0] === 'string' ? args[0] : (args[0] as Request).url)
  const method = (typeof args[0] === 'object' && 'method' in args[0] ? (args[0] as Request).method : args[1]?.method) || 'GET'
  try {
    const res = await originalFetch(...args)
    send('NETWORK_LOG', { method, url, status: res.status, duration: Date.now() - start })
    return res
  } catch (err: any) {
    send('NETWORK_LOG', { method, url, status: 0, duration: Date.now() - start, error: err.message })
    throw err
  }
}

const OriginalXHR = window.XMLHttpRequest
class TrackedXHR extends OriginalXHR {
  private _method = 'GET'
  private _url = ''
  private _start = 0

  open(method: string, url: string, ...args: any[]) {
    this._method = method
    this._url = url
    return super.open(method, url, ...args)
  }

  send(...args: any[]) {
    this._start = Date.now()
    this.addEventListener('loadend', () => {
      send('NETWORK_LOG', {
        method: this._method,
        url: this._url,
        status: this.status,
        duration: Date.now() - this._start,
      })
    })
    return super.send(...args)
  }
}
;(window as any).XMLHttpRequest = TrackedXHR

// ─── Click breadcrumbs + rage clicks + dead clicks ───────────────────────────
interface ClickBreadcrumb { ts: number; tag: string; text: string; sel: string; x: number; y: number }

const clickBreadcrumbs: ClickBreadcrumb[] = []
const MAX_BREADCRUMBS = 30

function getSelector(el: Element | null): string {
  if (!el || el === document.body || el === document.documentElement) return 'body'
  const parts: string[] = []
  let curr: Element | null = el
  for (let i = 0; i < 3 && curr && curr !== document.body; i++) {
    if (curr.id) { parts.unshift(`#${curr.id}`); break }
    let part = curr.tagName.toLowerCase()
    if (curr.className && typeof curr.className === 'string') {
      const cls = curr.className.trim().split(/\s+/).slice(0, 2).join('.')
      if (cls) part += `.${cls}`
    }
    parts.unshift(part)
    curr = curr.parentElement
  }
  return parts.join(' > ').slice(0, 200)
}

function getElText(el: Element): string {
  return ((el as HTMLElement).innerText || el.textContent || '').trim().slice(0, 50)
}

let pendingDeadClick = false

document.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as Element
  if (!target) return

  const bc: ClickBreadcrumb = {
    ts: Date.now(),
    tag: target.tagName,
    text: getElText(target),
    sel: getSelector(target),
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
  }
  clickBreadcrumbs.push(bc)
  if (clickBreadcrumbs.length > MAX_BREADCRUMBS) clickBreadcrumbs.shift()
  send('CLICK_BREADCRUMB', { breadcrumb: bc })

  // Rage click: 3+ clicks within 800ms in ~30px radius
  const now = bc.ts
  const recent = clickBreadcrumbs.filter(
    (c) => now - c.ts < 800 && Math.abs(c.x - bc.x) < 30 && Math.abs(c.y - bc.y) < 30
  )
  if (recent.length >= 3) {
    send('RAGE_CLICK', { rageClick: { ts: now, count: recent.length, sel: bc.sel, tag: bc.tag, text: bc.text } })
  }

  // Dead click detection
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']
  let el: Element | null = target
  let isInteractive = false
  for (let i = 0; i < 4 && el; i++) {
    if (interactiveTags.includes(el.tagName) || el.getAttribute('role') === 'button' || el.hasAttribute('onclick')) {
      isInteractive = true; break
    }
    try { if (getComputedStyle(el).cursor === 'pointer') { isInteractive = true; break } } catch {}
    el = el.parentElement
  }
  if (!isInteractive && !pendingDeadClick) {
    pendingDeadClick = true
    let mutated = false
    const obs = new MutationObserver(() => { mutated = true })
    obs.observe(document.body, { childList: true, subtree: true, attributes: true })
    setTimeout(() => {
      obs.disconnect()
      pendingDeadClick = false
      if (!mutated) send('DEAD_CLICK', { deadClick: { ts: bc.ts, sel: bc.sel, tag: bc.tag, text: bc.text } })
    }, 1000)
  }
}, true)

// ─── Performance metrics ─────────────────────────────────────────────────────
let perfLCP: number | undefined
let perfCLS = 0
const inpCandidates: number[] = []

try {
  new PerformanceObserver((list) => {
    const entries = list.getEntries()
    if (entries.length > 0) perfLCP = entries[entries.length - 1].startTime
  }).observe({ type: 'largest-contentful-paint', buffered: true })

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) perfCLS += (entry as any).value || 0
    }
  }).observe({ type: 'layout-shift', buffered: true })

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) inpCandidates.push((entry as any).duration || 0)
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as any)
} catch {}

// Send performance metrics periodically (every 10s) so parent has latest data
setInterval(() => {
  let inp: number | undefined
  if (inpCandidates.length > 0) {
    const sorted = [...inpCandidates].sort((a, b) => a - b)
    inp = sorted[Math.min(Math.floor(sorted.length * 0.98), sorted.length - 1)]
  }
  let pageLoadMs: number | undefined
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (nav?.loadEventEnd > 0) pageLoadMs = Math.round(nav.loadEventEnd)
  } catch {}

  send('PERFORMANCE_METRICS', {
    metrics: {
      lcp: perfLCP ? Math.round(perfLCP) : undefined,
      cls: perfCLS > 0 ? Math.round(perfCLS * 1000) / 1000 : undefined,
      inp,
      pageLoadMs,
    },
  })
}, 10000)

// ─── Password masking ─────────────────────────────────────────────────────────
function maskPasswordFields() {
  document.querySelectorAll<HTMLInputElement>('input[type=password]').forEach((el) => {
    if (!el.dataset.feedbackMasked) {
      el.dataset.feedbackMasked = 'true'
    }
  })
}

// ─── Page navigation tracking ─────────────────────────────────────────────────
let lastUrl = location.href
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    send('PAGE_CHANGE', { url: location.href })
  }
}).observe(document, { subtree: true, childList: true })

// ─── rrweb session recording ──────────────────────────────────────────────────
function startRecording() {
  record({
    emit(event) {
      send('RRWEB_EVENT', event)
    },
    maskInputOptions: { password: true },
    blockClass: 'feedback-ignore',
    ignoreClass: 'feedback-ignore',
  })
  maskPasswordFields()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startRecording)
} else {
  startRecording()
}

// Send initial page URL so parent knows the real page
send('PAGE_URL', { url: location.href })

// ─── Screenshot capture (requested by parent) ───────────────────────────────
window.addEventListener('message', async (event) => {
  if (event.data?.type !== 'CAPTURE_SCREENSHOT') return
  try {
    const html2canvas = (await import('html2canvas')).default
    // Capture only the visible viewport, not the entire page
    const canvas = await html2canvas(document.body, {
      scale: 1,
      logging: false,
      useCORS: true,
      allowTaint: true,
      x: window.scrollX,
      y: window.scrollY,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    })
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    window.parent.postMessage({ source: 'feedbackview-tracker', type: 'SCREENSHOT_RESULT', payload: { dataUrl } }, '*')
  } catch (err: any) {
    window.parent.postMessage({ source: 'feedbackview-tracker', type: 'SCREENSHOT_RESULT', payload: { error: err.message } }, '*')
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeSerialize(val: unknown): unknown {
  if (val === null || val === undefined) return val
  if (typeof val === 'string') return val.length > 1000 ? val.slice(0, 1000) + '…' : val
  if (typeof val === 'number' || typeof val === 'boolean') return val
  if (val instanceof Error) return { message: val.message, stack: val.stack }
  try {
    const s = JSON.stringify(val)
    return s.length > 2000 ? '[object too large]' : val
  } catch {
    return String(val)
  }
}
