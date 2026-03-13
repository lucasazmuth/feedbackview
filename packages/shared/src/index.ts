export type TrackerMessage =
  | { type: 'CONSOLE_LOG'; level: 'log' | 'warn' | 'error' | 'info'; args: unknown[]; timestamp: number }
  | { type: 'JS_ERROR'; message: string; stack?: string; timestamp: number }
  | { type: 'NETWORK_LOG'; method: string; url: string; status: number; duration: number; timestamp: number }
  | { type: 'RRWEB_EVENT'; event: unknown }
  | { type: 'PAGE_CHANGE'; url: string; timestamp: number }

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
