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
