'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  Pencil,
  Trash2,
  Loader2,
  X,
  Code2,
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
}: ProjectClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'feedbacks' | 'settings'>('feedbacks')
  const [copied, setCopied] = useState(false)
  const [copiedEmbed, setCopiedEmbed] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(project?.name ?? '')
  const [editUrl, setEditUrl] = useState(project?.url ?? '')
  const [editDescription, setEditDescription] = useState(project?.description ?? '')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const viewerUrl =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}/p/${project?.id}`
      : `http://localhost:3000/p/${project?.id}`

  const appBase =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : 'https://feedbackview.vercel.app'

  const embedSnippet = `<script src="${appBase}/embed.js" data-project="${project?.id}"></script>`

  async function copyViewerUrl() {
    await navigator.clipboard.writeText(viewerUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyEmbedSnippet() {
    await navigator.clipboard.writeText(embedSnippet)
    setCopiedEmbed(true)
    setTimeout(() => setCopiedEmbed(false), 2000)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
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

  async function handleEditSave() {
    if (!project) return
    if (!editName.trim() || !editUrl.trim()) {
      setEditError('Nome e URL são obrigatórios.')
      return
    }
    setEditError(null)
    setEditSaving(true)
    try {
      await api.projects.update(project.id, {
        name: editName.trim(),
        targetUrl: editUrl.trim(),
        description: editDescription.trim() || undefined,
      })
      router.refresh()
      setEditing(false)
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete() {
    if (!project) return
    setDeleteError(null)
    setDeleting(true)
    try {
      await api.projects.delete(project.id)
      router.push('/dashboard')
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir projeto.')
      setDeleting(false)
    }
  }

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
              onClick={handleSignOut}
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
          <div className="space-y-6">
            {/* Edit project */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Configurações do Projeto</h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">URL alvo</label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      placeholder="Opcional"
                    />
                  </div>
                  {editError && (
                    <p className="text-sm text-red-600">{editError}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleEditSave}
                      disabled={editSaving}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {editSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false)
                        setEditName(project?.name ?? '')
                        setEditUrl(project?.url ?? '')
                        setEditDescription(project?.description ?? '')
                        setEditError(null)
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm text-gray-500">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-700">ID do projeto</span>
                    <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{project?.id}</code>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-700">Nome</span>
                    <span>{project?.name}</span>
                  </div>
                  {project?.description && (
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="font-medium text-gray-700">Descrição</span>
                      <span className="text-right max-w-xs">{project.description}</span>
                    </div>
                  )}
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
              )}
            </div>

            {/* Embed script */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-medium text-gray-900">Script Embed</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Cole este snippet no HTML do seu site para habilitar o widget de feedback diretamente na página.
                Ideal para sites que não funcionam bem com o proxy (Flutter, SPAs complexas, sites com auth).
              </p>
              <div className="relative">
                <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto font-mono">
                  {embedSnippet}
                </pre>
                <button
                  onClick={copyEmbedSnippet}
                  className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-md transition-colors"
                >
                  {copiedEmbed ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <div className="mt-4 space-y-2 text-xs text-gray-500">
                <p><strong className="text-gray-700">Como funciona:</strong> O script injeta um botão flutuante de feedback no canto inferior direito da página. Ao clicar, o usuário pode enviar bugs, sugestões e elogios com screenshot automático e session replay.</p>
                <p><strong className="text-gray-700">Vantagens:</strong> Funciona em qualquer site (Flutter, SPAs, sites com autenticação). Sem limitações do proxy.</p>
              </div>
            </div>

            {/* Delete project */}
            <div className="bg-white rounded-xl border border-red-200 p-6">
              <h3 className="font-medium text-red-700 mb-2">Zona de Perigo</h3>
              <p className="text-sm text-gray-500 mb-4">
                Excluir este projeto removerá permanentemente todos os feedbacks associados. Esta ação não pode ser desfeita.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir projeto
                </button>
              ) : (
                <div className="space-y-3 bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-700 font-medium">
                    Digite <code className="bg-red-100 px-1.5 py-0.5 rounded text-xs">{project?.name}</code> para confirmar:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={project?.name}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {deleteError && (
                    <p className="text-sm text-red-600">{deleteError}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirmText !== project?.name}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Confirmar exclusão
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                        setDeleteError(null)
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
