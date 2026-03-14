// @feedbackview/embed — standalone feedback widget
// Injected via <script src="https://app.feedbackview.com/embed.js" data-project="ID"></script>
// Collects console, network, errors, rrweb session replay + shows feedback UI

import { record } from 'rrweb'

// ─── Config ──────────────────────────────────────────────────────────────────
const SCRIPT_EL = document.currentScript as HTMLScriptElement | null
const PROJECT_ID = SCRIPT_EL?.dataset.project || ''
const API_BASE = SCRIPT_EL?.dataset.api || SCRIPT_EL?.src.replace(/\/embed\.js.*$/, '') || ''

if (!PROJECT_ID) {
  console.warn('[FeedbackView] Missing data-project attribute on embed script.')
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

// ─── Widget UI (Shadow DOM) ──────────────────────────────────────────────────
function createWidget() {
  const host = document.createElement('div')
  host.id = 'feedbackview-embed'
  host.classList.add('feedback-ignore')
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'closed' })

  const style = document.createElement('style')
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

    .fv-trigger {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #4f46e5;
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 2147483646;
    }
    .fv-trigger:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5);
    }
    .fv-trigger svg { width: 24px; height: 24px; }

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
      right: 0;
      top: 0;
      height: 100%;
      width: 420px;
      max-width: 100vw;
      background: #fff;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 24px rgba(0,0,0,0.15);
      transform: translateX(100%);
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
      padding: 20px;
    }

    .fv-screenshot {
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      margin-bottom: 16px;
      position: relative;
    }
    .fv-screenshot img {
      width: 100%;
      display: block;
    }
    .fv-screenshot-loading {
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 13px;
    }
    .fv-screenshot-label {
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }

    .fv-field { margin-bottom: 16px; }
    .fv-label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }
    .fv-required { color: #ef4444; }

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
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
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
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .fv-error-msg {
      margin-top: 4px;
      font-size: 12px;
      color: #dc2626;
    }

    .fv-logs-summary {
      font-size: 12px;
      color: #6b7280;
      padding: 10px 14px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .fv-footer {
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
    }

    .fv-submit {
      width: 100%;
      padding: 10px 16px;
      background: #4f46e5;
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
    .fv-submit:hover { background: #4338ca; }
    .fv-submit:disabled { background: #a5b4fc; cursor: not-allowed; }

    .fv-success {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .fv-success-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #dcfce7;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .fv-success-icon svg { width: 28px; height: 28px; color: #16a34a; }
    .fv-success h3 { font-size: 18px; font-weight: 600; color: #111827; }
    .fv-success p { font-size: 14px; color: #6b7280; }

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

  // Icons
  const msgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
  const closeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

  // Trigger button
  const trigger = document.createElement('button')
  trigger.className = 'fv-trigger'
  trigger.innerHTML = msgIcon
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
      renderSuccess(panel)
      return
    }

    // Header
    const header = document.createElement('div')
    header.className = 'fv-header'
    header.innerHTML = `<h2>Enviar Feedback</h2>`
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

    // Screenshot
    const ssLabel = document.createElement('div')
    ssLabel.className = 'fv-screenshot-label'
    ssLabel.textContent = 'Screenshot'
    body.appendChild(ssLabel)

    const ssContainer = document.createElement('div')
    ssContainer.className = 'fv-screenshot'
    if (isCapturing) {
      ssContainer.innerHTML = '<div class="fv-screenshot-loading">Capturando screenshot...</div>'
    } else if (screenshotUrl) {
      const img = document.createElement('img')
      img.src = screenshotUrl
      img.alt = 'Screenshot'
      ssContainer.appendChild(img)
    } else {
      ssContainer.innerHTML = '<div class="fv-screenshot-loading">Screenshot não disponível</div>'
    }
    body.appendChild(ssContainer)

    // Comment
    const commentField = document.createElement('div')
    commentField.className = 'fv-field'
    commentField.innerHTML = `<label class="fv-label">Comentário <span class="fv-required">*</span></label>`
    const textarea = document.createElement('textarea')
    textarea.className = 'fv-textarea'
    textarea.rows = 4
    textarea.placeholder = 'Descreva o problema ou sugestão... (mínimo 10 caracteres)'
    textarea.id = 'fv-comment'
    commentField.appendChild(textarea)
    const commentError = document.createElement('div')
    commentError.className = 'fv-error-msg'
    commentError.style.display = 'none'
    commentField.appendChild(commentError)
    body.appendChild(commentField)

    // Type
    const typeField = document.createElement('div')
    typeField.className = 'fv-field'
    typeField.innerHTML = `
      <label class="fv-label">Tipo</label>
      <select class="fv-select" id="fv-type">
        <option value="BUG">Bug</option>
        <option value="SUGGESTION">Sugestão</option>
        <option value="QUESTION">Dúvida</option>
        <option value="PRAISE">Elogio</option>
      </select>
    `
    body.appendChild(typeField)

    // Severity
    const severityField = document.createElement('div')
    severityField.className = 'fv-field'
    severityField.id = 'fv-severity-field'
    severityField.innerHTML = `
      <label class="fv-label">Severidade</label>
      <select class="fv-select" id="fv-severity">
        <option value="LOW">Baixa</option>
        <option value="MEDIUM" selected>Média</option>
        <option value="HIGH">Alta</option>
        <option value="CRITICAL">Crítica</option>
      </select>
    `
    body.appendChild(severityField)

    // Toggle severity visibility based on type
    const typeSelect = body.querySelector('#fv-type') as HTMLSelectElement
    typeSelect.addEventListener('change', () => {
      severityField.style.display = typeSelect.value === 'BUG' ? 'block' : 'none'
    })

    // Logs summary
    const logsSummary = document.createElement('div')
    logsSummary.className = 'fv-logs-summary'
    logsSummary.textContent = `${consoleLogs.length} log(s) de console · ${networkLogs.length} requisição(ões) · ${rrwebEvents.length} evento(s) de replay`
    body.appendChild(logsSummary)

    // Server error placeholder
    const serverError = document.createElement('div')
    serverError.className = 'fv-server-error'
    serverError.style.display = 'none'
    serverError.id = 'fv-server-error'
    body.appendChild(serverError)

    // Footer
    const footer = document.createElement('div')
    footer.className = 'fv-footer'
    const submitBtn = document.createElement('button')
    submitBtn.className = 'fv-submit'
    submitBtn.id = 'fv-submit-btn'
    submitBtn.textContent = 'Enviar Feedback'
    submitBtn.addEventListener('click', handleSubmit)
    footer.appendChild(submitBtn)

    const powered = document.createElement('div')
    powered.className = 'fv-powered'
    powered.innerHTML = 'Powered by <a href="https://feedbackview.com" target="_blank">FeedbackView</a>'
    footer.appendChild(powered)
    panel.appendChild(footer)
  }

  function renderSuccess(panel: HTMLElement) {
    const header = document.createElement('div')
    header.className = 'fv-header'
    header.innerHTML = `<h2>Enviar Feedback</h2>`
    const closeBtn = document.createElement('button')
    closeBtn.className = 'fv-close'
    closeBtn.innerHTML = closeIcon
    closeBtn.addEventListener('click', close)
    header.appendChild(closeBtn)
    panel.appendChild(header)

    const success = document.createElement('div')
    success.className = 'fv-success'
    success.innerHTML = `
      <div class="fv-success-icon">${checkIcon}</div>
      <h3>Feedback enviado!</h3>
      <p>Obrigado pela contribuição.</p>
    `
    panel.appendChild(success)
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
    const commentEl = shadow.querySelector('#fv-comment') as HTMLTextAreaElement
    const typeEl = shadow.querySelector('#fv-type') as HTMLSelectElement
    const severityEl = shadow.querySelector('#fv-severity') as HTMLSelectElement
    const submitBtn = shadow.querySelector('#fv-submit-btn') as HTMLButtonElement
    const serverErrorEl = shadow.querySelector('#fv-server-error') as HTMLElement
    const commentErrorEl = commentEl?.parentElement?.querySelector('.fv-error-msg') as HTMLElement

    const comment = commentEl?.value?.trim() || ''
    if (comment.length < 10) {
      if (commentErrorEl) {
        commentErrorEl.textContent = 'O comentário deve ter pelo menos 10 caracteres.'
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

    const payload: any = {
      projectId: PROJECT_ID,
      comment,
      type: feedbackType,
      consoleLogs: consoleLogs.slice(-50),
      networkLogs: networkLogs.slice(-50),
      rrwebEvents: rrwebEvents.slice(-MAX_RRWEB_EVENTS),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
    }

    if (feedbackType === 'BUG') {
      payload.severity = severityEl?.value || 'MEDIUM'
    }

    if (screenshotUrl) {
      payload.screenshotBase64 = screenshotUrl
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
      submitBtn.innerHTML = 'Enviar Feedback'
      if (serverErrorEl) {
        serverErrorEl.textContent = err.message || 'Erro ao enviar feedback.'
        serverErrorEl.style.display = 'block'
      }
    }
  }

  trigger.addEventListener('click', open)
}

// Initialize widget
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWidget)
} else {
  createWidget()
}
