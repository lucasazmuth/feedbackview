// ─── Enhanced session capture types ──────────────────────────────────────────

export interface ClickBreadcrumb {
  ts: number
  tag: string
  text: string       // innerText, truncated 50 chars
  sel: string        // CSS selector path (max 3 levels)
  x: number
  y: number
}

export interface RageClick {
  ts: number
  count: number      // how many rapid clicks (3+)
  sel: string
  tag: string
  text: string
}

export interface DeadClick {
  ts: number
  sel: string
  tag: string
  text: string
}

export interface PerformanceMetrics {
  lcp?: number       // Largest Contentful Paint (ms)
  cls?: number       // Cumulative Layout Shift (score)
  inp?: number       // Interaction to Next Paint (ms)
  pageLoadMs?: number
  memoryMB?: number  // Chrome only
}

export interface ConnectionInfo {
  effectiveType?: string  // "4g", "3g", "2g", "slow-2g"
  downlink?: number       // Mbps
  rtt?: number            // ms
  saveData?: boolean
}

export interface DisplayInfo {
  screenW: number
  screenH: number
  dpr: number             // devicePixelRatio
  colorDepth: number
  touch: boolean
}

export interface GeoHint {
  tz: string              // e.g. "America/Sao_Paulo"
  lang: string            // navigator.language
  langs?: string[]        // navigator.languages (first 3)
}

export interface SessionCapture {
  clickBreadcrumbs?: ClickBreadcrumb[]
  rageClicks?: RageClick[]
  deadClicks?: DeadClick[]
  performance?: PerformanceMetrics
  connection?: ConnectionInfo
  display?: DisplayInfo
  geo?: GeoHint
}

// ─── Tracker message types ───────────────────────────────────────────────────

export type TrackerMessage =
  | { type: 'CONSOLE_LOG'; level: 'log' | 'warn' | 'error' | 'info'; args: unknown[]; timestamp: number }
  | { type: 'JS_ERROR'; message: string; stack?: string; timestamp: number }
  | { type: 'NETWORK_LOG'; method: string; url: string; status: number; duration: number; timestamp: number }
  | { type: 'RRWEB_EVENT'; event: unknown }
  | { type: 'PAGE_CHANGE'; url: string; timestamp: number }
  | { type: 'CLICK_BREADCRUMB'; breadcrumb: ClickBreadcrumb; timestamp: number }
  | { type: 'RAGE_CLICK'; rageClick: RageClick; timestamp: number }
  | { type: 'DEAD_CLICK'; deadClick: DeadClick; timestamp: number }
  | { type: 'PERFORMANCE_METRICS'; metrics: PerformanceMetrics; timestamp: number }

export type TrackerPayload = {
  source: 'feedbackview-tracker'
  projectId: string
} & TrackerMessage

export interface FeedbackPayload {
  projectId: string
  comment: string
  type: 'BUG' | 'SUGGESTION' | 'QUESTION' | 'PRAISE'
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  screenshotBase64?: string
  consoleLogs?: ConsolLog[]
  networkLogs?: NetworkLog[]
  replayEvents?: unknown[]
  pageUrl?: string
  userAgent?: string
}

export interface ConsolLog {
  level: string
  args: unknown[]
  timestamp: number
}

export interface NetworkLog {
  method: string
  url: string
  status: number
  duration: number
  timestamp: number
}
