'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Globe,
  Code2,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'

const projectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  targetUrl: z.string().url('URL inválida. Inclua http:// ou https://'),
})

type ProjectForm = z.infer<typeof projectSchema>

type Mode = 'proxy' | 'embed'

interface UrlWarning {
  type: 'success' | 'warning' | 'info' | 'error'
  message: string
}

export default function NewProjectPage() {
  const router = useRouter()

  // Step flow: 1 = choose mode, 2 = fill details
  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<Mode | null>(null)

  // URL check state (step 1 - proxy mode)
  const [targetUrl, setTargetUrl] = useState('')
  const [urlChecking, setUrlChecking] = useState(false)
  const [urlWarnings, setUrlWarnings] = useState<UrlWarning[]>([])
  const [urlChecked, setUrlChecked] = useState(false)
  const [urlValid, setUrlValid] = useState(false)

  // Step 2 form
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProjectForm>({
    resolver: zodResolver(projectSchema),
  })

  const hasProblems = urlWarnings.some((w) => w.type === 'error' || w.type === 'warning')

  const checkUrl = useCallback(async (url: string) => {
    if (!url || !url.startsWith('http')) return
    setUrlChecking(true)
    setUrlWarnings([])
    setUrlChecked(false)
    setUrlValid(false)
    try {
      const res = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      const warnings: UrlWarning[] = data.warnings || []
      setUrlWarnings(warnings)
      setUrlChecked(true)
      setUrlValid(!warnings.some((w: UrlWarning) => w.type === 'error'))
    } catch {
      setUrlWarnings([{ type: 'error', message: 'Erro ao verificar URL.' }])
      setUrlChecked(true)
    } finally {
      setUrlChecking(false)
    }
  }, [])

  function goToStep2(selectedMode: Mode) {
    setMode(selectedMode)
    if (targetUrl) {
      setValue('targetUrl', targetUrl)
    }
    setStep(2)
  }

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
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 1 ? 'bg-indigo-600 text-white' : step > 1 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <span className="text-sm font-medium">Modo de integração</span>
          </div>
          <div className="flex-1 h-px bg-gray-200" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="text-sm font-medium">Dados do projeto</span>
          </div>
        </div>

        {/* ─── Step 1: Choose integration mode ─── */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Como você quer capturar feedbacks?</h1>
              <p className="text-gray-500 text-sm mt-1">
                Escolha o modo de integração. Você pode mudar depois nas configurações do projeto.
              </p>
            </div>

            {/* Option cards */}
            <div className="space-y-4">
              {/* Proxy mode card */}
              <div className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                mode === 'proxy' ? 'border-indigo-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <button
                  type="button"
                  onClick={() => setMode('proxy')}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      mode === 'proxy' ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <Globe className={`w-5 h-5 ${mode === 'proxy' ? 'text-indigo-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">URL do Site (Proxy)</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Mais rápido</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Cole a URL do site e compartilhe o link de QA. Nenhuma instalação necessária.
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Ideal para sites simples, landing pages, e testes rápidos sem acesso ao código.
                      </p>
                    </div>
                  </div>
                </button>

                {/* URL input (shows when proxy is selected) */}
                {mode === 'proxy' && (
                  <div className="mt-4 ml-14">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={targetUrl}
                        onChange={(e) => {
                          setTargetUrl(e.target.value)
                          setUrlChecked(false)
                          setUrlWarnings([])
                        }}
                        placeholder="https://meusite.com.br"
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => checkUrl(targetUrl)}
                        disabled={urlChecking || !targetUrl || !targetUrl.startsWith('http')}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        {urlChecking ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          'Verificar URL'
                        )}
                      </button>
                    </div>

                    {/* URL check results */}
                    {urlChecked && urlWarnings.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {urlWarnings.map((w, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                              w.type === 'error'
                                ? 'bg-red-50 border border-red-200 text-red-700'
                                : w.type === 'warning'
                                ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                : w.type === 'success'
                                ? 'bg-green-50 border border-green-200 text-green-700'
                                : 'bg-blue-50 border border-blue-200 text-blue-700'
                            }`}
                          >
                            {w.type === 'error' ? (
                              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            ) : w.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            ) : w.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            )}
                            <span>{w.message}</span>
                          </div>
                        ))}

                        {/* Suggest embed mode if problems detected */}
                        {hasProblems && (
                          <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                            <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-indigo-900">
                                Recomendamos usar o Script Embed para este site
                              </p>
                              <p className="text-xs text-indigo-700 mt-1">
                                O modo Script Embed funciona diretamente no site, sem limitações do proxy.
                                Basta colar uma linha de código no HTML.
                              </p>
                              <button
                                type="button"
                                onClick={() => setMode('embed')}
                                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1.5"
                              >
                                <Code2 className="w-4 h-4" />
                                Usar Script Embed
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Continue button */}
                    {urlChecked && urlValid && !hasProblems && (
                      <button
                        type="button"
                        onClick={() => goToStep2('proxy')}
                        className="mt-4 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        Continuar
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}

                    {/* Allow continuing even with warnings (not errors) */}
                    {urlChecked && urlValid && hasProblems && !urlWarnings.some((w) => w.type === 'error') && (
                      <button
                        type="button"
                        onClick={() => goToStep2('proxy')}
                        className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors underline"
                      >
                        Continuar mesmo assim com Proxy
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Embed mode card */}
              <div className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                mode === 'embed' ? 'border-indigo-500 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <button
                  type="button"
                  onClick={() => setMode('embed')}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      mode === 'embed' ? 'bg-indigo-100' : 'bg-gray-100'
                    }`}>
                      <Code2 className={`w-5 h-5 ${mode === 'embed' ? 'text-indigo-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">Script Embed</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Recomendado</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Cole um snippet no HTML do site. Funciona em qualquer lugar, sem limitações.
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Ideal para Flutter, SPAs complexas, sites com autenticação, e ambientes de produção.
                      </p>
                    </div>
                  </div>
                </button>

                {mode === 'embed' && (
                  <div className="mt-4 ml-14">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          URL do site <span className="text-gray-400 font-normal">(para referência)</span>
                        </label>
                        <input
                          type="url"
                          value={targetUrl}
                          onChange={(e) => setTargetUrl(e.target.value)}
                          placeholder="https://meusite.com.br"
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          Usada apenas como referência. O snippet de instalação será exibido após criar o projeto.
                        </p>
                      </div>

                      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>
                          O Script Embed funciona em qualquer site. Após criar o projeto, você receberá o snippet para instalar.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => goToStep2('embed')}
                        disabled={!targetUrl || !targetUrl.startsWith('http')}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        Continuar
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: Project details ─── */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Dados do projeto</h1>
              <p className="text-gray-500 text-sm mt-1">
                Preencha as informações do projeto para finalizar.
              </p>
            </div>

            {/* Mode badge */}
            <div className="mb-5 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
                mode === 'proxy'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {mode === 'proxy' ? <Globe className="w-3.5 h-3.5" /> : <Code2 className="w-3.5 h-3.5" />}
                {mode === 'proxy' ? 'Modo Proxy' : 'Modo Script Embed'}
              </span>
              <span className="text-xs text-gray-400 truncate max-w-xs">{targetUrl}</span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium ml-auto"
              >
                Alterar
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              {serverError && (
                <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <input type="hidden" {...register('targetUrl')} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nome do projeto <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    placeholder="Ex: Portal do Cliente"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
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

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar projeto'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
