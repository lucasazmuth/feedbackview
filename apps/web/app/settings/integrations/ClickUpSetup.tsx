'use client'

import { useState, useEffect, useCallback } from 'react'
import { Column, Row, Heading, Text, Button, Card, Tag, Feedback as FeedbackAlert } from '@once-ui-system/core'
import { DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP, DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG } from '@/lib/clickup/types'

interface Team { id: string; name: string }
interface Space { id: string; name: string }
interface ListItem { id: string; name: string; statuses: { status: string; orderindex: number }[] }

const BUUG_STATUSES = ['OPEN', 'IN_PROGRESS', 'UNDER_REVIEW', 'RESOLVED', 'CANCELLED']
const BUUG_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  UNDER_REVIEW: 'Sob revisão',
  RESOLVED: 'Concluída',
  CANCELLED: 'Cancelado',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--neutral-border-medium)',
  background: 'var(--surface-background)',
  color: 'var(--neutral-on-background-strong)',
  fontSize: '0.875rem',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'auto' as any,
}

function StepBadge({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.75rem',
        height: '1.75rem',
        borderRadius: '50%',
        fontSize: '0.75rem',
        fontWeight: 700,
        background: done ? 'var(--success-solid-strong)' : 'var(--brand-solid-strong)',
        color: '#fff',
        flexShrink: 0,
      }}
    >
      {done ? '✓' : n}
    </span>
  )
}

export default function ClickUpSetup({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [enabled, setEnabled] = useState(false)

  const [token, setToken] = useState('')
  const [tokenHint, setTokenHint] = useState('')
  const [testResult, setTestResult] = useState<{ valid: boolean; user?: { username: string }; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [spaces, setSpaces] = useState<Space[]>([])
  const [selectedSpaceId, setSelectedSpaceId] = useState('')
  const [lists, setLists] = useState<ListItem[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [selectedListStatuses, setSelectedListStatuses] = useState<string[]>([])

  const [statusMapBuugToClickUp, setStatusMapBuugToClickUp] = useState<Record<string, string>>(DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP)
  const [statusMapClickUpToBuug, setStatusMapClickUpToBuug] = useState<Record<string, string>>(DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG)

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/integrations/clickup?orgId=${orgId}`)
      if (res.ok) {
        const data = await res.json()
        setConfigured(data.configured)
        if (data.config) {
          setEnabled(data.config.enabled)
          setTokenHint(data.config.tokenHint || '')
          setSelectedTeamId(data.config.teamId || '')
          setSelectedListId(data.config.listId || '')
          if (data.config.statusMapBuugToClickUp) setStatusMapBuugToClickUp(data.config.statusMapBuugToClickUp)
          if (data.config.statusMapClickUpToBuug) setStatusMapClickUpToBuug(data.config.statusMapClickUpToBuug)
        }
      }
    } catch {}
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleTestToken = async () => {
    const t = token.trim()
    if (!t) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/clickup/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      })
      const data = await res.json()
      setTestResult(data)
      if (data.valid) {
        const teamsRes = await fetch('/api/integrations/clickup/browse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: t, action: 'teams' }),
        })
        const teamsData = await teamsRes.json()
        setTeams(teamsData.teams || [])
      }
    } catch {
      setTestResult({ valid: false, error: 'Erro de rede' })
    }
    setTesting(false)
  }

  const handleTeamChange = async (teamId: string) => {
    setSelectedTeamId(teamId)
    setSpaces([])
    setSelectedSpaceId('')
    setLists([])
    setSelectedListId('')
    setSelectedListStatuses([])
    if (!teamId) return
    try {
      const res = await fetch('/api/integrations/clickup/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), action: 'spaces', teamId }),
      })
      const data = await res.json()
      setSpaces(data.spaces || [])
    } catch {}
  }

  const handleSpaceChange = async (spaceId: string) => {
    setSelectedSpaceId(spaceId)
    setLists([])
    setSelectedListId('')
    setSelectedListStatuses([])
    if (!spaceId) return
    try {
      const res = await fetch('/api/integrations/clickup/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), action: 'lists', spaceId }),
      })
      const data = await res.json()
      setLists(data.lists || [])
    } catch {}
  }

  const handleListChange = (listId: string) => {
    setSelectedListId(listId)
    const list = lists.find(l => l.id === listId)
    const statuses = list?.statuses.map(s => s.status) || []
    setSelectedListStatuses(statuses)

    if (statuses.length > 0) {
      const newB2C: Record<string, string> = {}
      for (const bs of BUUG_STATUSES) {
        const defaultVal = DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP[bs] || ''
        newB2C[bs] = statuses.includes(defaultVal) ? defaultVal : statuses[0]
      }
      setStatusMapBuugToClickUp(newB2C)

      const newC2B: Record<string, string> = {}
      for (const cs of statuses) {
        newC2B[cs] = DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG[cs] || 'OPEN'
      }
      setStatusMapClickUpToBuug(newC2B)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    try {
      const body: any = {
        enabled: true,
        teamId: selectedTeamId,
        listId: selectedListId,
        statusMapBuugToClickUp,
        statusMapClickUpToBuug,
      }
      if (token.trim()) body.token = token.trim()

      const res = await fetch(`/api/integrations/clickup?orgId=${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setSaveMsg({ type: 'success', text: 'Integração salva e ativada.' })
        setConfigured(true)
        setEnabled(true)
        if (token.trim()) {
          setTokenHint(token.trim().slice(-4))
          setToken('')
        }
      } else {
        const data = await res.json()
        setSaveMsg({ type: 'danger', text: data.error || 'Erro ao salvar' })
      }
    } catch {
      setSaveMsg({ type: 'danger', text: 'Erro de rede' })
    }
    setSaving(false)
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch(`/api/integrations/clickup?orgId=${orgId}`, { method: 'DELETE' })
      setConfigured(false)
      setEnabled(false)
      setToken('')
      setTokenHint('')
      setTestResult(null)
      setTeams([])
      setSpaces([])
      setLists([])
      setSelectedTeamId('')
      setSelectedSpaceId('')
      setSelectedListId('')
      setSelectedListStatuses([])
      setStatusMapBuugToClickUp(DEFAULT_STATUS_MAP_BUUG_TO_CLICKUP)
      setStatusMapClickUpToBuug(DEFAULT_STATUS_MAP_CLICKUP_TO_BUUG)
      setSaveMsg(null)
    } catch {}
    setDisconnecting(false)
  }

  if (loading) {
    return (
      <Card fillWidth padding="xl" radius="l" style={{ textAlign: 'center' }}>
        <Text variant="body-default-s" onBackground="neutral-weak">Carregando configuração do ClickUp…</Text>
      </Card>
    )
  }

  const tokenReady = testResult?.valid || (configured && tokenHint)
  const canSave = selectedListId && (token.trim() || configured)

  return (
    <Column gap="l" fillWidth>
      {configured && enabled && (
        <Card fillWidth padding="l" radius="l" style={{ background: 'var(--success-alpha-weak)', border: '1px solid var(--success-border-medium)' }}>
          <Row fillWidth horizontal="between" vertical="center" wrap gap="m">
            <Column gap="xs">
              <Text variant="label-default-s" onBackground="success-strong">ClickUp conectado</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                Token: ****{tokenHint} · Lista: {selectedListId || '(não definida)'}
              </Text>
            </Column>
            <Button size="s" variant="danger" label="Desconectar" onClick={handleDisconnect} loading={disconnecting} />
          </Row>
        </Card>
      )}

      <Card fillWidth padding="l" radius="l">
        <Column gap="l">
          <Column gap="xs">
            <Heading variant="heading-strong-s" as="h2">Conectar ao ClickUp</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Siga os passos abaixo para que os reports do Buug virem tarefas no ClickUp automaticamente, e
              mudanças de status reflitam nos dois lados.
            </Text>
          </Column>

          <Column gap="m">
            <Row gap="s" vertical="start">
              <StepBadge n={1} done={!!tokenReady} />
              <Column gap="s" style={{ flex: 1 }}>
                <Text variant="label-default-s">Colar o token de API do ClickUp</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  No ClickUp, vá em <strong>Configurações → Apps → API Token</strong> e copie o token pessoal.
                  Ele começa com <code style={{ fontSize: '0.8em' }}>pk_</code>.
                </Text>
                <Row gap="s" vertical="end" wrap>
                  <div style={{ flex: '1 1 14rem' }}>
                    <input
                      type="password"
                      placeholder={configured ? `****${tokenHint} (já salvo)` : 'pk_...'}
                      value={token}
                      onChange={e => setToken(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <Button
                    size="m"
                    variant="secondary"
                    label={testing ? 'Testando…' : 'Testar conexão'}
                    onClick={handleTestToken}
                    loading={testing}
                    disabled={!token.trim()}
                  />
                </Row>
                {testResult && (
                  <Text variant="body-default-xs" onBackground={testResult.valid ? 'success-strong' : 'danger-strong'}>
                    {testResult.valid
                      ? `Conectado como ${testResult.user?.username}`
                      : testResult.error || 'Token inválido'}
                  </Text>
                )}
              </Column>
            </Row>

            <Row gap="s" vertical="start">
              <StepBadge n={2} done={!!selectedListId} />
              <Column gap="s" style={{ flex: 1 }}>
                <Text variant="label-default-s">Escolher onde criar as tarefas</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Selecione o workspace, espaço e lista do ClickUp onde os reports devem aparecer.
                </Text>

                {teams.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.2rem' }}>
                      Workspace
                    </label>
                    <select value={selectedTeamId} onChange={e => handleTeamChange(e.target.value)} style={selectStyle}>
                      <option value="">Selecione…</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}

                {spaces.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.2rem' }}>
                      Espaço
                    </label>
                    <select value={selectedSpaceId} onChange={e => handleSpaceChange(e.target.value)} style={selectStyle}>
                      <option value="">Selecione…</option>
                      {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}

                {lists.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-on-background-weak)', display: 'block', marginBottom: '0.2rem' }}>
                      Lista
                    </label>
                    <select value={selectedListId} onChange={e => handleListChange(e.target.value)} style={selectStyle}>
                      <option value="">Selecione…</option>
                      {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}

                {!tokenReady && teams.length === 0 && (
                  <Text variant="body-default-xs" onBackground="neutral-weak" style={{ fontStyle: 'italic' }}>
                    Teste o token acima para listar seus workspaces.
                  </Text>
                )}
              </Column>
            </Row>

            <Row gap="s" vertical="start">
              <StepBadge n={3} done={selectedListStatuses.length > 0 || configured} />
              <Column gap="s" style={{ flex: 1 }}>
                <Text variant="label-default-s">Mapeamento de status</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Defina como cada status do Buug corresponde a um status no ClickUp (e vice-versa).
                  Valores sugeridos são preenchidos automaticamente.
                </Text>

                <Text variant="label-default-s" style={{ marginTop: '0.5rem' }}>Buug → ClickUp</Text>
                {BUUG_STATUSES.map(bs => (
                  <Row key={bs} gap="s" vertical="center" wrap>
                    <Tag variant="neutral" size="s" label={BUUG_STATUS_LABELS[bs] || bs} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)' }}>→</span>
                    {selectedListStatuses.length > 0 ? (
                      <select
                        value={statusMapBuugToClickUp[bs] || ''}
                        onChange={e => setStatusMapBuugToClickUp(prev => ({ ...prev, [bs]: e.target.value }))}
                        style={{ ...selectStyle, width: 'auto', minWidth: '10rem' }}
                      >
                        <option value="">Não mapear</option>
                        {selectedListStatuses.map(cs => <option key={cs} value={cs}>{cs}</option>)}
                      </select>
                    ) : (
                      <input
                        value={statusMapBuugToClickUp[bs] || ''}
                        onChange={e => setStatusMapBuugToClickUp(prev => ({ ...prev, [bs]: e.target.value }))}
                        placeholder="ex.: to do"
                        style={{ ...inputStyle, width: 'auto', minWidth: '10rem' }}
                      />
                    )}
                  </Row>
                ))}

                <Text variant="label-default-s" style={{ marginTop: '0.75rem' }}>ClickUp → Buug</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Quando uma tarefa muda de status no ClickUp, qual status aplicar no Buug?
                </Text>
                {(selectedListStatuses.length > 0 ? selectedListStatuses : Object.keys(statusMapClickUpToBuug)).map(cs => (
                  <Row key={cs} gap="s" vertical="center" wrap>
                    <Tag variant="neutral" size="s" label={cs} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral-on-background-weak)' }}>→</span>
                    <select
                      value={statusMapClickUpToBuug[cs] || ''}
                      onChange={e => setStatusMapClickUpToBuug(prev => ({ ...prev, [cs]: e.target.value }))}
                      style={{ ...selectStyle, width: 'auto', minWidth: '10rem' }}
                    >
                      <option value="">Não mapear</option>
                      {BUUG_STATUSES.map(bs => <option key={bs} value={bs}>{BUUG_STATUS_LABELS[bs]}</option>)}
                    </select>
                  </Row>
                ))}
              </Column>
            </Row>

            <Row gap="s" vertical="start">
              <StepBadge n={4} done={configured && enabled} />
              <Column gap="s" style={{ flex: 1 }}>
                <Text variant="label-default-s">Ativar integração</Text>
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  Ao salvar, novos reports criarão tarefas no ClickUp e mudanças de status serão sincronizadas.
                  Se o ClickUp estiver fora do ar, o Buug continua funcionando normalmente.
                </Text>
                {saveMsg && <FeedbackAlert variant={saveMsg.type}>{saveMsg.text}</FeedbackAlert>}
                <Button
                  size="m"
                  variant="primary"
                  label={saving ? 'Salvando…' : (configured ? 'Atualizar integração' : 'Ativar integração')}
                  onClick={handleSave}
                  loading={saving}
                  disabled={!canSave}
                />
              </Column>
            </Row>
          </Column>
        </Column>
      </Card>

      <Card fillWidth padding="l" radius="l" style={{ background: 'var(--neutral-alpha-weak)' }}>
        <Column gap="s">
          <Text variant="label-default-s">Como funciona</Text>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--neutral-on-background-weak)' }}>
            <li>Cada novo report no Buug cria automaticamente uma tarefa na lista escolhida do ClickUp.</li>
            <li>Quando você muda o status de um report no Buug, a tarefa no ClickUp é atualizada.</li>
            <li>Quando alguém muda o status da tarefa no ClickUp, o report no Buug é atualizado.</li>
            <li>Se o ClickUp estiver fora do ar ou retornar erro, o Buug continua funcionando — nenhum report é perdido.</li>
          </ul>
        </Column>
      </Card>
    </Column>
  )
}
