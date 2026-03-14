'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'

const projectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  targetUrl: z.string().url('URL inválida. Inclua http:// ou https://'),
})

type ProjectForm = z.infer<typeof projectSchema>

export default function NewProjectPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  })

  async function onSubmit(data: ProjectForm) {
    setServerError(null)
    try {
      const project = await api.projects.create(data)
      router.push(`/projects/${project.id}`)
    } catch (err: any) {
      setServerError(err.message || 'Erro ao criar projeto.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Novo Projeto</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Criar novo projeto</h1>
          <p className="text-gray-500 text-sm mt-1">
            Configure as informações básicas do projeto para começar a capturar feedbacks.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {serverError && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do projeto <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                type="text"
                placeholder="Ex: Portal do Cliente"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Descrição <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Descreva brevemente o que é este projeto..."
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                URL do site <span className="text-red-500">*</span>
              </label>
              <input
                {...register('targetUrl')}
                type="url"
                placeholder="https://meusite.com.br"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {errors.targetUrl && (
                <p className="mt-1 text-xs text-red-600">{errors.targetUrl.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                A URL alvo que será carregada no visualizador de QA.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {isSubmitting ? 'Criando...' : 'Criar projeto'}
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors text-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
