'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Filter,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { api } from '@/lib/api'

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  screenshotUrl?: string
  createdAt: string
  pageUrl?: string
}

interface Project {
  id: string
  name: string
  url: string
  description?: string
  createdAt: string
}

interface ProjectClientProps {
  project: Project | null
  feedbacks: Feedback[]
  error: string | null
  userEmail: string
  accessToken: string
}

const PROXY_URL = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:3002'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProjectClient({
  project,
  feedbacks,
  error,
  userEmail,
  accessToken,
}: ProjectClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'settings'>('feedbacks')
  const [copied, setCopied] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const viewerUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}/p/${project?.id}`
      : `http://localhost:3000/p/${project?.id}`

  async function copyViewerUrl() {
    await navigator.clipboard.writeText(viewerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (typeFilter && f.type !== typeFilter) return false
    if (severityFilter && f.severity !== severityFilter) return false
    if (statusFilter && f.status !== statusFilter) return false
    return true
  })

  const totalCount = feedbacks.length
  const openCount = feedbacks.filter((f) => f.status === 'OPEN').length
  const criticalCount = feedbacks.filter((f) => f.severity === 'CRITICAL').length
  const resolvedCount = feedbacks.filter((f) => f.status === 'RESOLVED').length

  if (!project && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline text-sm">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">F</span>
                </div>
                <span className="font-bold text-gray-900">FeedbackView</span>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{project?.name}</h1>
              <a
                href={project?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mt-0.5 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {project?.url}
              </a>
            </div>
          </div>
        </div>

        {/* Viewer URL highlight card */}
        <div className="bg-indigo-600 rounded-2xl p-5 mb-6 text-white">
          <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide mb-2">
            URL do Visualizador QA
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-sm bg-indigo-700 rounded-lg px-3 py-2 truncate font-mono">
              {viewerUrl}
            </code>
            <button
              onClick={copyViewerUrl}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
          <p className="text-indigo-200 text-xs mt-2">
            Compartilhe esta URL com os QAs para começar a capturar feedbacks.
          </p>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: totalCount, icon: MessageSquare, color: 'text-gray-600' },
            { label: 'Abertos', value: openCount, icon: AlertTriangle, color: 'text-amber-600' },
            { label: 'Críticos', value: criticalCount, icon: AlertTriangle, color: 'text-red-600' },
            { label: 'Resolvidos', value: resolvedCount, icon: CheckCircle2, color: 'text-green-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            {[
              { key: 'feedbacks', label: 'Feedbacks' },
              { key: 'settings', label: 'Configurações' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Feedbacks tab */}
        {activeTab === 'feedbacks' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Filtrar:</span>
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos os tipos</option>
                <option value="BUG">Bug</option>
                <option value="SUGGESTION">Sugestão</option>
                <option value="QUESTION">Dúvida</option>
                <option value="PRAISE">Elogio</option>
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas severidades</option>
                <option value="CRITICAL">Crítico</option>
                <option value="HIGH">Alto</option>
                <option value="MEDIUM">Médio</option>
                <option value="LOW">Baixo</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos os status</option>
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em andamento</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="CLOSED">Fechado</option>
              </select>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {feedbacks.length === 0
                    ? 'Nenhum feedback ainda. Compartilhe a URL do visualizador!'
                    : 'Nenhum feedback com os filtros selecionados.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedbacks.map((feedback) => (
                  <Link
                    key={feedback.id}
                    href={`/feedbacks/${feedback.id}`}
                    className="block bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex gap-4 p-4">
                      {feedback.screenshotUrl && (
                        <div className="flex-shrink-0">
                          <img
                            src={feedback.screenshotUrl}
                            alt="Screenshot"
                            className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={feedback.type as any}>{feedback.type}</Badge>
                          {feedback.severity && (
                            <Badge variant={feedback.severity as any}>{feedback.severity}</Badge>
                          )}
                          <Badge variant={feedback.status as any}>{feedback.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{feedback.comment}</p>
                        <p className="text-xs text-gray-400 mt-1.5">{formatDate(feedback.createdAt)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-medium text-gray-900 mb-4">Configurações do Projeto</h3>
            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">ID do projeto</span>
                <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{project?.id}</code>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">Nome</span>
                <span>{project?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="font-medium text-gray-700">URL alvo</span>
                <a href={project?.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate max-w-xs">
                  {project?.url}
                </a>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-700">Criado em</span>
                <span>{project?.createdAt ? formatDate(project.createdAt) : '-'}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
