'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, Monitor, Globe, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

const SessionReplay = dynamic(() => import('@/components/viewer/SessionReplay'), { ssr: false })

interface NetworkLog {
  method: string
  url: string
  status?: number
  duration?: number
}

interface ConsoleLog {
  level: string
  message: string
  timestamp?: number
}

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  screenshotUrl?: string
  replayUrl?: string
  pageUrl?: string
  userAgent?: string
  createdAt: string
  projectId: string
  consoleLogs?: ConsoleLog[]
  networkLogs?: NetworkLog[]
  metadata?: { rrwebEvents?: any[] } | null
}

interface FeedbackClientProps {
  feedback: Feedback | null
  error: string | null
}

const STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'CLOSED', label: 'Fechado' },
]

function AccordionSection({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          {title}
          {count !== undefined && (
            <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
              {count}
            </span>
          )}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function FeedbackClient({
  feedback,
  error,
}: FeedbackClientProps) {
  const [status, setStatus] = useState(feedback?.status ?? 'OPEN')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  if (error || !feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Feedback não encontrado.'}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    )
  }

  async function handleStatusChange(newStatus: string) {
    setStatusError(null)
    setStatusSaving(true)
    try {
      await api.feedbacks.updateStatus(feedback!.id, newStatus)
      setStatus(newStatus)
    } catch (err: any) {
      setStatusError('Erro ao atualizar status.')
    } finally {
      setStatusSaving(false)
    }
  }

  const consoleLogs = feedback.consoleLogs ?? []
  const networkLogs = feedback.networkLogs ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link
            href={`/projects/${feedback.projectId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Projeto
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900 truncate">Feedback #{feedback.id.slice(0, 8)}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Screenshot */}
          <div className="lg:col-span-2 space-y-5">
            {feedback.screenshotUrl ? (
              <div>
                <h2 className="text-sm font-medium text-gray-700 mb-2">Screenshot</h2>
                <img
                  src={feedback.screenshotUrl}
                  alt="Feedback screenshot"
                  className="w-full rounded-xl border border-gray-200 shadow-sm"
                />
              </div>
            ) : (
              <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center">
                <p className="text-gray-400 text-sm">Sem screenshot</p>
              </div>
            )}

            {/* Comment */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Comentário</h3>
              <p className="text-gray-800 text-sm leading-relaxed">{feedback.comment}</p>
            </div>

            {/* Console logs accordion */}
            <AccordionSection title="Console Logs" count={consoleLogs.length}>
              {consoleLogs.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum log de console capturado.</p>
              ) : (
                <pre className="text-xs font-mono bg-gray-900 text-green-400 rounded-lg p-4 overflow-auto max-h-64 whitespace-pre-wrap">
                  {JSON.stringify(consoleLogs, null, 2)}
                </pre>
              )}
            </AccordionSection>

            {/* Network logs accordion */}
            <AccordionSection title="Network Logs" count={networkLogs.length}>
              {networkLogs.length === 0 ? (
                <p className="text-gray-400 text-sm">Nenhum log de rede capturado.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 pr-3 font-medium text-gray-500">Método</th>
                        <th className="text-left py-2 pr-3 font-medium text-gray-500">URL</th>
                        <th className="text-left py-2 pr-3 font-medium text-gray-500">Status</th>
                        <th className="text-left py-2 font-medium text-gray-500">Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {networkLogs.map((log, i) => (
                        <tr key={i} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3 font-mono font-bold text-indigo-600">{log.method}</td>
                          <td className="py-1.5 pr-3 text-gray-600 max-w-[200px] truncate">{log.url}</td>
                          <td className="py-1.5 pr-3">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono ${
                                log.status && log.status >= 400
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {log.status ?? '-'}
                            </span>
                          </td>
                          <td className="py-1.5 text-gray-500">
                            {log.duration != null ? `${log.duration}ms` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AccordionSection>

            {/* rrweb replay section */}
            {feedback.metadata?.rrwebEvents && feedback.metadata.rrwebEvents.length > 0 && (
              <AccordionSection title="Session Replay" count={feedback.metadata.rrwebEvents.length}>
                <SessionReplay events={feedback.metadata.rrwebEvents} />
              </AccordionSection>
            )}
          </div>

          {/* Right: Metadata & status */}
          <div className="space-y-4">
            {/* Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {statusSaving && (
                <p className="text-xs text-gray-400 mt-1">Salvando...</p>
              )}
              {statusError && (
                <p className="text-xs text-red-600 mt-1">{statusError}</p>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Metadados</h3>

              <div className="flex flex-wrap gap-2">
                <Badge variant={feedback.type as any}>{feedback.type}</Badge>
                {feedback.severity && (
                  <Badge variant={feedback.severity as any}>{feedback.severity}</Badge>
                )}
              </div>

              {feedback.pageUrl && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Página</p>
                  <a
                    href={feedback.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline break-all"
                  >
                    {feedback.pageUrl}
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-400 mb-0.5">Data</p>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <p className="text-xs text-gray-600">{formatDate(feedback.createdAt)}</p>
                </div>
              </div>

              {feedback.userAgent && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">User Agent</p>
                  <div className="flex items-start gap-1">
                    <Monitor className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 break-all">{feedback.userAgent}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Comments placeholder */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Comentários</h3>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <AlertCircle className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Em breve</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
