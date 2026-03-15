// @feedbackview/embed — standalone feedback widget
// Injected via <script src="https://app.feedbackview.com/embed.js" data-project="ID"></script>
// Collects console, network, errors, rrweb session replay + shows feedback UI

import { record } from 'rrweb'

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
}

const DEFAULT_CONFIG: WidgetConfig = {
  widgetPosition: 'bottom-right',
  widgetColor: '#4f46e5',
}

// ─── Data collection ─────────────────────────────────────────────────────────
interface ConsoleLog { level: string; args: unknown[]; timestamp: number }
interface NetworkLog { method: string; url: string; status: number; duration: number }
interface RRWebEvent { type: number; data: any; timestamp: number }

const consoleLogs: ConsoleLog[] = []
const networkLogs: NetworkLog[] = []
const rrwebEvents: RRWebEvent[] = []
const MAX_RRWEB_EVENTS = 200
const MAX_LOGS = 100

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
  // Find index of most recent full snapshot (type 2)
  let lastSnapshotIdx = -1
  for (let i = rrwebEvents.length - 1; i >= 0; i--) {
    if (rrwebEvents[i].type === 2) {
      lastSnapshotIdx = i
      break
    }
  }
  if (lastSnapshotIdx > 0) {
    // Keep from the last snapshot onward
    rrwebEvents.splice(0, lastSnapshotIdx)
  } else {
    // No snapshot found or it's already at 0 — just trim oldest
    rrwebEvents.splice(0, rrwebEvents.length - MAX_RRWEB_EVENTS)
  }
}

function startRecording() {
  record({
    emit(event) {
      rrwebEvents.push(event as RRWebEvent)
      trimRrwebEvents()
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

// ─── Screenshot capture ──────────────────────────────────────────────────────
async function captureScreenshot(): Promise<string | null> {
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
    return canvas.toDataURL('image/jpeg', 0.85)
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
  if (!PROJECT_ID || !API_BASE) return DEFAULT_CONFIG
  try {
    const res = await originalFetch(`${API_BASE}/api/projects/${PROJECT_ID}/config`)
    if (!res.ok) return DEFAULT_CONFIG
    const data = await res.json()
    return {
      widgetPosition: data.widgetPosition || DEFAULT_CONFIG.widgetPosition,
      widgetColor: data.widgetColor && /^#[0-9a-fA-F]{6}$/.test(data.widgetColor) ? data.widgetColor : DEFAULT_CONFIG.widgetColor,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

// ─── Position helpers ───────────────────────────────────────────────────────
function getPositionCSS(position: string) {
  switch (position) {
    case 'top-left': return 'top: 24px; left: 24px;'
    case 'top-right': return 'top: 24px; right: 24px;'
    case 'bottom-left': return 'bottom: 24px; left: 24px;'
    default: return 'bottom: 24px; right: 24px;'
  }
}

function getPanelSide(position: string) {
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
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    @keyframes fv-trigger-bounce {
      0% { transform: scale(0) rotate(-45deg); opacity: 0; }
      50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
      70% { transform: scale(0.9) rotate(-3deg); }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    .fv-trigger {
      position: fixed;
      ${getPositionCSS(config.widgetPosition)}
      height: 44px;
      padding: 0 20px;
      border-radius: 22px;
      background: ${color};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px ${hexToRgba(color, 0.4)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      white-space: nowrap;
    }
    .fv-trigger .fv-trigger-brand {
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: -0.02em;
    }
    .fv-trigger .fv-trigger-label {
      font-weight: 400;
      font-size: 0.8rem;
      opacity: 0.9;
    }
    .fv-trigger.fv-trigger-hidden {
      transform: scale(0);
      opacity: 0;
      pointer-events: none;
    }
    .fv-trigger.fv-trigger-entering {
      animation: fv-trigger-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .fv-trigger:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px ${hexToRgba(color, 0.5)};
    }

    .fv-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      z-index: 2147483646;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .fv-backdrop.open { opacity: 1; }

    .fv-panel {
      position: fixed;
      ${panelSide}: 0;
      ${panelSideOpposite}: auto;
      top: 0;
      height: 100%;
      width: 520px;
      max-width: 100vw;
      background: #fff;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      box-shadow: ${panelShadowDir} 0 24px rgba(0,0,0,0.15);
      transform: ${panelTransformHidden};
      transition: transform 0.3s ease;
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
      overflow-y: auto;
    }

    .fv-screenshot-section {
      padding: 20px;
      border-bottom: 1px solid #f3f4f6;
    }
    .fv-screenshot-label {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 12px;
    }
    .fv-screenshot-label .fv-hint {
      font-size: 12px;
      font-weight: 400;
      color: #9ca3af;
    }
    .fv-screenshot {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      background: #f3f4f6;
      position: relative;
      max-height: 240px;
    }
    .fv-screenshot canvas {
      width: 100%;
      display: block;
    }
    .fv-screenshot .fv-overlay-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      cursor: crosshair;
    }
    .fv-screenshot-loading {
      height: 192px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #9ca3af;
      font-size: 13px;
    }
    .fv-screenshot-loading .fv-spin-icon {
      width: 20px;
      height: 20px;
      border: 2px solid #d1d5db;
      border-top-color: #9ca3af;
      border-radius: 50%;
      animation: fv-spin 0.6s linear infinite;
    }
    .fv-clear-annotations {
      margin-top: 8px;
      background: none;
      border: none;
      font-size: 12px;
      color: #ef4444;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
    }
    .fv-clear-annotations:hover { color: #b91c1c; }

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
      resize: none;
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
    return merged.toDataURL('image/jpeg', 0.85)
  }

  // Icons
  const bugIcon = `<svg viewBox="0 0 200 220" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M75,40 Q60,22 50,8" stroke-width="4.5"/><circle cx="48" cy="6" r="5" fill="currentColor" stroke="none"/><path d="M105,36 Q114,18 118,5" stroke-width="4.5"/><circle cx="119" cy="3" r="5" fill="currentColor" stroke="none"/><circle cx="90" cy="52" r="30" stroke-width="5"/><circle cx="76" cy="48" r="9" stroke-width="4"/><circle cx="76" cy="48" r="4" fill="currentColor" stroke="none"/><circle cx="104" cy="48" r="9" stroke-width="4"/><circle cx="104" cy="48" r="4" fill="currentColor" stroke="none"/><ellipse cx="90" cy="115" rx="52" ry="68" stroke-width="5"/><path d="M40,88 Q90,82 140,88" stroke-width="4"/><path d="M38,115 Q90,109 142,115" stroke-width="4"/><path d="M40,142 Q90,136 140,142" stroke-width="4"/><circle cx="90" cy="108" r="24" stroke-width="4"/><ellipse cx="82" cy="102" rx="6" ry="7" fill="currentColor" stroke="none"/><ellipse cx="98" cy="102" rx="6" ry="7" fill="currentColor" stroke="none"/><path d="M87,112 L90,116 L93,112" stroke-width="3" fill="none"/><path d="M82,120 L98,120" stroke-width="3"/><line x1="85" y1="120" x2="85" y2="125" stroke-width="3"/><line x1="90" y1="120" x2="90" y2="126" stroke-width="3"/><line x1="95" y1="120" x2="95" y2="125" stroke-width="3"/><path d="M40,92 C26,86 16,78 8,68" stroke-width="4.5"/><path d="M39,115 C24,112 12,108 3,103" stroke-width="4.5"/><path d="M41,140 C28,144 18,152 10,162" stroke-width="4.5"/><path d="M140,92 C154,86 164,78 172,68" stroke-width="4.5"/><path d="M141,115 C156,112 168,108 177,103" stroke-width="4.5"/><path d="M139,140 C152,144 162,152 170,162" stroke-width="4.5"/><path d="M76,180 Q68,192 58,198" stroke-width="4.5"/><path d="M104,180 Q112,192 122,198" stroke-width="4.5"/></svg>`
  const closeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

  // Trigger button
  const hiddenTrigger = SCRIPT_EL?.dataset.hiddenTrigger === 'true' || SCRIPT_EL?.getAttribute('data-hidden-trigger') === 'true'
  const trigger = document.createElement('button')
  trigger.className = hiddenTrigger ? 'fv-trigger fv-trigger-hidden' : 'fv-trigger'
  trigger.innerHTML = `<span class="fv-trigger-brand">QBugs</span><span class="fv-trigger-label">Reportar</span>`
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

    // Body
    const body = document.createElement('div')
    body.className = 'fv-body'
    panel.appendChild(body)

    // ── Screenshot section ──
    const ssSection = document.createElement('div')
    ssSection.className = 'fv-screenshot-section'

    const ssLabel = document.createElement('div')
    ssLabel.className = 'fv-screenshot-label'
    ssLabel.innerHTML = 'Screenshot <span class="fv-hint">(arraste para destacar áreas)</span>'
    ssSection.appendChild(ssLabel)

    const ssContainer = document.createElement('div')
    ssContainer.className = 'fv-screenshot'
    if (isCapturing) {
      ssContainer.innerHTML = '<div class="fv-screenshot-loading"><div class="fv-spin-icon"></div><span>Capturando screenshot...</span></div>'
    } else if (screenshotUrl) {
      // Base canvas
      baseCanvas = document.createElement('canvas')
      ssContainer.appendChild(baseCanvas)

      // Overlay canvas for annotations
      overlayCanvas = document.createElement('canvas')
      overlayCanvas.className = 'fv-overlay-canvas'
      ssContainer.appendChild(overlayCanvas)

      // Load screenshot into base canvas
      const img = new Image()
      img.onload = () => {
        if (!baseCanvas || !overlayCanvas) return
        baseCanvas.width = img.naturalWidth
        baseCanvas.height = img.naturalHeight
        const ctx = baseCanvas.getContext('2d')
        if (ctx) ctx.drawImage(img, 0, 0)
        overlayCanvas.width = img.naturalWidth
        overlayCanvas.height = img.naturalHeight
        // Redraw any existing annotations
        redrawOverlay()
      }
      img.src = screenshotUrl

      // Mouse events for drawing
      overlayCanvas.addEventListener('mousedown', (e: MouseEvent) => {
        isDrawing = true
        drawStartPos = getCanvasPos(e)
      })
      overlayCanvas.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDrawing || !drawStartPos) return
        const pos = getCanvasPos(e)
        const currentRect = {
          x: Math.min(drawStartPos.x, pos.x),
          y: Math.min(drawStartPos.y, pos.y),
          w: Math.abs(pos.x - drawStartPos.x),
          h: Math.abs(pos.y - drawStartPos.y),
        }
        redrawOverlay(currentRect)
      })
      overlayCanvas.addEventListener('mouseup', (e: MouseEvent) => {
        if (!isDrawing || !drawStartPos) return
        const pos = getCanvasPos(e)
        const newRect = {
          x: Math.min(drawStartPos.x, pos.x),
          y: Math.min(drawStartPos.y, pos.y),
          w: Math.abs(pos.x - drawStartPos.x),
          h: Math.abs(pos.y - drawStartPos.y),
        }
        if (newRect.w > 5 && newRect.h > 5) {
          drawingRects.push(newRect)
          redrawOverlay()
          // Update clear button visibility and text
          const clearBtn = ssSection.querySelector('.fv-clear-annotations') as HTMLElement
          if (clearBtn) {
            clearBtn.style.display = 'inline'
            clearBtn.textContent = `Limpar marcações (${drawingRects.length})`
          }
        }
        isDrawing = false
        drawStartPos = null
      })
    } else {
      ssContainer.innerHTML = '<div class="fv-screenshot-loading"><span>Screenshot não disponível</span></div>'
    }
    ssSection.appendChild(ssContainer)

    // Clear annotations button
    const clearBtn = document.createElement('button')
    clearBtn.className = 'fv-clear-annotations'
    clearBtn.style.display = drawingRects.length > 0 ? 'inline' : 'none'
    clearBtn.textContent = `Limpar marcações (${drawingRects.length})`
    clearBtn.addEventListener('click', () => {
      drawingRects = []
      redrawOverlay()
      clearBtn.style.display = 'none'
    })
    ssSection.appendChild(clearBtn)

    body.appendChild(ssSection)

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
    formSection.appendChild(titleField)

    // Description
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
    const typeOptions = [
      { value: 'BUG', label: '🐛 Bug' },
      { value: 'SUGGESTION', label: '💡 Sugestão' },
      { value: 'QUESTION', label: '❓ Dúvida' },
      { value: 'PRAISE', label: '👏 Elogio' },
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
      btn.textContent = opt.label
      btn.style.cssText = `flex:1;padding:8px 4px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.15s;border:1px solid #d1d5db;background:#fff;color:#374151;`
      btn.addEventListener('click', () => {
        typeHidden.value = opt.value
        updateTypeBtns(opt.value)
        severityField.style.display = opt.value === 'BUG' ? 'block' : 'none'
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
    formSection.appendChild(severityField)
    updateSevBtns('MEDIUM')

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

    // Session replay events summary
    if (rrwebEvents.length > 0) {
      const evSummary = document.createElement('div')
      evSummary.className = 'fv-events-summary'
      evSummary.innerHTML = `<span class="fv-log-tag fv-tag-neutral">${rrwebEvents.length}</span> eventos de session replay capturados`
      formSection.appendChild(evSummary)
    }

    // Server error placeholder
    const serverError = document.createElement('div')
    serverError.className = 'fv-server-error'
    serverError.style.display = 'none'
    serverError.id = 'fv-server-error'
    formSection.appendChild(serverError)

    body.appendChild(formSection)

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
    powered.innerHTML = 'Powered by <a href="https://feedbackview.com" target="_blank">QBugs</a>'
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
    isOpen = true
    submitted = false
    isCapturing = true
    screenshotUrl = null
    trigger.style.display = 'none'
    renderPanel()

    // Capture screenshot
    const ss = await captureScreenshot()
    screenshotUrl = ss
    isCapturing = false
    renderPanel()
  }

  function close() {
    isOpen = false
    trigger.style.display = 'flex'
    renderPanel()
  }

  async function handleSubmit() {
    const titleEl = shadow.querySelector('#fv-title') as HTMLInputElement
    const commentEl = shadow.querySelector('#fv-comment') as HTMLTextAreaElement
    const typeEl = shadow.querySelector('#fv-type') as HTMLInputElement
    const severityEl = shadow.querySelector('#fv-severity') as HTMLInputElement
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

    const payload: any = {
      projectId: PROJECT_ID,
      title: feedbackTitle || undefined,
      comment,
      type: feedbackType,
      consoleLogs: consoleLogs.slice(-50),
      networkLogs: networkLogs.slice(-50),
      rrwebEvents: rrwebEvents.slice(-MAX_RRWEB_EVENTS),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      attachments: embedAttachments.length > 0 ? embedAttachments : undefined,
    }

    if (feedbackType === 'BUG') {
      payload.severity = severityEl?.value || 'MEDIUM'
    }

    const finalScreenshot = getFinalScreenshot()
    if (finalScreenshot) {
      payload.screenshotBase64 = finalScreenshot
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
      const currentType = (panel.querySelector('#fv-type') as HTMLInputElement)?.value || 'BUG'
      const tLabels: Record<string, string> = { BUG: 'Bug', SUGGESTION: 'Sugestão', QUESTION: 'Dúvida', PRAISE: 'Elogio' }
      submitBtn.innerHTML = `Enviar ${tLabels[currentType] || 'Bug'}`
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
  const config = await fetchConfig()
  createWidget(config)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
