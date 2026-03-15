'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Flex,
  Column,
  Row,
  Grid,
  Heading,
  Text,
  Button,
  Tag,
  Icon,
  IconButton,
} from '@once-ui-system/core'
import AppLayout from '@/components/ui/AppLayout'

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
  })
}

export default function DashboardClient({
  projects,
  error,
  userEmail,
  userName,
}: DashboardClientProps) {
  const router = useRouter()
  const [showFilter, setShowFilter] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'none'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'feedbacks'>('recent')
  const [search, setSearch] = useState('')

  const filteredProjects = useMemo(() => {
    let result = [...projects]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q))
    }

    if (filterStatus === 'open') {
      result = result.filter((p) => (p.openFeedbackCount ?? 0) > 0)
    } else if (filterStatus === 'none') {
      result = result.filter((p) => (p.openFeedbackCount ?? 0) === 0)
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'feedbacks') {
      result.sort((a, b) => (b.openFeedbackCount ?? 0) - (a.openFeedbackCount ?? 0))
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return result
  }, [projects, search, filterStatus, sortBy])

  const hasActiveFilter = filterStatus !== 'all' || sortBy !== 'recent'

  return (
    <AppLayout>
      <Column as="main" fillWidth maxWidth={72} paddingX="l" paddingY="xl" gap="l" style={{ margin: '0 auto' }}>
        {/* Page header */}
        <Row fillWidth horizontal="between" vertical="center">
          <Column gap="xs">
            <Heading variant="heading-strong-l">Projetos</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {projects.length === 0
                ? 'Nenhum projeto ainda'
                : `${projects.length} projeto${projects.length !== 1 ? 's' : ''}`}
            </Text>
          </Column>
          <Row gap="s" vertical="center">
            <div style={{ position: 'relative' }}>
              <IconButton
                icon="filter"
                variant={hasActiveFilter ? 'primary' : 'secondary'}
                size="m"
                onClick={() => setShowFilter(!showFilter)}
                tooltip="Filtrar projetos"
              />
              {showFilter && (
                <>
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                    onClick={() => setShowFilter(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      zIndex: 200,
                      background: 'var(--surface-background)',
                      border: '1px solid var(--neutral-border-medium)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      width: '16rem',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <Text variant="label-default-s" onBackground="neutral-strong">Status</Text>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {([['all', 'Todos'], ['open', 'Com abertos'], ['none', 'Sem abertos']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setFilterStatus(val)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            borderRadius: '0.375rem',
                            border: '1px solid',
                            borderColor: filterStatus === val ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                            background: filterStatus === val ? 'var(--brand-solid-strong)' : 'transparent',
                            color: filterStatus === val ? '#fff' : 'var(--neutral-on-background-weak)',
                            fontSize: '0.75rem',
                            fontWeight: filterStatus === val ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <Text variant="label-default-s" onBackground="neutral-strong">Ordenar por</Text>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {([['recent', 'Recentes'], ['name', 'Nome'], ['feedbacks', 'Reports']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          onClick={() => setSortBy(val)}
                          style={{
                            padding: '0.375rem 0.625rem',
                            borderRadius: '0.375rem',
                            border: '1px solid',
                            borderColor: sortBy === val ? 'var(--brand-solid-strong)' : 'var(--neutral-border-medium)',
                            background: sortBy === val ? 'var(--brand-solid-strong)' : 'transparent',
                            color: sortBy === val ? '#fff' : 'var(--neutral-on-background-weak)',
                            fontSize: '0.75rem',
                            fontWeight: sortBy === val ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {hasActiveFilter && (
                      <button
                        onClick={() => { setFilterStatus('all'); setSortBy('recent') }}
                        style={{
                          padding: '0.375rem',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--brand-on-background-strong)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            <Button
              variant="primary"
              prefixIcon="plus"
              size="m"
              href="/projects/new"
            >
              Novo Projeto
            </Button>
          </Row>
        </Row>

        {/* Error state */}
        {error && (
          <Row
            fillWidth
            padding="m"
            radius="l"
            background="danger-weak"
            border="danger-medium"
          >
            <Text variant="body-default-s" onBackground="danger-strong">
              {error}
            </Text>
          </Row>
        )}

        {/* Empty state */}
        {projects.length === 0 && !error && (
          <Column fillWidth horizontal="center" vertical="center" paddingY="xl" gap="m">
            <Flex
              horizontal="center"
              vertical="center"
              radius="l"
              padding="l"
              background="brand-weak"
            >
              <Icon name="message" size="l" />
            </Flex>
            <Heading variant="heading-strong-m">Nenhum projeto ainda</Heading>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              align="center"
              style={{ maxWidth: '24rem' }}
            >
              Crie seu primeiro projeto para começar a capturar reports com screenshot e session
              replay.
            </Text>
            <Button
              variant="primary"
              prefixIcon="plus"
              size="m"
              href="/projects/new"
            >
              Criar primeiro projeto
            </Button>
          </Column>
        )}

        {/* Search */}
        {projects.length > 0 && (
          <div style={{ position: 'relative', width: '100%' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--neutral-on-background-weak)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar projeto por nome ou URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem 0.625rem 2.25rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--neutral-border-medium)',
                background: 'var(--surface-background)',
                color: 'var(--neutral-on-background-strong)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-solid-strong)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--neutral-border-medium)' }}
            />
          </div>
        )}

        {/* Projects grid */}
        {filteredProjects.length > 0 && (
          <Grid fillWidth columns={3} gap="m" s={{ columns: 1 }} m={{ columns: 2 }}>
            {filteredProjects.map((project) => {
              const openCount = project.openFeedbackCount ?? project._count?.feedbacks ?? 0
              return (
                <Column
                  key={project.id}
                  fillWidth
                  padding="m"
                  gap="s"
                  radius="l"
                  border="neutral-medium"
                  background="surface"
                  onClick={() => router.push(`/projects/${project.id}`)}
                  style={{ justifyContent: 'space-between', cursor: 'pointer', minHeight: '8rem' }}
                >
                  <Column gap="xs" style={{ minWidth: 0 }}>
                    <Row fillWidth horizontal="between" vertical="center">
                      <Heading
                        variant="heading-strong-m"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}
                      >
                        {project.name}
                      </Heading>
                      <Icon name="chevronRight" size="s" style={{ flexShrink: 0 }} />
                    </Row>
                    <Text
                      variant="body-default-xs"
                      onBackground="neutral-weak"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {project.url}
                    </Text>
                  </Column>

                  <Row fillWidth vertical="center" gap="s" style={{ marginTop: 'auto' }}>
                    <Tag
                      variant={openCount > 0 ? 'warning' : 'neutral'}
                      size="s"
                      label={`${openCount} aberto${openCount !== 1 ? 's' : ''}`}
                    />
                    <Text variant="body-default-xs" onBackground="neutral-weak" style={{ whiteSpace: 'nowrap' }}>
                      {formatDate(project.createdAt)}
                    </Text>
                  </Row>
                </Column>
              )
            })}
          </Grid>
        )}
      </Column>
    </AppLayout>
  )
}
