import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createNotification, getOrgOwnerUserId } from '@/lib/notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET

/**
 * Due date notification cron job.
 *
 * Checks all non-resolved feedbacks with due dates and sends notifications:
 * - DUE_DATE_APPROACHING: due date is tomorrow
 * - DUE_DATE_EXPIRED: due date was yesterday (just expired)
 * - DUE_DATE_OVERDUE: due date was 3+ days ago (escalation to project owner)
 *
 * Call via: POST /api/cron/due-dates
 * Schedule: daily at ~9am
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const todayStart = new Date(now.toDateString())

  // Tomorrow range
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const tomorrowEnd = new Date(tomorrowStart)
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

  // Yesterday range
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  // 3 days ago
  const threeDaysAgo = new Date(todayStart)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
  const threeDaysAgoEnd = new Date(threeDaysAgo)
  threeDaysAgoEnd.setDate(threeDaysAgoEnd.getDate() + 1)

  let stats = { approaching: 0, expired: 0, overdue: 0 }

  // Get all non-resolved feedbacks with due dates
  const { data: feedbacks } = await supabase
    .from('Feedback')
    .select('id, comment, dueDate, projectId, status')
    .not('dueDate', 'is', null)
    .not('status', 'in', '("RESOLVED","CANCELLED","ARCHIVED")')
    .is('archivedAt', null)

  if (!feedbacks || feedbacks.length === 0) {
    return NextResponse.json({ message: 'No feedbacks with due dates', stats })
  }

  // Get project info for all feedback
  const projectIds = [...new Set(feedbacks.map(f => f.projectId))]
  const { data: projects } = await supabase
    .from('Project')
    .select('id, name, ownerId, organizationId')
    .in('id', projectIds)
  const projectMap = new Map((projects || []).map(p => [p.id, p]))

  // Get assignees for all feedback
  const feedbackIds = feedbacks.map(f => f.id)
  const { data: allAssignees } = await supabase
    .from('FeedbackAssignee')
    .select('feedbackId, userId')
    .in('feedbackId', feedbackIds)
  const assigneeMap = new Map<string, string[]>()
  for (const a of allAssignees || []) {
    if (!assigneeMap.has(a.feedbackId)) assigneeMap.set(a.feedbackId, [])
    assigneeMap.get(a.feedbackId)!.push(a.userId)
  }

  for (const feedback of feedbacks) {
    const dueDate = new Date(feedback.dueDate)
    const dueDateStart = new Date(dueDate.toDateString())
    const project = projectMap.get(feedback.projectId)
    if (!project) continue

    const commentPreview = (feedback.comment || '').slice(0, 50)
    const dueDateFormatted = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    const assignees = assigneeMap.get(feedback.id) || []
    const metadata = { feedbackId: feedback.id, projectId: feedback.projectId, dueDate: feedback.dueDate }

    // Due tomorrow
    if (dueDateStart.getTime() >= tomorrowStart.getTime() && dueDateStart.getTime() < tomorrowEnd.getTime()) {
      const title = `Prazo amanhã: ${dueDateFormatted}`
      const message = `"${commentPreview}..." no projeto ${project.name}`

      // Notify assignees + project owner
      const notifiedIds = new Set<string>()
      for (const uid of assignees) {
        createNotification({ userId: uid, type: 'DUE_DATE_APPROACHING', title, message, metadata })
        notifiedIds.add(uid)
      }
      if (project.ownerId && !notifiedIds.has(project.ownerId)) {
        createNotification({ userId: project.ownerId, type: 'DUE_DATE_APPROACHING', title, message, metadata })
      }
      stats.approaching++
    }

    // Expired yesterday
    if (dueDateStart.getTime() >= yesterdayStart.getTime() && dueDateStart.getTime() < todayStart.getTime()) {
      const title = `Prazo vencido: ${dueDateFormatted}`
      const message = `"${commentPreview}..." no projeto ${project.name} venceu ontem`

      const notifiedIds = new Set<string>()
      for (const uid of assignees) {
        createNotification({ userId: uid, type: 'DUE_DATE_EXPIRED', title, message, metadata })
        notifiedIds.add(uid)
      }
      if (project.ownerId && !notifiedIds.has(project.ownerId)) {
        createNotification({ userId: project.ownerId, type: 'DUE_DATE_EXPIRED', title, message, metadata })
      }
      stats.expired++
    }

    // Overdue 3+ days — escalation to project owner only
    if (dueDateStart.getTime() >= threeDaysAgo.getTime() && dueDateStart.getTime() < threeDaysAgoEnd.getTime()) {
      const title = `Report atrasado há 3 dias`
      const message = `"${commentPreview}..." no projeto ${project.name} — prazo era ${dueDateFormatted}`

      // Notify project owner
      if (project.ownerId) {
        createNotification({ userId: project.ownerId, type: 'DUE_DATE_OVERDUE', title, message, metadata })
      }
      // Notify org owner if different
      if (project.organizationId) {
        const orgOwnerId = await getOrgOwnerUserId(project.organizationId)
        if (orgOwnerId && orgOwnerId !== project.ownerId) {
          createNotification({ userId: orgOwnerId, type: 'DUE_DATE_OVERDUE', title, message, metadata })
        }
      }
      stats.overdue++
    }
  }

  return NextResponse.json({ message: 'Due date notifications sent', stats })
}
