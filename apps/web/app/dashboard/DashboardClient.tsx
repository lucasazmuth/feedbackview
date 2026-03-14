'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, ExternalLink, MessageSquare, ChevronRight, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  name: string
  url: string
  openFeedbackCount?: number
  _count?: { feedbacks: number }
  createdAt: string
}

interface DashboardClientProps {
  projects: Project[]
  error: string | null
  userEmail: string
  userName: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function DashboardClient({
  projects,
  error,
  userEmail,
  userName,
}: DashboardClientProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">F</span>
              </div>
              <span className="font-bold text-gray-900">FeedbackView</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{userName || userEmail}</p>
                {userName && <p className="text-xs text-gray-500">{userEmail}</p>}
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
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Projetos</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {projects.length === 0
                ? 'Nenhum projeto ainda'
                : `${projects.length} projeto${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Novo Projeto
          </Link>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto ainda</h3>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Crie seu primeiro projeto para começar a capturar feedbacks com screenshot e session
              replay.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Criar primeiro projeto
            </Link>
          </div>
        )}

        {/* Projects grid */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => {
              const openCount = project.openFeedbackCount ?? project._count?.feedbacks ?? 0
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-400 truncate">{project.url}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          openCount > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        {openCount} aberto{openCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(project.createdAt)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
