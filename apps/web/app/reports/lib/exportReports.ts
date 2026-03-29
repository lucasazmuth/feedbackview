import * as XLSX from 'xlsx'
import { formatDate, getTypeLabel, getSeverityLabel, getStatusLabel } from '../utils/labels'

export interface FeedbackExportInput {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  startDate?: string | null
  dueDate?: string | null
  createdAt: string
  pageUrl?: string
  Project?: { name?: string }
}

export type AssigneesExportMap = Record<string, { userId: string; name: string | null; email: string }[]>

function exportStatusLabel(status: string) {
  if (status === 'ARCHIVED') return 'Arquivado'
  return getStatusLabel(status)
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildExportRows(
  feedbacks: FeedbackExportInput[],
  assigneesMap: AssigneesExportMap,
): Record<string, string>[] {
  return feedbacks.map((f) => {
    const assignees = assigneesMap[f.id] || []
    const responsaveis = assignees
      .map((a) => (a.name?.trim() ? a.name.trim() : a.email))
      .filter(Boolean)
      .join('; ')
    return {
      ID: f.id,
      Projeto: f.Project?.name || '',
      Tipo: getTypeLabel(f.type),
      Severidade: f.severity ? getSeverityLabel(f.severity) : '',
      Status: exportStatusLabel(f.status),
      Comentário: f.comment || '',
      URL: f.pageUrl || '',
      'Criado em': formatDate(f.createdAt),
      Início: f.startDate ? formatDate(f.startDate) : '',
      Prazo: f.dueDate ? formatDate(f.dueDate) : '',
      Responsáveis: responsaveis,
    }
  })
}

export function exportDateStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function downloadReportsCsv(rows: Record<string, string>[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.map((h) => escapeCsvCell(h)).join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h] ?? '')).join(',')),
  ]
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  triggerBlobDownload(blob, filename)
}

export function downloadReportsXlsx(rows: Record<string, string>[], filename: string) {
  if (rows.length === 0) return
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reports')
  XLSX.writeFile(wb, filename)
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
