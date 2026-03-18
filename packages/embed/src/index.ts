// @feedbackview/embed — standalone feedback widget
// Injected via <script src="https://buug.io/embed.js" data-project="ID"></script>
// Collects console, network, errors, rrweb session replay + shows feedback UI

import { record, Replayer } from 'rrweb'

// ─── Config ──────────────────────────────────────────────────────────────────
const SCRIPT_EL = (document.currentScript as HTMLScriptElement | null)
  || document.querySelector('script[src*="embed.js"][data-project]') as HTMLScriptElement | null
const PROJECT_ID = SCRIPT_EL?.dataset.project || ''
const API_BASE = SCRIPT_EL?.dataset.api || SCRIPT_EL?.src.replace(/\/embed\.js.*$/, '') || ''

if (!PROJECT_ID) {
  console.warn('[FeedbackView] Missing data-project attribute on embed script.')
}

// ─── Widget config (fetched from server) ────────────────────────────────────
interface WidgetConfig {
  widgetPosition: string
  widgetColor: string
  widgetStyle: 'text' | 'icon'
  blocked?: boolean
  paused?: boolean
  limitReached?: boolean
}

const DEFAULT_CONFIG: WidgetConfig = {
  widgetPosition: 'middle-right',
  widgetColor: '#4f46e5',
  widgetStyle: 'text',
}

// ─── Data collection ─────────────────────────────────────────────────────────
interface ConsoleLog { level: string; args: unknown[]; timestamp: number }
interface NetworkLog { method: string; url: string; status: number; duration: number }
interface RRWebEvent { type: number; data: any; timestamp: number }

const consoleLogs: ConsoleLog[] = []
const networkLogs: NetworkLog[] = []
const rrwebEvents: RRWebEvent[] = []
const MAX_RRWEB_EVENTS = 100
const MAX_LOGS = 100
let proxyPageUrl: string | null = null // URL of the actual site in proxy/shared-url mode

// ─── Enhanced session capture ────────────────────────────────────────────────
interface ClickBreadcrumb { ts: number; tag: string; text: string; sel: string; x: number; y: number }
interface RageClick { ts: number; count: number; sel: string; tag: string; text: string }
interface DeadClick { ts: number; sel: string; tag: string; text: string }

const clickBreadcrumbs: ClickBreadcrumb[] = []
const rageClicks: RageClick[] = []
const deadClicks: DeadClick[] = []
const MAX_BREADCRUMBS = 30
const MAX_RAGE_CLICKS = 10
const MAX_DEAD_CLICKS = 10

// Performance metrics (collected via PerformanceObserver)
let perfLCP: number | undefined
let perfCLS = 0
let perfINP: number | undefined
const inpCandidates: number[] = []

// Selector generation: build short CSS path (max 3 levels)
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
  const text = (el as HTMLElement).innerText || el.textContent || ''
  return text.trim().slice(0, 50)
}

// Click breadcrumbs + rage click detection
document.addEventListener('click', (e: MouseEvent) => {
  const target = e.target as Element
  if (!target) return
  // Ignore clicks inside our own widget
  if (target.closest?.('[data-feedbackview-host]')) return

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

  // Rage click detection: 3+ clicks within 800ms in ~30px radius
  const now = bc.ts
  const recent = clickBreadcrumbs.filter(
    (c) => now - c.ts < 800 && Math.abs(c.x - bc.x) < 30 && Math.abs(c.y - bc.y) < 30
  )
  if (recent.length >= 3) {
    // Avoid duplicate rage click events for the same burst
    const lastRage = rageClicks[rageClicks.length - 1]
    if (!lastRage || now - lastRage.ts > 1000) {
      rageClicks.push({
        ts: now,
        count: recent.length,
        sel: bc.sel,
        tag: bc.tag,
        text: bc.text,
      })
      if (rageClicks.length > MAX_RAGE_CLICKS) rageClicks.shift()
    }
  }

  // Dead click detection
  detectDeadClick(target, bc)
}, true) // capture phase

// Dead click: click on non-interactive element with no DOM mutation within 1s
let pendingDeadClick = false
function detectDeadClick(target: Element, bc: ClickBreadcrumb) {
  if (pendingDeadClick) return
  // Check if target or ancestors (3 levels) are interactive
  const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']
  const interactiveAttrs = ['onclick', 'role', 'tabindex', 'data-action']
  let el: Element | null = target
  for (let i = 0; i < 4 && el; i++) {
    if (interactiveTags.includes(el.tagName)) return
    if (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link') return
    for (const attr of interactiveAttrs) {
      if (el.hasAttribute(attr)) return
    }
    // Check computed cursor style
    try {
      if (getComputedStyle(el).cursor === 'pointer') return
    } catch {}
    el = el.parentElement
  }

  pendingDeadClick = true
  let mutated = false
  const obs = new MutationObserver(() => { mutated = true })
  obs.observe(document.body, { childList: true, subtree: true, attributes: true })

  const onNav = () => { mutated = true }
  window.addEventListener('hashchange', onNav)
  window.addEventListener('popstate', onNav)

  setTimeout(() => {
    obs.disconnect()
    window.removeEventListener('hashchange', onNav)
    window.removeEventListener('popstate', onNav)
    pendingDeadClick = false
    if (!mutated) {
      deadClicks.push({ ts: bc.ts, sel: bc.sel, tag: bc.tag, text: bc.text })
      if (deadClicks.length > MAX_DEAD_CLICKS) deadClicks.shift()
    }
  }, 1000)
}

// Performance metrics via PerformanceObserver
try {
  // LCP
  const lcpObs = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    if (entries.length > 0) perfLCP = entries[entries.length - 1].startTime
  })
  lcpObs.observe({ type: 'largest-contentful-paint', buffered: true })

  // CLS
  const clsObs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        perfCLS += (entry as any).value || 0
      }
    }
  })
  clsObs.observe({ type: 'layout-shift', buffered: true })

  // INP
  const inpObs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      inpCandidates.push((entry as any).duration || 0)
    }
  })
  inpObs.observe({ type: 'event', buffered: true, durationThreshold: 16 } as any)
} catch {
  // PerformanceObserver not available — metrics will be undefined
}

// Snapshot collectors (called at submit time)
function collectPerformanceMetrics() {
  // INP = p98 of interaction durations
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

  let memoryMB: number | undefined
  try {
    const mem = (performance as any).memory
    if (mem?.usedJSHeapSize) memoryMB = Math.round(mem.usedJSHeapSize / 1048576 * 10) / 10
  } catch {}

  return {
    lcp: perfLCP ? Math.round(perfLCP) : undefined,
    cls: perfCLS > 0 ? Math.round(perfCLS * 1000) / 1000 : undefined,
    inp,
    pageLoadMs,
    memoryMB,
  }
}

function collectConnectionInfo() {
  try {
    const conn = (navigator as any).connection
    if (!conn) return undefined
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData || false,
    }
  } catch { return undefined }
}

function collectDisplayInfo() {
  return {
    screenW: screen.width,
    screenH: screen.height,
    dpr: Math.round(window.devicePixelRatio * 100) / 100,
    colorDepth: screen.colorDepth,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
  }
}

function collectGeoHint() {
  try {
    return {
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lang: navigator.language,
      langs: navigator.languages ? Array.from(navigator.languages).slice(0, 3) : undefined,
    }
  } catch { return undefined }
}

// Listen for tracker data forwarded from ViewerClient (shared URL / proxy mode)
// The tracker.js inside the iframe captures rrweb, console, network, errors
// and sends via postMessage → ViewerClient dispatches as custom events here
window.addEventListener('feedbackview:tracker-data', ((e: CustomEvent) => {
  const { type, payload } = e.detail || {}
  switch (type) {
    case 'RRWEB_EVENT':
      rrwebEvents.push(payload as RRWebEvent)
      trimRrwebEvents()
      break
    case 'CONSOLE_LOG':
      consoleLogs.push(payload as ConsoleLog)
      if (consoleLogs.length > MAX_LOGS) consoleLogs.shift()
      break
    case 'NETWORK_LOG':
      networkLogs.push(payload as NetworkLog)
      if (networkLogs.length > MAX_LOGS) networkLogs.shift()
      break
    case 'JS_ERROR':
      consoleLogs.push({ level: 'error', args: [payload?.message || String(payload)], timestamp: Date.now() })
      if (consoleLogs.length > MAX_LOGS) consoleLogs.shift()
      break
    case 'PAGE_URL':
    case 'PAGE_CHANGE':
      if (payload && typeof payload === 'string') proxyPageUrl = payload
      else if (payload?.url) proxyPageUrl = payload.url
      break
    case 'CLICK_BREADCRUMB':
      if (payload?.breadcrumb) {
        clickBreadcrumbs.push(payload.breadcrumb)
        if (clickBreadcrumbs.length > MAX_BREADCRUMBS) clickBreadcrumbs.shift()
      }
      break
    case 'RAGE_CLICK':
      if (payload?.rageClick) {
        rageClicks.push(payload.rageClick)
        if (rageClicks.length > MAX_RAGE_CLICKS) rageClicks.shift()
      }
      break
    case 'DEAD_CLICK':
      if (payload?.deadClick) {
        deadClicks.push(payload.deadClick)
        if (deadClicks.length > MAX_DEAD_CLICKS) deadClicks.shift()
      }
      break
  }
}) as EventListener)

// Console interception
const levels = ['log', 'warn', 'error', 'info'] as const
levels.forEach((level) => {
  const original = console[level].bind(console)
  console[level] = (...args: unknown[]) => {
    original(...args)
    if (args[0] === '[FeedbackView]') return
    consoleLogs.push({ level, args: args.map(safeSerialize), timestamp: Date.now() })
    if (consoleLogs.length > MAX_LOGS) consoleLogs.shift()
  }
})

// JS Errors
window.onerror = (message, source, lineno, colno, error) => {
  consoleLogs.push({
    level: 'error',
    args: [{ message: String(message), stack: error?.stack, source, lineno, colno }],
    timestamp: Date.now(),
  })
  return false
}
window.onunhandledrejection = (event) => {
  consoleLogs.push({
    level: 'error',
    args: [{ message: `Unhandled Promise Rejection: ${event.reason}`, stack: event.reason?.stack }],
    timestamp: Date.now(),
  })
}

// Network interception
const originalFetch = window.fetch.bind(window)
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const start = Date.now()
  const url = String(typeof args[0] === 'string' ? args[0] : (args[0] as Request).url)
  const method = (typeof args[0] === 'object' && 'method' in args[0] ? (args[0] as Request).method : args[1]?.method) || 'GET'
  try {
    const res = await originalFetch(...args)
    networkLogs.push({ method, url, status: res.status, duration: Date.now() - start })
    if (networkLogs.length > MAX_LOGS) networkLogs.shift()
    return res
  } catch (err: any) {
    networkLogs.push({ method, url, status: 0, duration: Date.now() - start })
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
      networkLogs.push({ method: this._method, url: this._url, status: this.status, duration: Date.now() - this._start })
      if (networkLogs.length > MAX_LOGS) networkLogs.shift()
    })
    return super.send(...args)
  }
}
;(window as any).XMLHttpRequest = TrackedXHR

// Password masking
function maskPasswordFields() {
  document.querySelectorAll<HTMLInputElement>('input[type=password]').forEach((el) => {
    if (!el.dataset.feedbackMasked) el.dataset.feedbackMasked = 'true'
  })
}

// rrweb session recording
// rrweb event type 2 = FullSnapshot — must always be preserved for replay to work.
// When trimming, find the last full snapshot and discard everything before it (up to limit).
function trimRrwebEvents() {
  if (rrwebEvents.length <= MAX_RRWEB_EVENTS) return

  // Strategy: keep Meta+Snapshot pair + most recent incremental events,
  // then normalize timestamps to close any time gap.

  // Find the last full snapshot (type 2)
  let lastSnapshotIdx = -1
  for (let i = rrwebEvents.length - 1; i >= 0; i--) {
    if (rrwebEvents[i].type === 2) { lastSnapshotIdx = i; break }
  }

  if (lastSnapshotIdx >= 0) {
    // Find the Meta event (type 4) before the snapshot
    let metaIdx = lastSnapshotIdx
    for (let i = lastSnapshotIdx - 1; i >= 0; i--) {
      if (rrwebEvents[i].type === 4) { metaIdx = i; break }
    }

    // Keep: Meta, Snapshot, then the most recent incremental events
    const headerEvents = rrwebEvents.slice(metaIdx, lastSnapshotIdx + 1) // Meta + Snapshot
    const tailEvents = rrwebEvents.slice(lastSnapshotIdx + 1)            // all after snapshot
    const maxTail = MAX_RRWEB_EVENTS - headerEvents.length
    const keptTail = tailEvents.length > maxTail ? tailEvents.slice(tailEvents.length - maxTail) : tailEvents

    // Normalize timestamps: close the gap between snapshot and first kept incremental event
    if (keptTail.length > 0 && headerEvents.length > 0) {
      const snapshotTs = headerEvents[headerEvents.length - 1].timestamp
      const firstTailTs = keptTail[0].timestamp
      const gap = firstTailTs - snapshotTs
      // Only normalize if there's a significant gap (> 2s)
      if (gap > 2000) {
        const offset = gap - 100 // leave 100ms gap between snapshot and first event
        for (const evt of keptTail) {
          evt.timestamp -= offset
        }
      }
    }

    // Replace array contents
    rrwebEvents.length = 0
    rrwebEvents.push(...headerEvents, ...keptTail)
  } else {
    // No snapshot — just keep most recent events
    rrwebEvents.splice(0, rrwebEvents.length - MAX_RRWEB_EVENTS)
  }
}

let stopRecording: (() => void) | null = null

function startRecording() {
  // If already recording, stop first
  if (stopRecording) {
    stopRecording()
    stopRecording = null
  }
  stopRecording = record({
    emit(event) {
      rrwebEvents.push(event as RRWebEvent)
      trimRrwebEvents()
    },
    maskInputOptions: { password: true },
    blockClass: 'feedback-ignore',
    ignoreClass: 'feedback-ignore',
  }) || null
  maskPasswordFields()
}

function pauseRecording() {
  if (stopRecording) {
    stopRecording()
    stopRecording = null
  }
}

function clearAndRestartRecording() {
  rrwebEvents.length = 0
  startRecording()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startRecording)
} else {
  startRecording()
}

// ─── Screenshot capture ──────────────────────────────────────────────────────
function getProxyIframe(): HTMLIFrameElement | null {
  return document.querySelector('iframe[title="QA Viewer"]') as HTMLIFrameElement | null
}

async function captureScreenshotViaProxy(iframe: HTMLIFrameElement): Promise<string | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler)
      resolve(null)
    }, 8000)

    function handler(event: MessageEvent) {
      const data = event.data
      if (data?.source === 'feedbackview-tracker' && data?.type === 'SCREENSHOT_RESULT') {
        clearTimeout(timeout)
        window.removeEventListener('message', handler)
        resolve(data.payload?.dataUrl || null)
      }
    }

    window.addEventListener('message', handler)
    iframe.contentWindow?.postMessage({ type: 'CAPTURE_SCREENSHOT' }, '*')
  })
}

async function captureScreenshot(): Promise<string | null> {
  // In proxy mode, request screenshot from tracker.js inside the iframe
  const proxyIframe = getProxyIframe()
  if (proxyIframe) {
    return captureScreenshotViaProxy(proxyIframe)
  }

  // Direct embed mode: capture with html2canvas
  try {
    const html2canvas = (await import('html2canvas')).default
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
    // Downscale if too large to keep payload under Vercel's 4.5MB limit
    const MAX_WIDTH = 1280
    if (canvas.width > MAX_WIDTH) {
      const ratio = MAX_WIDTH / canvas.width
      const small = document.createElement('canvas')
      small.width = MAX_WIDTH
      small.height = Math.round(canvas.height * ratio)
      const sCtx = small.getContext('2d')
      if (sCtx) {
        sCtx.drawImage(canvas, 0, 0, small.width, small.height)
        return small.toDataURL('image/jpeg', 0.6)
      }
    }
    return canvas.toDataURL('image/jpeg', 0.6)
  } catch {
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Fetch widget config from server ────────────────────────────────────────
async function fetchConfig(): Promise<WidgetConfig> {
  if (!PROJECT_ID || !API_BASE) return { ...DEFAULT_CONFIG, blocked: true }
  try {
    const res = await originalFetch(`${API_BASE}/api/projects/${PROJECT_ID}/config`, { cache: 'no-store' })
    if (res.status === 403) {
      console.warn('[FeedbackView] Site não autorizado para este projeto.')
      return { ...DEFAULT_CONFIG, blocked: true }
    }
    if (!res.ok) return { ...DEFAULT_CONFIG, blocked: true }
    const data = await res.json()
    return {
      widgetPosition: data.widgetPosition || DEFAULT_CONFIG.widgetPosition,
      widgetColor: data.widgetColor && /^#[0-9a-fA-F]{6}$/.test(data.widgetColor) ? data.widgetColor : DEFAULT_CONFIG.widgetColor,
      widgetStyle: data.widgetStyle === 'icon' ? 'icon' : 'text',
      limitReached: !!data.limitReached,
      paused: !!data.paused,
    }
  } catch {
    return { ...DEFAULT_CONFIG, blocked: true }
  }
}

// ─── Position helpers ───────────────────────────────────────────────────────
function getPositionCSS(position: string, style: string) {
  if (style === 'text') {
    // Text style: tag grudada na borda
    if (position.includes('center')) {
      // Centro: horizontal, grudado top/bottom
      const vert = position.includes('top') ? 'top: 0;' : 'bottom: 0;'
      const radius = position.includes('top') ? 'border-radius: 0 0 8px 8px;' : 'border-radius: 8px 8px 0 0;'
      return `${vert} left: 50%; transform: translateX(-50%); ${radius}`
    }
    // Lateral: vertical, grudado left/right
    const vert = position.includes('top') ? 'top: 70px;' : position.includes('middle') ? 'top: 50%; transform: translateY(-50%);' : 'bottom: 24px;'
    if (position.includes('left')) {
      return `${vert} left: 0; border-radius: 0 8px 8px 0;`
    }
    return `${vert} right: 0; border-radius: 8px 0 0 8px;`
  }
  // Icon style: floating with offset
  switch (position) {
    case 'top-left': return 'top: 70px; left: 24px;'
    case 'top-center': return 'top: 70px; left: 50%; transform: translateX(-50%);'
    case 'top-right': return 'top: 70px; right: 24px;'
    case 'middle-left': return 'top: 50%; left: 24px; transform: translateY(-50%);'
    case 'middle-right': return 'top: 50%; right: 24px; transform: translateY(-50%);'
    case 'bottom-left': return 'bottom: 24px; left: 24px;'
    case 'bottom-center': return 'bottom: 24px; left: 50%; transform: translateX(-50%);'
    default: return 'bottom: 24px; right: 24px;'
  }
}

function getPanelSide(position: string) {
  if (position.includes('center')) return 'right'
  return position.includes('left') ? 'left' : 'right'
}

// ─── Hex color to rgba helper ───────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function darkenHex(hex: string, amount: number) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function lightenHex(hex: string, amount: number) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// ─── Widget UI (Shadow DOM) ──────────────────────────────────────────────────
function createWidget(config: WidgetConfig) {
  const host = document.createElement('div')
  host.id = 'feedbackview-embed'
  host.classList.add('feedback-ignore')
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'closed' })

  const color = config.widgetColor
  const colorHover = darkenHex(color, 20)
  const colorDisabled = lightenHex(color, 80)
  const panelSide = getPanelSide(config.widgetPosition)
  const panelSideOpposite = panelSide === 'left' ? 'right' : 'left'
  const panelTransformHidden = panelSide === 'left' ? 'translateX(-100%)' : 'translateX(100%)'
  const panelShadowDir = panelSide === 'left' ? '4px' : '-4px'

  const style = document.createElement('style')
  // Load Inter font for brand consistency
  const fontLink = document.createElement('link')
  fontLink.rel = 'stylesheet'
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@700;900&display=swap'
  shadow.appendChild(fontLink)

  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    @keyframes fv-trigger-bounce {
      0% { transform: scale(0) rotate(-45deg); opacity: 0; }
      50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
      70% { transform: scale(0.9) rotate(-3deg); }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    .fv-trigger {
      position: fixed;
      ${getPositionCSS(config.widgetPosition, config.widgetStyle)}
      ${config.widgetStyle === 'icon' ? `
      width: 48px;
      height: 48px;
      padding: 0;
      border-radius: 50%;
      ` : config.widgetPosition.includes('center') ? `
      padding: 8px 16px;
      ` : `
      padding: 12px 8px;
      writing-mode: ${config.widgetPosition.includes('left') ? 'vertical-lr' : 'vertical-rl'};
      text-orientation: mixed;
      `}
      background: ${color};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px ${hexToRgba(color, 0.4)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: ${(config.widgetPosition.includes('center') || config.widgetPosition.includes('middle')) ? 'box-shadow 0.2s' : 'transform 0.2s, box-shadow 0.2s'};
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
    }
    .fv-trigger .fv-trigger-brand {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: -0.02em;
    }
    .fv-trigger .fv-trigger-icon-text {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 900;
      font-size: 13px;
      letter-spacing: -0.04em;
      line-height: 0.95;
      text-align: left;
      text-transform: uppercase;
      white-space: pre;
    }
    .fv-trigger.fv-trigger-hidden {
      ${(config.widgetPosition.includes('center') || config.widgetPosition.includes('middle')) ? 'visibility: hidden;' : 'transform: scale(0);'}
      opacity: 0;
      pointer-events: none;
    }
    .fv-trigger.fv-trigger-entering {
      ${(config.widgetPosition.includes('center') || config.widgetPosition.includes('middle')) ? '' : 'animation: fv-trigger-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;'}
    }
    .fv-trigger:hover {
      ${(config.widgetPosition.includes('center') || config.widgetPosition.includes('middle')) ? '' : 'transform: scale(1.05);'}
      box-shadow: 0 6px 20px ${hexToRgba(color, 0.5)};
    }
    .fv-trigger:active {
      ${(config.widgetPosition.includes('center') || config.widgetPosition.includes('middle')) ? '' : 'transform: scale(0.95);'}
    }

    @keyframes fv-pulse-ring {
      0% { box-shadow: 0 0 0 0 ${hexToRgba(color, 0.5)}; }
      70% { box-shadow: 0 0 0 10px ${hexToRgba(color, 0)}; }
      100% { box-shadow: 0 0 0 0 ${hexToRgba(color, 0)}; }
    }
    .fv-trigger.fv-trigger-loading {
      pointer-events: none;
      animation: fv-pulse-ring 1.2s ease-out infinite;
      transform: scale(0.95);
    }

    .fv-backdrop {
      position: fixed;
      inset: 0;
      background: ${hexToRgba(color, 0.92)};
      z-index: 2147483646;
      opacity: 0;
      transition: opacity 0.35s ease;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .fv-backdrop.open { opacity: 1; }

    .fv-panel {
      position: fixed;
      ${panelSide}: 0;
      ${panelSideOpposite}: auto;
      top: 0;
      height: 100%;
      width: 920px;
      max-width: 100vw;
      background: #fff;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      box-shadow: none;
      transform: ${panelTransformHidden};
      transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
      border-radius: ${panelSide === 'right' ? '16px 0 0 16px' : '0 16px 16px 0'};
    }
    .fv-panel.open { transform: translateX(0); }

    .fv-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .fv-header h2 { font-size: 16px; font-weight: 600; color: #111827; }
    .fv-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      transition: background 0.15s, color 0.15s;
    }
    .fv-close:hover { background: #f3f4f6; color: #111827; }
    .fv-close svg { width: 20px; height: 20px; }

    .fv-body {
      flex: 1;
      display: flex;
      overflow: hidden;
    }
    .fv-body-form {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
    }
    .fv-preview-panel {
      width: 380px;
      flex-shrink: 0;
      border-left: 1px solid #e5e7eb;
      background: #f9fafb;
      overflow-y: auto;
      padding: 20px;
    }
    @media (max-width: 768px) {
      .fv-preview-panel { display: none !important; }
    }
    .fv-preview-label {
      font-size: 11px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    .fv-preview-card {
      background: #fff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .fv-preview-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 6;
      font-size: 12px;
      font-weight: 600;
    }
    .fv-preview-section-title {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .fv-preview-text {
      font-size: 13px;
      color: #374151;
      line-height: 1.6;
      margin: 0;
      white-space: pre-wrap;
    }
    .fv-preview-placeholder {
      font-size: 13px;
      color: #d1d5db;
      font-style: italic;
      margin: 0;
    }
    .fv-preview-meta {
      border-top: 1px solid #f3f4f6;
      padding-top: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .fv-preview-meta-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .fv-preview-meta-icon {
      color: #9ca3af;
      flex-shrink: 0;
    }

    .fv-replay-section {
      padding: 20px;
      border-bottom: 1px solid #f3f4f6;
    }
    .fv-replay-proxy-warning {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.5;
      color: #92400e;
    }
    .fv-replay-proxy-warning svg {
      flex-shrink: 0;
      margin-top: 1px;
    }
    .fv-replay-proxy-warning strong {
      display: block;
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .fv-replay-label {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .fv-replay-label .fv-hint {
      font-size: 12px;
      font-weight: 400;
      color: #9ca3af;
    }
    .fv-replay-info {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1.5px solid #9ca3af;
      font-size: 10px;
      font-weight: 600;
      color: #9ca3af;
      cursor: help;
      margin-left: 2px;
      flex-shrink: 0;
    }
    .fv-replay-info:hover {
      border-color: #6b7280;
      color: #6b7280;
    }
    .fv-replay-tooltip {
      display: none;
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1e293b;
      color: #f1f5f9;
      font-size: 11px;
      font-weight: 400;
      line-height: 1.5;
      padding: 8px 12px;
      border-radius: 8px;
      width: 240px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10;
      pointer-events: none;
    }
    .fv-replay-tooltip::after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-bottom-color: #1e293b;
    }
    .fv-replay-info:hover .fv-replay-tooltip {
      display: block;
    }
    @keyframes fv-pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .fv-replay-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      animation: fv-pulse-dot 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
    .fv-replay-card {
      border-radius: 12px;
      border: 1px solid #1e293b;
      background: #0f172a;
      overflow: hidden;
    }
    .replayer-wrapper {
      position: relative;
    }
    .replayer-mouse {
      position: absolute;
      width: 20px;
      height: 20px;
      transition: left 0.05s linear, top 0.05s linear;
      background-size: contain;
      background-position: center center;
      background-repeat: no-repeat;
      background-image: url('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0iTGF5ZXIgMSIgdmlld0JveD0iMCAwIDUwIDUwIiB4PSIwcHgiIHk9IjBweCI+PHRpdGxlPkRlc2lnbl90bnA8L3RpdGxlPjxwYXRoIGQ9Ik00OC43MSw0Mi45MUwzNC4wOCwyOC4yOSw0NC4zMywxOEExLDEsMCwwLDAsNDQsMTYuMzlMMi4zNSwxLjA2QTEsMSwwLDAsMCwxLjA2LDIuMzVMMTYuMzksNDRhMSwxLDAsMCwwLDEuNjUuMzZMMjguMjksMzQuMDgsNDIuOTEsNDguNzFhMSwxLDAsMCwwLDEuNDEsMGw0LjM4LTQuMzhBMSwxLDAsMCwwLDQ4LjcxLDQyLjkxWm0tNS4wOSwzLjY3TDI5LDMyYTEsMSwwLDAsMC0xLjQxLDBsLTkuODUsOS44NUwzLjY5LDMuNjlsMzguMTIsMTRMMzIsMjcuNThBMSwxLDAsMCwwLDMyLDI5TDQ2LjU5LDQzLjYyWiI+PC9wYXRoPjwvc3ZnPg==');
      border-color: transparent;
    }
    .replayer-mouse::after {
      content: '';
      display: inline-block;
      width: 20px;
      height: 20px;
      background: rgb(73, 80, 246);
      border-radius: 100%;
      transform: translate(-50%, -50%);
      opacity: 0.3;
    }
    .replayer-mouse.active::after {
      animation: click 0.2s ease-in-out 1;
    }
    .replayer-mouse-tail {
      position: absolute;
      pointer-events: none;
    }
    @keyframes click {
      0% { opacity: 0.3; width: 20px; height: 20px; }
      50% { opacity: 0.5; width: 10px; height: 10px; }
    }

    .fv-form-section {
      padding: 20px;
    }
    .fv-form-section > * + * { margin-top: 16px; }

    .fv-field {}
    .fv-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    .fv-required { color: #ef4444; }

    .fv-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit;
      color: #111827;
      box-sizing: border-box;
    }
    .fv-input:focus {
      border-color: ${color};
      box-shadow: 0 0 0 3px ${hexToRgba(color, 0.1)};
    }
    .fv-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 13px;
      resize: vertical;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      font-family: inherit;
      color: #111827;
    }
    .fv-textarea:focus {
      border-color: ${color};
      box-shadow: 0 0 0 3px ${hexToRgba(color, 0.1)};
    }
    .fv-attach-drop {
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 12px 16px;
      text-align: center;
      cursor: pointer;
      background: #f9fafb;
      transition: border-color 0.2s;
    }
    .fv-attach-drop:hover {
      border-color: ${color};
    }

    .fv-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 13px;
      background: white;
      outline: none;
      color: #111827;
      cursor: pointer;
    }
    .fv-select:focus {
      border-color: ${color};
      box-shadow: 0 0 0 3px ${hexToRgba(color, 0.1)};
    }

    .fv-error-msg {
      margin-top: 4px;
      font-size: 12px;
      color: #dc2626;
    }

    .fv-logs-section {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .fv-logs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: #f9fafb;
      cursor: pointer;
      transition: background 0.15s;
      user-select: none;
    }
    .fv-logs-header:hover { background: #f3f4f6; }
    .fv-logs-header span { font-size: 13px; font-weight: 500; color: #374151; }
    .fv-logs-header svg { width: 16px; height: 16px; color: #9ca3af; transition: transform 0.2s; }
    .fv-logs-header.open svg { transform: rotate(180deg); }
    .fv-logs-list { max-height: 180px; overflow-y: auto; }
    .fv-log-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-top: 1px solid #f3f4f6;
    }
    .fv-log-row-console { align-items: flex-start; }
    .fv-log-tag {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      line-height: 16px;
    }
    .fv-tag-success { background: #dcfce7; color: #15803d; }
    .fv-tag-danger { background: #fee2e2; color: #b91c1c; }
    .fv-tag-warning { background: #fef9c3; color: #a16207; }
    .fv-tag-info { background: #dbeafe; color: #1d4ed8; }
    .fv-tag-neutral { background: #e0e7ff; color: #4338ca; }
    .fv-log-method { flex-shrink: 0; font-family: monospace; font-size: 11px; font-weight: 700; color: #374151; }
    .fv-log-url { font-family: monospace; font-size: 11px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
    .fv-log-duration { flex-shrink: 0; font-family: monospace; font-size: 11px; color: #9ca3af; }
    .fv-log-message { font-family: monospace; font-size: 11px; color: #6b7280; word-break: break-word; flex: 1; min-width: 0; }
    .fv-events-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #6b7280;
      padding: 10px 14px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .fv-events-summary .fv-log-tag { margin-right: 2px; }

    .fv-details-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      user-select: none;
      transition: color 0.15s;
    }
    .fv-details-toggle:hover { color: #374151; }
    .fv-details-toggle svg {
      transition: transform 0.2s ease;
    }
    .fv-details-toggle.open svg {
      transform: rotate(180deg);
    }
    .fv-details-content {
      display: none;
      padding-bottom: 4px;
    }
    .fv-details-content.open {
      display: block;
    }

    .fv-footer {
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
    }

    .fv-submit {
      width: 100%;
      padding: 10px 16px;
      background: ${color};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .fv-submit:hover { background: ${colorHover}; }
    .fv-submit:disabled { background: ${colorDisabled}; cursor: not-allowed; }

    @keyframes fv-success-pop {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fv-success-check {
      0% { stroke-dashoffset: 24; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes fv-success-fade-up {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes fv-confetti {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-80px) rotate(360deg); opacity: 0; }
    }

    .fv-success {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      position: relative;
      overflow: hidden;
    }
    .fv-success-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #dcfce7;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fv-success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .fv-success-icon svg {
      width: 36px;
      height: 36px;
      color: #16a34a;
      stroke-dasharray: 24;
      stroke-dashoffset: 24;
      animation: fv-success-check 0.4s ease 0.4s forwards;
    }
    .fv-success h3 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      opacity: 0;
      animation: fv-success-fade-up 0.4s ease 0.5s forwards;
    }
    .fv-success p {
      font-size: 14px;
      color: #6b7280;
      text-align: center;
      max-width: 280px;
      opacity: 0;
      animation: fv-success-fade-up 0.4s ease 0.65s forwards;
    }
    .fv-confetti-particle {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      animation: fv-confetti 1s ease forwards;
    }

    .fv-server-error {
      padding: 10px 14px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #dc2626;
      font-size: 13px;
      margin-bottom: 16px;
    }

    @keyframes fv-spin {
      to { transform: rotate(360deg); }
    }
    .fv-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: fv-spin 0.6s linear infinite;
    }

    .fv-powered {
      text-align: center;
      margin-top: 8px;
      font-size: 11px;
      color: #9ca3af;
    }
    .fv-powered a { color: #6b7280; text-decoration: none; }
    .fv-powered a:hover { text-decoration: underline; }
  `

  shadow.appendChild(style)

  // State
  let isOpen = false
  let screenshotUrl: string | null = null
  let isCapturing = false
  let isSubmitting = false
  let submitted = false
  let demoSubmitted = false
  const embedAttachments: { name: string; type: string; data: string }[] = []

  // Drawing annotation state
  let baseCanvas: HTMLCanvasElement | null = null
  let overlayCanvas: HTMLCanvasElement | null = null
  let drawingRects: { x: number; y: number; w: number; h: number }[] = []
  let isDrawing = false
  let drawStartPos: { x: number; y: number } | null = null

  function getCanvasPos(e: MouseEvent): { x: number; y: number } {
    if (!overlayCanvas) return { x: 0, y: 0 }
    const rect = overlayCanvas.getBoundingClientRect()
    const scaleX = overlayCanvas.width / rect.width
    const scaleY = overlayCanvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function redrawOverlay(currentRect?: { x: number; y: number; w: number; h: number }) {
    if (!overlayCanvas) return
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'
    const allRects = [...drawingRects, ...(currentRect ? [currentRect] : [])]
    allRects.forEach((r) => {
      ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.strokeRect(r.x, r.y, r.w, r.h)
    })
  }

  function getFinalScreenshot(): string | null {
    if (!baseCanvas) return screenshotUrl
    const merged = document.createElement('canvas')
    merged.width = baseCanvas.width
    merged.height = baseCanvas.height
    const ctx = merged.getContext('2d')
    if (!ctx) return screenshotUrl
    ctx.drawImage(baseCanvas, 0, 0)
    if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, 0)
    return merged.toDataURL('image/jpeg', 0.6)
  }

  // Icons
  const bugIcon = `<svg viewBox="0 0 200 220" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M75,40 Q60,22 50,8" stroke-width="4.5"/><circle cx="48" cy="6" r="5" fill="currentColor" stroke="none"/><path d="M105,36 Q114,18 118,5" stroke-width="4.5"/><circle cx="119" cy="3" r="5" fill="currentColor" stroke="none"/><circle cx="90" cy="52" r="30" stroke-width="5"/><circle cx="76" cy="48" r="9" stroke-width="4"/><circle cx="76" cy="48" r="4" fill="currentColor" stroke="none"/><circle cx="104" cy="48" r="9" stroke-width="4"/><circle cx="104" cy="48" r="4" fill="currentColor" stroke="none"/><ellipse cx="90" cy="115" rx="52" ry="68" stroke-width="5"/><path d="M40,88 Q90,82 140,88" stroke-width="4"/><path d="M38,115 Q90,109 142,115" stroke-width="4"/><path d="M40,142 Q90,136 140,142" stroke-width="4"/><circle cx="90" cy="108" r="24" stroke-width="4"/><ellipse cx="82" cy="102" rx="6" ry="7" fill="currentColor" stroke="none"/><ellipse cx="98" cy="102" rx="6" ry="7" fill="currentColor" stroke="none"/><path d="M87,112 L90,116 L93,112" stroke-width="3" fill="none"/><path d="M82,120 L98,120" stroke-width="3"/><line x1="85" y1="120" x2="85" y2="125" stroke-width="3"/><line x1="90" y1="120" x2="90" y2="126" stroke-width="3"/><line x1="95" y1="120" x2="95" y2="125" stroke-width="3"/><path d="M40,92 C26,86 16,78 8,68" stroke-width="4.5"/><path d="M39,115 C24,112 12,108 3,103" stroke-width="4.5"/><path d="M41,140 C28,144 18,152 10,162" stroke-width="4.5"/><path d="M140,92 C154,86 164,78 172,68" stroke-width="4.5"/><path d="M141,115 C156,112 168,108 177,103" stroke-width="4.5"/><path d="M139,140 C152,144 162,152 170,162" stroke-width="4.5"/><path d="M76,180 Q68,192 58,198" stroke-width="4.5"/><path d="M104,180 Q112,192 122,198" stroke-width="4.5"/></svg>`
  const closeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

  // Trigger button
  const hiddenTrigger = SCRIPT_EL?.dataset.hiddenTrigger === 'true' || SCRIPT_EL?.getAttribute('data-hidden-trigger') === 'true'
  const trigger = document.createElement('button')
  trigger.className = hiddenTrigger ? 'fv-trigger fv-trigger-hidden' : 'fv-trigger'
  trigger.innerHTML = config.widgetStyle === 'icon'
    ? `<span class="fv-trigger-icon-text">BU\nUG</span>`
    : `<span class="fv-trigger-brand">Buug report</span>`
  trigger.title = 'Enviar feedback'
  shadow.appendChild(trigger)

  // Panel container
  const panelContainer = document.createElement('div')
  panelContainer.style.display = 'none'
  shadow.appendChild(panelContainer)

  function renderPanel() {
    panelContainer.innerHTML = ''
    panelContainer.style.display = isOpen ? 'block' : 'none'
    if (!isOpen) return

    // Backdrop
    const backdrop = document.createElement('div')
    backdrop.className = 'fv-backdrop'
    backdrop.addEventListener('click', close)
    panelContainer.appendChild(backdrop)
    requestAnimationFrame(() => backdrop.classList.add('open'))

    // Panel
    const panel = document.createElement('div')
    panel.className = 'fv-panel'
    panelContainer.appendChild(panel)
    requestAnimationFrame(() => panel.classList.add('open'))

    if (submitted) {
      renderSuccess(panel, demoSubmitted)
      return
    }

    // Header
    const header = document.createElement('div')
    header.className = 'fv-header'
    header.innerHTML = `<h2>Reportar</h2>`
    const closeBtn = document.createElement('button')
    closeBtn.className = 'fv-close'
    closeBtn.innerHTML = closeIcon
    closeBtn.addEventListener('click', close)
    header.appendChild(closeBtn)
    panel.appendChild(header)

    // Limit reached — show message instead of form
    // Paused — show message instead of form
    if (config.paused) {
      const pausedMsg = document.createElement('div')
      pausedMsg.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;gap:12px;flex:1;'
      pausedMsg.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="10" y1="15" x2="10" y2="9"/>
          <line x1="14" y1="15" x2="14" y2="9"/>
        </svg>
        <div style="font-size:15px;font-weight:600;color:#374151;">Widget pausado</div>
        <div style="font-size:13px;color:#6b7280;line-height:1.6;max-width:280px;">
          O envio de reports está temporariamente pausado pelo administrador do projeto.
        </div>
      `
      panel.appendChild(pausedMsg)
      const pausedFooter = document.createElement('div')
      pausedFooter.style.cssText = 'padding:12px 16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;'
      pausedFooter.innerHTML = 'Powered by <strong style="color:#6b7280;">Buug</strong>'
      panel.appendChild(pausedFooter)
      return
    }

    if (config.limitReached) {
      const limitMsg = document.createElement('div')
      limitMsg.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;text-align:center;gap:12px;flex:1;'
      limitMsg.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
        <div style="font-size:15px;font-weight:600;color:#374151;">Limite de reports atingido</div>
        <div style="font-size:13px;color:#6b7280;line-height:1.6;max-width:280px;">
          O limite de reports deste projeto foi atingido este mês. Entre em contato com o responsável pelo site para continuar reportando.
        </div>
      `
      panel.appendChild(limitMsg)
      const limitFooter = document.createElement('div')
      limitFooter.style.cssText = 'padding:12px 16px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;'
      limitFooter.innerHTML = 'Powered by <strong style="color:#6b7280;">Buug</strong>'
      panel.appendChild(limitFooter)
      return
    }

    // Body (two-column layout)
    const body = document.createElement('div')
    body.className = 'fv-body'
    panel.appendChild(body)

    const bodyForm = document.createElement('div')
    bodyForm.className = 'fv-body-form'
    body.appendChild(bodyForm)

    // ── Session Replay section ──
    const isProxyModeNow = !!getProxyIframe()
    const replaySection = document.createElement('div')
    replaySection.className = 'fv-replay-section'

    const replayLabel = document.createElement('div')
    replayLabel.className = 'fv-replay-label'
    replayLabel.innerHTML = '<span class="fv-replay-dot"></span> Session Replay <span class="fv-hint">(gravação automática)</span> <span class="fv-replay-info">!<span class="fv-replay-tooltip">A sessão é gravada automaticamente enquanto você navega. Ao abrir o report, os últimos segundos de interação são capturados. Campos sensíveis como senhas ficam borrados automaticamente.</span></span>'
    replaySection.appendChild(replayLabel)

    if (isProxyModeNow) {
      // Show warning instead of replay player in proxy/shared URL mode
      const proxyWarning = document.createElement('div')
      proxyWarning.className = 'fv-replay-proxy-warning'
      proxyWarning.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><div><strong>Indisponível neste modo</strong>O Session Replay não funciona no modo URL compartilhada. O screenshot será capturado como referência visual.</div>`
      replaySection.appendChild(proxyWarning)
      bodyForm.appendChild(replaySection)
    } else {

    const replayCard = document.createElement('div')
    replayCard.className = 'fv-replay-card'
    replayCard.style.background = '#0f172a'
    replayCard.style.padding = '0'
    replayCard.style.overflow = 'hidden'

    // Player container
    const playerContainer = document.createElement('div')
    playerContainer.className = 'fv-replay-player'
    playerContainer.style.cssText = 'width:100%;min-height:200px;position:relative;'
    replayCard.appendChild(playerContainer)

    // Mount rrweb Replayer
    const hasSnapshot = rrwebEvents.some(e => e.type === 2)
    const hasMeta = rrwebEvents.some(e => e.type === 4)
    if (hasSnapshot && hasMeta && rrwebEvents.length >= 2) {
      try {
        const containerWidth = 440
        const playerHeight = Math.round(containerWidth * 0.56)

        const replayer = new Replayer(rrwebEvents as any, {
          root: playerContainer,
          skipInactive: true,
          showWarning: false,
          showDebug: false,
          blockClass: 'fv-no-replay',
          speed: 1,
        })

        // Render first frame (makes iframe visible) and scale to fit
        replayer.pause(0)
        setTimeout(() => {
          const replayerWrapper = playerContainer.querySelector('.replayer-wrapper') as HTMLElement
          if (replayerWrapper) {
            const actualWidth = playerContainer.offsetWidth || 440
            const iframe = replayerWrapper.querySelector('iframe')
            if (iframe) {
              const iframeWidth = iframe.offsetWidth || 1024
              const scale = actualWidth / iframeWidth
              const scaledHeight = Math.round(actualWidth * 0.56)
              replayerWrapper.style.transform = `scale(${scale})`
              replayerWrapper.style.transformOrigin = 'top left'
              replayerWrapper.style.width = `${iframeWidth}px`
              replayerWrapper.style.height = `${scaledHeight / scale}px`
              playerContainer.style.height = `${scaledHeight}px`
              playerContainer.style.overflow = 'hidden'
            }
          }
        }, 200)

        // Player controls with timeline
        const totalMs = rrwebEvents[rrwebEvents.length - 1].timestamp - rrwebEvents[0].timestamp
        const fmtTime = (ms: number) => {
          const s = Math.floor(ms / 1000)
          const m = Math.floor(s / 60)
          const rem = s % 60
          return m > 0 ? `${m}:${String(rem).padStart(2, '0')}` : `0:${String(rem).padStart(2, '0')}`
        }

        const controls = document.createElement('div')
        controls.className = 'fv-replay-controls'
        controls.style.cssText = 'display:flex;flex-direction:column;gap:8px;background:#fff;padding:10px 12px;border-top:1px solid #e5e7eb;'

        // Timeline row
        const timelineRow = document.createElement('div')
        timelineRow.style.cssText = 'cursor:pointer;height:6px;display:flex;align-items:center;border-radius:3px;background:#e5e7eb;position:relative;'
        const timelineFill = document.createElement('div')
        timelineFill.style.cssText = 'height:100%;width:0%;background:#111827;border-radius:3px;transition:width 0.1s linear;'
        const timelineThumb = document.createElement('div')
        timelineThumb.style.cssText = 'position:absolute;top:50%;width:14px;height:14px;background:#111827;border-radius:50%;transform:translate(-50%,-50%);box-shadow:0 1px 3px rgba(0,0,0,0.15);border:2px solid #fff;left:0%;'
        timelineRow.appendChild(timelineFill)
        timelineRow.appendChild(timelineThumb)

        // Click/drag on timeline to seek
        const seekTo = (e: MouseEvent) => {
          const rect = timelineRow.getBoundingClientRect()
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
          const targetMs = Math.round(pct * totalMs)
          // play(offset) then immediately pause() to force the Replayer to rebuild DOM at that point
          replayer.play(targetMs)
          requestAnimationFrame(() => {
            if (!isPlaying) replayer.pause()
          })
          timelineFill.style.width = `${pct * 100}%`
          timelineThumb.style.left = `${pct * 100}%`
          currentTimeSpan.textContent = fmtTime(targetMs)
        }
        timelineRow.addEventListener('click', seekTo)
        let isDragging = false
        timelineRow.addEventListener('mousedown', (e) => {
          isDragging = true
          seekTo(e)
        })
        // Use panelContainer for drag events (Shadow DOM doesn't propagate to document)
        panelContainer.addEventListener('mousemove', (e: Event) => {
          if (isDragging) seekTo(e as MouseEvent)
        })
        panelContainer.addEventListener('mouseup', () => { isDragging = false })

        controls.appendChild(timelineRow)

        // Bottom row: play, time, speed
        const bottomRow = document.createElement('div')
        bottomRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;'

        let isPlaying = false
        const playSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z"/></svg>'
        const pauseSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'

        const leftControls = document.createElement('div')
        leftControls.style.cssText = 'display:flex;align-items:center;gap:10px;'

        const playBtn = document.createElement('button')
        playBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:none;background:#111827;color:#fff;cursor:pointer;transition:opacity 0.15s;'
        playBtn.innerHTML = playSvg
        playBtn.addEventListener('click', () => {
          if (isPlaying) {
            replayer.pause()
            playBtn.innerHTML = playSvg
          } else {
            // Use getCurrentTime to resume from correct position
            const currentMs = replayer.getCurrentTime() || 0
            // If at end, restart from beginning
            if (currentMs >= totalMs - 100) {
              replayer.play(0)
            } else {
              replayer.play(currentMs)
            }
            playBtn.innerHTML = pauseSvg
          }
          isPlaying = !isPlaying
        })
        leftControls.appendChild(playBtn)

        // Current time / total time
        const timeDisplay = document.createElement('span')
        timeDisplay.style.cssText = 'font-size:11px;color:#6b7280;font-family:monospace;white-space:nowrap;'
        const currentTimeSpan = document.createElement('span')
        currentTimeSpan.textContent = fmtTime(0)
        const timeSep = document.createTextNode(' / ')
        const totalTimeSpan = document.createElement('span')
        totalTimeSpan.textContent = fmtTime(totalMs)
        timeDisplay.appendChild(currentTimeSpan)
        timeDisplay.appendChild(timeSep)
        timeDisplay.appendChild(totalTimeSpan)
        leftControls.appendChild(timeDisplay)
        bottomRow.appendChild(leftControls)

        // Speed selector (individual buttons)
        const rightControls = document.createElement('div')
        rightControls.style.cssText = 'display:flex;align-items:center;gap:2px;'
        const speeds = [1, 2, 4, 8]
        let currentSpeed = 1
        const speedBtns: HTMLButtonElement[] = []

        function updateSpeedBtns() {
          speedBtns.forEach(b => {
            const s = parseInt(b.dataset.speed!)
            if (s === currentSpeed) {
              b.style.background = '#111827'
              b.style.color = '#fff'
              b.style.fontWeight = '600'
            } else {
              b.style.background = 'transparent'
              b.style.color = '#9ca3af'
              b.style.fontWeight = '400'
            }
          })
        }

        speeds.forEach(s => {
          const btn = document.createElement('button')
          btn.dataset.speed = String(s)
          btn.style.cssText = 'border:none;cursor:pointer;padding:3px 7px;border-radius:6px;font-size:11px;transition:all 0.15s;'
          btn.textContent = `${s}x`
          btn.addEventListener('click', () => {
            currentSpeed = s
            replayer.setConfig({ speed: s })
            updateSpeedBtns()
          })
          speedBtns.push(btn)
          rightControls.appendChild(btn)
        })
        updateSpeedBtns()
        bottomRow.appendChild(rightControls)

        controls.appendChild(bottomRow)
        replayCard.appendChild(controls)

        // Update timeline progress during playback
        const startTs = rrwebEvents[0].timestamp
        let progressTimer: ReturnType<typeof setInterval> | null = null
        const updateProgress = () => {
          try {
            const meta = replayer.getMetaData()
            const currentPlayerTime = replayer.getCurrentTime()
            if (currentPlayerTime !== undefined && totalMs > 0) {
              const pct = Math.min(1, Math.max(0, currentPlayerTime / totalMs))
              timelineFill.style.width = `${pct * 100}%`
              timelineThumb.style.left = `${pct * 100}%`
              currentTimeSpan.textContent = fmtTime(currentPlayerTime)
              // Auto-pause at end
              if (currentPlayerTime >= totalMs && isPlaying) {
                isPlaying = false
                playBtn.innerHTML = playSvg
                replayer.pause(totalMs)
              }
            }
          } catch (_) {}
        }
        progressTimer = setInterval(updateProgress, 100)
      } catch (err) {
        playerContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af;font-size:13px;">Gravando sessão...</div>'
      }
    } else {
      playerContainer.innerHTML = '<div style="padding:20px;text-align:center;color:#9ca3af;font-size:13px;">Gravando sessão...</div>'
    }

    replaySection.appendChild(replayCard)
    bodyForm.appendChild(replaySection)
    } // end else (non-proxy mode)

    // ── Form fields section ──
    const formSection = document.createElement('div')
    formSection.className = 'fv-form-section'

    // Title
    const titleField = document.createElement('div')
    titleField.className = 'fv-field'
    titleField.innerHTML = `<label class="fv-label">Título</label>`
    const titleInput = document.createElement('input')
    titleInput.type = 'text'
    titleInput.className = 'fv-input'
    titleInput.placeholder = 'Resumo breve do feedback'
    titleInput.id = 'fv-title'
    titleField.appendChild(titleInput)

    // Description (first field — most important)
    const commentField = document.createElement('div')
    commentField.className = 'fv-field'
    commentField.innerHTML = `<label class="fv-label">Descrição <span class="fv-required">*</span></label>`
    const textarea = document.createElement('textarea')
    textarea.className = 'fv-textarea'
    textarea.rows = 4
    textarea.placeholder = 'Descreva o problema ou sugestão em detalhes... (mínimo 10 caracteres)'
    textarea.id = 'fv-comment'
    commentField.appendChild(textarea)
    const commentError = document.createElement('div')
    commentError.className = 'fv-error-msg'
    commentError.style.display = 'none'
    commentField.appendChild(commentError)
    formSection.appendChild(commentField)

    // Type (segmented buttons)
    const typeField = document.createElement('div')
    typeField.className = 'fv-field'
    typeField.innerHTML = `<label class="fv-label">Tipo</label>`
    // Hidden select to keep value accessible
    const typeHidden = document.createElement('input')
    typeHidden.type = 'hidden'
    typeHidden.id = 'fv-type'
    typeHidden.value = 'BUG'
    typeField.appendChild(typeHidden)

    const typeBtnGroup = document.createElement('div')
    typeBtnGroup.style.cssText = 'display:flex;gap:6px;'
    // SVG icons for type buttons (14px, black, stroke-based)
    const typeIcons: Record<string, string> = {
      BUG: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`,
      SUGGESTION: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
      QUESTION: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
      PRAISE: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></svg>`,
    }
    const typeOptions = [
      { value: 'BUG', label: 'Bug' },
      { value: 'SUGGESTION', label: 'Sugestão' },
      { value: 'QUESTION', label: 'Dúvida' },
      { value: 'PRAISE', label: 'Elogio' },
    ]
    const typeLabels: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
    const typeBtns: HTMLButtonElement[] = []

    function updateTypeBtns(selected: string) {
      typeBtns.forEach((btn) => {
        const val = btn.dataset.value!
        const isActive = val === selected
        btn.style.border = isActive ? `2px solid ${color}` : '1px solid #d1d5db'
        btn.style.background = isActive ? `${color}0d` : '#fff'
        btn.style.color = isActive ? color : '#374151'
        btn.style.fontWeight = isActive ? '600' : '400'
      })
    }

    typeOptions.forEach((opt) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.dataset.value = opt.value
      btn.innerHTML = `${typeIcons[opt.value] || ''} ${opt.label}`
      btn.style.cssText = `flex:1;padding:8px 4px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.15s;border:1px solid #d1d5db;background:#fff;color:#374151;display:inline-flex;align-items:center;justify-content:center;gap:4px;`
      btn.addEventListener('click', () => {
        typeHidden.value = opt.value
        updateTypeBtns(opt.value)
        severityField.style.display = opt.value === 'BUG' ? 'block' : 'none'
        const bugFields = panel.querySelector('#fv-bug-fields') as HTMLElement
        if (bugFields) bugFields.style.display = opt.value === 'BUG' ? 'block' : 'none'
        const submitBtn = panel.querySelector('#fv-submit-btn') as HTMLButtonElement
        if (submitBtn && PROJECT_ID !== 'demo') submitBtn.textContent = `Enviar ${typeLabels[opt.value] || 'Bug'}`
      })
      typeBtns.push(btn)
      typeBtnGroup.appendChild(btn)
    })
    typeField.appendChild(typeBtnGroup)
    formSection.appendChild(typeField)
    updateTypeBtns('BUG')

    // Priority (segmented buttons with colors)
    const severityField = document.createElement('div')
    severityField.className = 'fv-field'
    severityField.id = 'fv-severity-field'
    severityField.innerHTML = `<label class="fv-label">Prioridade</label>`
    const sevHidden = document.createElement('input')
    sevHidden.type = 'hidden'
    sevHidden.id = 'fv-severity'
    sevHidden.value = 'MEDIUM'
    severityField.appendChild(sevHidden)

    const sevBtnGroup = document.createElement('div')
    sevBtnGroup.style.cssText = 'display:flex;gap:6px;'
    const sevOptions = [
      { value: 'LOW', label: 'Baixa', color: '#22c55e' },
      { value: 'MEDIUM', label: 'Média', color: '#f59e0b' },
      { value: 'HIGH', label: 'Alta', color: '#f97316' },
      { value: 'CRITICAL', label: 'Crítica', color: '#ef4444' },
    ]
    const sevBtns: HTMLButtonElement[] = []

    function updateSevBtns(selected: string) {
      sevBtns.forEach((btn) => {
        const val = btn.dataset.value!
        const opt = sevOptions.find((o) => o.value === val)!
        const isActive = val === selected
        btn.style.border = isActive ? `2px solid ${opt.color}` : '1px solid #d1d5db'
        btn.style.background = isActive ? `${opt.color}15` : '#fff'
        btn.style.color = isActive ? opt.color : '#374151'
        btn.style.fontWeight = isActive ? '600' : '400'
      })
    }

    sevOptions.forEach((opt) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.dataset.value = opt.value
      btn.textContent = opt.label
      btn.style.cssText = `flex:1;padding:8px 4px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.15s;border:1px solid #d1d5db;background:#fff;color:#374151;`
      btn.addEventListener('click', () => {
        sevHidden.value = opt.value
        updateSevBtns(opt.value)
      })
      sevBtns.push(btn)
      sevBtnGroup.appendChild(btn)
    })
    severityField.appendChild(sevBtnGroup)
    updateSevBtns('MEDIUM')

    // ── Bug-specific fields (steps, expected, actual) ──
    const bugFieldsContainer = document.createElement('div')
    bugFieldsContainer.id = 'fv-bug-fields'
    bugFieldsContainer.style.display = typeHidden.value === 'BUG' ? 'block' : 'none'

    // Steps to reproduce
    const stepsField = document.createElement('div')
    stepsField.className = 'fv-field'
    stepsField.innerHTML = `<label class="fv-label">Passos para reproduzir</label>`
    const stepsTextarea = document.createElement('textarea')
    stepsTextarea.className = 'fv-textarea'
    stepsTextarea.rows = 3
    stepsTextarea.placeholder = '1. Abra a página X\n2. Clique em Y\n3. Observe Z'
    stepsTextarea.id = 'fv-steps'
    stepsField.appendChild(stepsTextarea)
    bugFieldsContainer.appendChild(stepsField)

    // Expected & Actual results (side by side)
    const resultsRow = document.createElement('div')
    resultsRow.style.cssText = 'display:flex;gap:12px;margin-top:16px;'

    const expectedField = document.createElement('div')
    expectedField.className = 'fv-field'
    expectedField.style.flex = '1'
    expectedField.innerHTML = `<label class="fv-label">Resultado esperado</label>`
    const expectedTextarea = document.createElement('textarea')
    expectedTextarea.className = 'fv-textarea'
    expectedTextarea.rows = 3
    expectedTextarea.placeholder = 'O que deveria acontecer...'
    expectedTextarea.id = 'fv-expected'
    expectedField.appendChild(expectedTextarea)
    resultsRow.appendChild(expectedField)

    const actualField = document.createElement('div')
    actualField.className = 'fv-field'
    actualField.style.flex = '1'
    actualField.innerHTML = `<label class="fv-label">Resultado real</label>`
    const actualTextarea = document.createElement('textarea')
    actualTextarea.className = 'fv-textarea'
    actualTextarea.rows = 3
    actualTextarea.placeholder = 'O que aconteceu de fato...'
    actualTextarea.id = 'fv-actual'
    actualField.appendChild(actualTextarea)
    resultsRow.appendChild(actualField)

    bugFieldsContainer.appendChild(resultsRow)

    // ── "Mais detalhes" expandable section ──
    const detailsToggle = document.createElement('div')
    detailsToggle.className = 'fv-details-toggle'
    detailsToggle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> Mais detalhes`
    const detailsContent = document.createElement('div')
    detailsContent.className = 'fv-details-content'

    detailsToggle.addEventListener('click', () => {
      const isOpen = detailsContent.classList.toggle('open')
      detailsToggle.classList.toggle('open', isOpen)
    })

    // Move title, severity, and bug fields into details section
    detailsContent.appendChild(titleField)
    detailsContent.appendChild(severityField)
    detailsContent.appendChild(bugFieldsContainer)

    formSection.appendChild(detailsToggle)
    formSection.appendChild(detailsContent)

    // Attachments
    const attachField = document.createElement('div')
    attachField.className = 'fv-field'
    attachField.innerHTML = `<label class="fv-label">Anexos</label>`
    const attachDrop = document.createElement('div')
    attachDrop.className = 'fv-attach-drop'
    attachDrop.innerHTML = `<span style="font-size:12px;color:#6b7280;">Clique para anexar arquivos (máx. 5)</span>`
    const attachList = document.createElement('div')
    attachList.className = 'fv-attach-list'
    embedAttachments.length = 0 // reset on re-render

    attachDrop.addEventListener('click', () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true
      input.accept = 'image/*,.pdf,.txt,.log,.json,.csv'
      input.onchange = () => {
        if (!input.files) return
        const files = Array.from(input.files).slice(0, 5 - embedAttachments.length)
        files.forEach((file) => {
          if (embedAttachments.length >= 5) return
          const reader = new FileReader()
          reader.onload = () => {
            embedAttachments.push({ name: file.name, type: file.type, data: reader.result as string })
            renderAttachList()
          }
          reader.readAsDataURL(file)
        })
      }
      input.click()
    })

    function renderAttachList() {
      attachList.innerHTML = ''
      embedAttachments.forEach((att, i) => {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:4px 8px;background:#f3f4f6;border-radius:6px;font-size:12px;margin-top:4px;'
        const name = document.createElement('span')
        name.style.cssText = 'color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;'
        name.textContent = att.name
        const removeBtn = document.createElement('button')
        removeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:#9ca3af;padding:0 4px;font-size:14px;line-height:1;'
        removeBtn.textContent = '×'
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          embedAttachments.splice(i, 1)
          renderAttachList()
        })
        row.appendChild(name)
        row.appendChild(removeBtn)
        attachList.appendChild(row)
      })
    }

    attachField.appendChild(attachDrop)
    attachField.appendChild(attachList)
    formSection.appendChild(attachField)

    // Network Logs section
    if (networkLogs.length > 0) {
      const netSection = document.createElement('div')
      netSection.className = 'fv-logs-section'
      const netHeader = document.createElement('div')
      netHeader.className = 'fv-logs-header'
      netHeader.innerHTML = `<span>Network Logs (${networkLogs.length})</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
      const netList = document.createElement('div')
      netList.className = 'fv-logs-list'
      netList.style.display = 'none'
      networkLogs.forEach((log) => {
        const row = document.createElement('div')
        row.className = 'fv-log-row'
        const tagClass = log.status >= 400 ? 'fv-tag-danger' : 'fv-tag-success'
        row.innerHTML = `<span class="fv-log-tag ${tagClass}">${log.status || '-'}</span><span class="fv-log-method">${log.method}</span><span class="fv-log-url" title="${log.url.replace(/"/g, '&quot;')}">${log.url}</span>${log.duration ? `<span class="fv-log-duration">${log.duration}ms</span>` : ''}`
        netList.appendChild(row)
      })
      netHeader.addEventListener('click', () => {
        const open = netList.style.display !== 'none'
        netList.style.display = open ? 'none' : 'block'
        netHeader.classList.toggle('open', !open)
      })
      netSection.appendChild(netHeader)
      netSection.appendChild(netList)
      formSection.appendChild(netSection)
    }

    // Console Logs section
    if (consoleLogs.length > 0) {
      const conSection = document.createElement('div')
      conSection.className = 'fv-logs-section'
      const conHeader = document.createElement('div')
      conHeader.className = 'fv-logs-header'
      conHeader.innerHTML = `<span>Console Logs (${consoleLogs.length})</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
      const conList = document.createElement('div')
      conList.className = 'fv-logs-list'
      conList.style.display = 'none'
      consoleLogs.forEach((log) => {
        const row = document.createElement('div')
        row.className = 'fv-log-row fv-log-row-console'
        const level = log.level.toUpperCase()
        const tagClass = level === 'ERROR' ? 'fv-tag-danger' : level === 'WARN' ? 'fv-tag-warning' : 'fv-tag-info'
        const msg = Array.isArray(log.args) ? log.args.map((a: unknown) => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') : ''
        row.innerHTML = `<span class="fv-log-tag ${tagClass}">${level}</span><span class="fv-log-message">${msg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
        conList.appendChild(row)
      })
      conHeader.addEventListener('click', () => {
        const open = conList.style.display !== 'none'
        conList.style.display = open ? 'none' : 'block'
        conHeader.classList.toggle('open', !open)
      })
      conSection.appendChild(conHeader)
      conSection.appendChild(conList)
      formSection.appendChild(conSection)
    }

    // Server error placeholder
    const serverError = document.createElement('div')
    serverError.className = 'fv-server-error'
    serverError.style.display = 'none'
    serverError.id = 'fv-server-error'
    formSection.appendChild(serverError)

    bodyForm.appendChild(formSection)

    // ── Live Preview Panel ──
    const previewPanel = document.createElement('div')
    previewPanel.className = 'fv-preview-panel'
    previewPanel.id = 'fv-preview-panel'

    const previewLabel = document.createElement('div')
    previewLabel.className = 'fv-preview-label'
    previewLabel.textContent = 'Preview'
    previewPanel.appendChild(previewLabel)

    const previewCard = document.createElement('div')
    previewCard.className = 'fv-preview-card'
    previewCard.id = 'fv-preview-card'
    previewPanel.appendChild(previewCard)

    body.appendChild(previewPanel)

    // Helper to parse environment from userAgent
    function parseEnvironment() {
      const ua = navigator.userAgent
      let os = 'Unknown OS'
      if (ua.includes('Mac OS X')) {
        const v = ua.match(/Mac OS X ([\d_]+)/)
        os = 'macOS' + (v ? ' ' + v[1].replace(/_/g, '.') : '')
      } else if (ua.includes('Windows NT')) {
        const v = ua.match(/Windows NT ([\d.]+)/)
        const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }
        os = 'Windows' + (v ? ' ' + (map[v[1]] || v[1]) : '')
      } else if (ua.includes('Linux')) os = 'Linux'
      else if (ua.includes('Android')) os = 'Android'
      else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS'

      let browser = 'Unknown Browser'
      if (ua.includes('Edg/')) { const v = ua.match(/Edg\/([\d.]+)/); browser = 'Edge' + (v ? ' ' + v[1] : '') }
      else if (ua.includes('Chrome/')) { const v = ua.match(/Chrome\/([\d.]+)/); browser = 'Chrome' + (v ? ' ' + v[1] : '') }
      else if (ua.includes('Firefox/')) { const v = ua.match(/Firefox\/([\d.]+)/); browser = 'Firefox' + (v ? ' ' + v[1] : '') }
      else if (ua.includes('Safari/') && !ua.includes('Chrome')) { const v = ua.match(/Version\/([\d.]+)/); browser = 'Safari' + (v ? ' ' + v[1] : '') }

      const viewport = `${window.innerWidth} × ${window.innerHeight}`
      return { os, browser, viewport }
    }

    const env = parseEnvironment()
    const typeColorMap: Record<string, { bg: string; color: string }> = {
      BUG: { bg: '#fef2f2', color: '#dc2626' },
      SUGGESTION: { bg: '#fffbeb', color: '#d97706' },
      QUESTION: { bg: '#eff6ff', color: '#2563eb' },
      PRAISE: { bg: '#f0fdf4', color: '#16a34a' },
    }
    const sevColorMap: Record<string, string> = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' }
    const sevLabelMap: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' }
    const typeIconSmall: Record<string, string> = {
      BUG: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 116 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>`,
      SUGGESTION: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 006 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`,
      QUESTION: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
      PRAISE: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H4a2 2 0 01-2-2v-8a2 2 0 012-2h2.76a2 2 0 001.79-1.11L12 2a3.13 3.13 0 013 3.88z"/></svg>`,
    }

    function updatePreview() {
      const card = previewCard
      if (!card) return
      card.innerHTML = ''

      const currentType = typeHidden.value
      const currentSev = sevHidden.value
      const titleVal = titleInput.value.trim()
      const commentVal = textarea.value.trim()
      const stepsVal = stepsTextarea.value.trim()
      const expectedVal = expectedTextarea.value.trim()
      const actualVal = actualTextarea.value.trim()
      const tc = typeColorMap[currentType] || typeColorMap.BUG

      // Type badge
      const badgeWrap = document.createElement('div')
      const badge = document.createElement('span')
      badge.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${tc.bg};color:${tc.color};`
      badge.innerHTML = `${typeIconSmall[currentType] || typeIconSmall.BUG} ${typeLabels[currentType] || 'Bug'}`
      badgeWrap.appendChild(badge)
      card.appendChild(badgeWrap)

      // Title
      const titleEl = document.createElement('h3')
      titleEl.style.cssText = 'font-size:18px;font-weight:700;color:#111827;margin:0;line-height:1.3;'
      if (titleVal) {
        titleEl.textContent = titleVal
      } else {
        titleEl.innerHTML = '<span style="color:#d1d5db;font-style:italic;font-weight:400;font-size:14px;">Sem título</span>'
      }
      card.appendChild(titleEl)

      // Description
      if (commentVal) {
        const descWrap = document.createElement('div')
        const descLabel = document.createElement('div')
        descLabel.className = 'fv-preview-section-title'
        descLabel.textContent = 'Descrição'
        descWrap.appendChild(descLabel)
        const descText = document.createElement('p')
        descText.className = 'fv-preview-text'
        descText.textContent = commentVal
        descWrap.appendChild(descText)
        card.appendChild(descWrap)
      } else {
        const placeholder = document.createElement('p')
        placeholder.className = 'fv-preview-placeholder'
        placeholder.textContent = 'Aguardando descrição...'
        card.appendChild(placeholder)
      }

      // Steps to reproduce
      if (currentType === 'BUG' && stepsVal) {
        const stepsWrap = document.createElement('div')
        const stepsLabel = document.createElement('div')
        stepsLabel.className = 'fv-preview-section-title'
        stepsLabel.textContent = 'Passos para reproduzir'
        stepsWrap.appendChild(stepsLabel)
        const stepsList = document.createElement('div')
        stepsList.style.cssText = 'font-size:13px;color:#374151;line-height:1.6;'
        stepsVal.split('\n').filter((l: string) => l.trim()).forEach((line: string, i: number) => {
          const row = document.createElement('div')
          row.style.cssText = 'display:flex;gap:6px;margin-bottom:2px;'
          row.innerHTML = `<span style="color:#9ca3af;font-weight:500;flex-shrink:0;">${i + 1}.</span><span>${line.replace(/^\d+[\.\)]\s*/, '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
          stepsList.appendChild(row)
        })
        stepsWrap.appendChild(stepsList)
        card.appendChild(stepsWrap)
      }

      // Expected result
      if (currentType === 'BUG' && expectedVal) {
        const expWrap = document.createElement('div')
        const expLabel = document.createElement('div')
        expLabel.style.cssText = 'font-size:12px;font-weight:600;color:#16a34a;margin-bottom:4px;'
        expLabel.textContent = 'Resultado esperado'
        expWrap.appendChild(expLabel)
        const expText = document.createElement('p')
        expText.className = 'fv-preview-text'
        expText.textContent = expectedVal
        expWrap.appendChild(expText)
        card.appendChild(expWrap)
      }

      // Actual result
      if (currentType === 'BUG' && actualVal) {
        const actWrap = document.createElement('div')
        const actLabel = document.createElement('div')
        actLabel.style.cssText = 'font-size:12px;font-weight:600;color:#dc2626;margin-bottom:4px;'
        actLabel.textContent = 'Resultado real'
        actWrap.appendChild(actLabel)
        const actText = document.createElement('p')
        actText.className = 'fv-preview-text'
        actText.textContent = actualVal
        actWrap.appendChild(actText)
        card.appendChild(actWrap)
      }

      // Screenshot thumbnail
      {
        const ssWrap = document.createElement('div')
        const ssLbl = document.createElement('div')
        ssLbl.className = 'fv-preview-section-title'
        ssLbl.textContent = 'Screenshot'
        ssWrap.appendChild(ssLbl)

        const capturingEl = document.createElement('div')
        capturingEl.className = 'fv-preview-capturing'
        capturingEl.style.cssText = 'padding:12px;text-align:center;font-size:12px;color:#9ca3af;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;display:' + (screenshotUrl ? 'none' : 'block') + ';'
        capturingEl.textContent = 'Capturando screenshot...'
        ssWrap.appendChild(capturingEl)

        const ssImg = document.createElement('img')
        ssImg.className = 'fv-preview-screenshot'
        ssImg.alt = 'Screenshot'
        ssImg.style.cssText = 'width:100%;border-radius:8px;border:1px solid #e5e7eb;display:' + (screenshotUrl ? 'block' : 'none') + ';'
        if (screenshotUrl) ssImg.src = screenshotUrl
        ssWrap.appendChild(ssImg)
        card.appendChild(ssWrap)
      }

      // Priority
      if (currentType === 'BUG') {
        const priWrap = document.createElement('div')
        priWrap.style.cssText = 'display:flex;align-items:center;gap:8px;'
        const priLabel = document.createElement('span')
        priLabel.style.cssText = 'font-size:12px;font-weight:600;color:#6b7280;'
        priLabel.textContent = 'Prioridade'
        priWrap.appendChild(priLabel)
        const priVal = document.createElement('span')
        const sc = sevColorMap[currentSev] || '#f59e0b'
        priVal.style.cssText = `display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${sc}15;color:${sc};`
        priVal.textContent = sevLabelMap[currentSev] || 'Média'
        priWrap.appendChild(priVal)
        card.appendChild(priWrap)
      }

      // Metadata section
      const meta = document.createElement('div')
      meta.className = 'fv-preview-meta'

      // Source URL
      const urlRow = document.createElement('div')
      urlRow.className = 'fv-preview-meta-row'
      urlRow.innerHTML = `<span class="fv-preview-meta-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></span><span style="color:#2563eb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${window.location.href.replace(/</g, '&lt;')}</span>`
      meta.appendChild(urlRow)

      // OS + Browser
      if (env.os) {
        const osRow = document.createElement('div')
        osRow.className = 'fv-preview-meta-row'
        osRow.innerHTML = `<span class="fv-preview-meta-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span><span style="color:#374151;">${env.os} • ${env.browser}</span>`
        meta.appendChild(osRow)
      }

      // Viewport
      if (env.viewport) {
        const vpRow = document.createElement('div')
        vpRow.className = 'fv-preview-meta-row'
        vpRow.innerHTML = `<span class="fv-preview-meta-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3H3v18h18V3z"/><path d="M21 9H3"/><path d="M9 21V9"/></svg></span><span style="color:#374151;">${env.viewport}</span>`
        meta.appendChild(vpRow)
      }

      // Console logs summary
      if (consoleLogs.length > 0) {
        const errors = consoleLogs.filter(l => l.level === 'error').length
        const warnings = consoleLogs.filter(l => l.level === 'warn').length
        const logRow = document.createElement('div')
        logRow.className = 'fv-preview-meta-row'
        let logText = ''
        if (errors > 0) logText += `<span style="color:#dc2626;font-weight:500;">${errors} error${errors !== 1 ? 's' : ''}</span>`
        if (warnings > 0) logText += `${logText ? ' ' : ''}<span style="color:#d97706;font-weight:500;">${warnings} warning${warnings !== 1 ? 's' : ''}</span>`
        if (!errors && !warnings) logText = `<span style="color:#374151;">${consoleLogs.length} log${consoleLogs.length !== 1 ? 's' : ''}</span>`
        logRow.innerHTML = `<span class="fv-preview-meta-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span><span style="display:flex;gap:8px;">${logText}</span>`
        meta.appendChild(logRow)
      }

      // Network logs summary
      if (networkLogs.length > 0) {
        const failed = networkLogs.filter(l => l.status >= 400).length
        const netRow = document.createElement('div')
        netRow.className = 'fv-preview-meta-row'
        netRow.innerHTML = `<span class="fv-preview-meta-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg></span><span style="color:#374151;">${networkLogs.length} request${networkLogs.length !== 1 ? 's' : ''}${failed > 0 ? ` <span style="color:#dc2626;">(${failed} failed)</span>` : ''}</span>`
        meta.appendChild(netRow)
      }

      card.appendChild(meta)
    }

    // Initial preview render
    updatePreview()

    // Attach input listeners for live preview updates
    titleInput.addEventListener('input', updatePreview)
    textarea.addEventListener('input', updatePreview)
    stepsTextarea.addEventListener('input', updatePreview)
    expectedTextarea.addEventListener('input', updatePreview)
    actualTextarea.addEventListener('input', updatePreview)

    // Also update preview on type/severity changes — patch into existing click handlers
    const origTypeClickHandlers = typeBtns.map((btn) => {
      const origHandler = () => { updatePreview() }
      btn.addEventListener('click', origHandler)
      return origHandler
    })
    sevBtns.forEach((btn) => btn.addEventListener('click', updatePreview))

    // Footer
    const isDemo = PROJECT_ID === 'demo'
    const footer = document.createElement('div')
    footer.className = 'fv-footer'
    const submitBtn = document.createElement('button')
    submitBtn.className = 'fv-submit'
    submitBtn.id = 'fv-submit-btn'
    submitBtn.textContent = isDemo ? 'Enviar demonstração' : 'Enviar Bug'
    submitBtn.addEventListener('click', isDemo ? handleDemoSubmit : handleSubmit)
    footer.appendChild(submitBtn)

    const powered = document.createElement('div')
    powered.className = 'fv-powered'
    powered.innerHTML = 'Powered by <a href="https://buug.io" target="_blank">Buug</a>'
    footer.appendChild(powered)
    panel.appendChild(footer)
  }

  function renderSuccess(panel: HTMLElement, isDemoSuccess = false) {
    const header = document.createElement('div')
    header.className = 'fv-header'
    header.innerHTML = `<h2>Reportar</h2>`
    const closeBtn = document.createElement('button')
    closeBtn.className = 'fv-close'
    closeBtn.innerHTML = closeIcon
    closeBtn.addEventListener('click', close)
    header.appendChild(closeBtn)
    panel.appendChild(header)

    const success = document.createElement('div')
    success.className = 'fv-success'

    if (isDemoSuccess) {
      success.innerHTML = `
        <div class="fv-success-icon">${checkIcon}</div>
        <h3>É assim que funciona!</h3>
        <p>Esse é o widget que seus usuários verão. Screenshot, logs e replay são capturados automaticamente.</p>
      `
    } else {
      success.innerHTML = `
        <div class="fv-success-icon">${checkIcon}</div>
        <h3>Feedback enviado!</h3>
        <p>Obrigado pela contribuição.</p>
      `
    }
    panel.appendChild(success)

    // Add confetti particles
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div')
      particle.className = 'fv-confetti-particle'
      particle.style.background = colors[i % colors.length]
      particle.style.left = `${20 + Math.random() * 60}%`
      particle.style.top = `${40 + Math.random() * 20}%`
      particle.style.animationDelay = `${0.3 + Math.random() * 0.5}s`
      particle.style.animationDuration = `${0.8 + Math.random() * 0.6}s`
      success.appendChild(particle)
    }
  }

  async function handleDemoSubmit() {
    const submitBtn = shadow.querySelector('#fv-submit-btn') as HTMLButtonElement
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.innerHTML = '<div class="fv-spinner"></div> Enviando...'
    }

    // Simulate a brief loading delay for realism
    await new Promise((resolve) => setTimeout(resolve, 1200))

    submitted = true
    demoSubmitted = true
    renderPanel()

    setTimeout(close, 4000)
  }

  async function open() {
    // Show loading animation on trigger while preparing
    trigger.classList.add('fv-trigger-loading')

    // Pause recording — we only want events from before the modal opened
    pauseRecording()

    // Do all async work (config fetch + screenshot) while trigger stays visible with loading
    const [freshConfig, ss] = await Promise.all([
      fetchConfig(),
      captureScreenshot(),
    ])

    if (!freshConfig.blocked) {
      config.limitReached = freshConfig.limitReached
      config.paused = freshConfig.paused
    }

    isOpen = true
    submitted = false
    isCapturing = false
    screenshotUrl = ss

    // Now hide trigger and show modal
    trigger.classList.remove('fv-trigger-loading')
    trigger.style.display = 'none'
    renderPanel()

    // Skip screenshot update if limit reached or paused (form won't show)
    if (config.limitReached || config.paused) return

    // Update screenshot in preview panel without re-rendering the whole modal
    const previewImg = shadow.querySelector('.fv-preview-screenshot') as HTMLImageElement
    const previewCapturing = shadow.querySelector('.fv-preview-capturing') as HTMLElement
    if (previewImg && ss) {
      previewImg.src = ss
      previewImg.style.display = 'block'
    }
    if (previewCapturing) {
      previewCapturing.style.display = 'none'
    }
  }

  function close() {
    isOpen = false
    trigger.style.display = 'flex'
    renderPanel()
    // Clear events and restart recording for the next report
    clearAndRestartRecording()
  }

  async function handleSubmit() {
    const titleEl = shadow.querySelector('#fv-title') as HTMLInputElement
    const commentEl = shadow.querySelector('#fv-comment') as HTMLTextAreaElement
    const typeEl = shadow.querySelector('#fv-type') as HTMLInputElement
    const severityEl = shadow.querySelector('#fv-severity') as HTMLInputElement
    const stepsEl = shadow.querySelector('#fv-steps') as HTMLTextAreaElement
    const expectedEl = shadow.querySelector('#fv-expected') as HTMLTextAreaElement
    const actualEl = shadow.querySelector('#fv-actual') as HTMLTextAreaElement
    const submitBtn = shadow.querySelector('#fv-submit-btn') as HTMLButtonElement
    const serverErrorEl = shadow.querySelector('#fv-server-error') as HTMLElement
    const commentErrorEl = commentEl?.parentElement?.querySelector('.fv-error-msg') as HTMLElement

    const comment = commentEl?.value?.trim() || ''
    if (comment.length < 10) {
      if (commentErrorEl) {
        commentErrorEl.textContent = 'A descrição deve ter pelo menos 10 caracteres.'
        commentErrorEl.style.display = 'block'
      }
      return
    }
    if (commentErrorEl) commentErrorEl.style.display = 'none'
    if (serverErrorEl) serverErrorEl.style.display = 'none'

    isSubmitting = true
    submitBtn.disabled = true
    submitBtn.innerHTML = '<div class="fv-spinner"></div> Enviando...'

    const feedbackType = typeEl?.value || 'BUG'

    const feedbackTitle = titleEl?.value?.trim() || ''

    // In proxy/shared URL mode, rrweb replay is unreliable (resources from
    // proxied site don't load correctly), so we skip sending rrweb events.
    const isProxyMode = !!getProxyIframe()

    const payload: any = {
      projectId: PROJECT_ID,
      title: feedbackTitle || undefined,
      comment,
      type: feedbackType,
      consoleLogs: consoleLogs.slice(-50),
      networkLogs: networkLogs.slice(-50),
      rrwebEvents: isProxyMode ? [] : rrwebEvents.slice(-MAX_RRWEB_EVENTS),
      pageUrl: isProxyMode && proxyPageUrl ? proxyPageUrl : window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth} × ${window.innerHeight}`,
      attachments: embedAttachments.length > 0 ? embedAttachments : undefined,
      source: isProxyMode ? 'shared-url' : 'embed',
    }

    if (feedbackType === 'BUG') {
      payload.severity = severityEl?.value || 'MEDIUM'
      const steps = stepsEl?.value?.trim()
      const expected = expectedEl?.value?.trim()
      const actual = actualEl?.value?.trim()
      if (steps || expected || actual) {
        payload.metadata = {
          ...(steps ? { stepsToReproduce: steps } : {}),
          ...(expected ? { expectedResult: expected } : {}),
          ...(actual ? { actualResult: actual } : {}),
        }
      }
    }

    // Enhanced session capture data
    const sessionCapture: any = {}
    if (clickBreadcrumbs.length > 0) sessionCapture.clickBreadcrumbs = clickBreadcrumbs.slice(-MAX_BREADCRUMBS)
    if (rageClicks.length > 0) sessionCapture.rageClicks = rageClicks.slice(-MAX_RAGE_CLICKS)
    if (deadClicks.length > 0) sessionCapture.deadClicks = deadClicks.slice(-MAX_DEAD_CLICKS)
    const perf = collectPerformanceMetrics()
    if (perf.lcp || perf.cls || perf.inp || perf.pageLoadMs) sessionCapture.performance = perf
    const conn = collectConnectionInfo()
    if (conn) sessionCapture.connection = conn
    sessionCapture.display = collectDisplayInfo()
    const geo = collectGeoHint()
    if (geo) sessionCapture.geo = geo

    if (Object.keys(sessionCapture).length > 0) {
      payload.metadata = { ...payload.metadata, ...sessionCapture }
    }

    const finalScreenshot = getFinalScreenshot()
    if (finalScreenshot) {
      payload.screenshotBase64 = finalScreenshot
    }

    // Ensure payload doesn't exceed ~4MB (Vercel limit is 4.5MB)
    const payloadStr = JSON.stringify(payload)
    if (payloadStr.length > 3_800_000) {
      // Drop rrweb events first (heaviest part), then screenshot quality
      payload.rrwebEvents = payload.rrwebEvents?.slice(-20) || []
      const reducedStr = JSON.stringify(payload)
      if (reducedStr.length > 3_800_000 && payload.screenshotBase64) {
        // Still too large — remove screenshot
        payload.screenshotBase64 = undefined
      }
    }

    try {
      const res = await originalFetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      submitted = true
      isSubmitting = false
      renderPanel()

      setTimeout(close, 2500)
    } catch (err: any) {
      isSubmitting = false
      submitBtn.disabled = false
      const currentType = (shadow.querySelector('#fv-type') as HTMLInputElement)?.value || 'BUG'
      const tLabels: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
      submitBtn.innerHTML = `Enviar ${tLabels[currentType] || 'Bug'}`

      // If limit reached (429), update config so next open shows limit message
      if (err.message?.includes('Limite')) {
        config.limitReached = true
        close()
        // Reopen to show limit reached UI
        setTimeout(() => { isOpen = true; submitted = false; renderPanel() }, 300)
        return
      }

      if (serverErrorEl) {
        serverErrorEl.textContent = err.message || 'Erro ao enviar feedback.'
        serverErrorEl.style.display = 'block'
      }
    }
  }

  trigger.addEventListener('click', open)

  // Expose global API for programmatic control
  ;(window as any).FeedbackView = { open, close, demoSubmit: handleDemoSubmit }
  ;(host as any).__fv = { open, close }

  // Listen for programmatic open requests
  document.addEventListener('feedbackview:open', open)

  // Listen for show-trigger requests (for demo pages where trigger starts hidden)
  document.addEventListener('feedbackview:show-trigger', () => {
    trigger.classList.remove('fv-trigger-hidden')
    trigger.classList.add('fv-trigger-entering')
    trigger.addEventListener('animationend', () => {
      trigger.classList.remove('fv-trigger-entering')
    }, { once: true })
  })
}

// Initialize widget
async function init() {
  // Don't render widget inside iframes (proxy mode uses parent's embed.js)
  if (window.self !== window.top) return

  // Prevent duplicate widget initialization
  if ((window as any).__feedbackview_initialized) return
  ;(window as any).__feedbackview_initialized = true

  const config = await fetchConfig()
  if (config.blocked) return
  createWidget(config)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
