'use client'

import { Clock, ChevronRight } from 'lucide-react'
import { ICON_PX, LUCIDE_ICON_PX } from '@/lib/icon-tokens'
import { AppIcon } from '@/components/ui/AppIcon'
import { formatDate, getTagColors, getTypeLabel, getSeverityLabel, getStatusLabel } from '../utils/labels'

interface Feedback {
  id: string
  type: string
  severity?: string
  status: string
  comment: string
  screenshotUrl?: string
  createdAt: string
  pageUrl?: string
  projectId: string
  Project?: { id: string; name: string; ownerId?: string }
}

interface CardViewProps {
  feedbacks: Feedback[]
  feedbackAssigneesMap: Record<string, { userId: string; name: string | null; email: string }[]>
  isSelected: (id: string) => boolean
  onToggleSelect: (id: string) => void
  selectedCount: number
  onOpenDetail: (feedbackId: string) => void
}

export default function CardView({
  feedbacks,
  feedbackAssigneesMap,
  isSelected,
  onToggleSelect,
  selectedCount,
  onOpenDetail,
}: CardViewProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {feedbacks.map((feedback) => {
        const selected = isSelected(feedback.id)
        return (
          <div
            key={feedback.id}
            className="w-full p-4 rounded-xl bg-glass-gradient border border-transparent-white cursor-pointer transition-shadow"
            style={{
              outline: selected ? '2px solid rgba(139, 92, 246, 0.7)' : undefined,
              outlineOffset: -1,
            }}
          >
            <div className="flex items-center gap-4">
              {/* Checkbox */}
              <div
                onClick={(e) => { e.stopPropagation(); onToggleSelect(feedback.id) }}
                style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: selected ? '2px solid rgba(139, 92, 246, 0.7)' : '2px solid rgba(255,255,255,0.1)',
                  background: selected ? 'rgba(139, 92, 246, 0.7)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                {selected && (
                  <AppIcon size={10} strokeWidth={3} style={{ color: '#fff' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </AppIcon>
                )}
              </div>

              {feedback.screenshotUrl && (
                <div className="flex-shrink-0" onClick={() => onOpenDetail(feedback.id)}>
                  <img
                    src={feedback.screenshotUrl}
                    alt="Screenshot"
                    className="w-20 h-14 object-cover rounded-lg border border-transparent-white"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 w-full min-w-0" onClick={() => onOpenDetail(feedback.id)}>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.type).bg, color: getTagColors(feedback.type).color }}>{getTypeLabel(feedback.type)}</span>
                  {feedback.severity && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.severity).bg, color: getTagColors(feedback.severity).color }}>{getSeverityLabel(feedback.severity)}</span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: getTagColors(feedback.status).bg, color: getTagColors(feedback.status).color }}>{getStatusLabel(feedback.status)}</span>
                  {feedback.Project?.name && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{feedback.Project.name}</span>
                  )}
                  {(feedbackAssigneesMap[feedback.id] || []).length > 0 && (
                    <div style={{ display: 'flex', marginLeft: 4 }}>
                      {(feedbackAssigneesMap[feedback.id] || []).slice(0, 3).map((a, idx) => (
                        <div key={a.userId} title={a.name || a.email} style={{
                          width: 20, height: 20, borderRadius: '50%', background: '#111', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, marginLeft: idx > 0 ? -6 : 0, border: '2px solid var(--surface-background)', zIndex: 3 - idx,
                        }}>
                          {(a.name || a.email).charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(feedbackAssigneesMap[feedback.id] || []).length > 3 && (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, marginLeft: -6, border: '2px solid var(--surface-background)' }}>
                          +{(feedbackAssigneesMap[feedback.id] || []).length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span
                  className="text-sm text-primary-text"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {feedback.comment}
                </span>
                <div className="flex items-center gap-2">
                  <Clock size={ICON_PX.xs} className="text-gray" />
                  <span className="text-xs text-gray">
                    {formatDate(feedback.createdAt)}
                  </span>
                  {feedback.pageUrl && (
                    <>
                      <span className="text-xs text-gray">|</span>
                      <span className="text-xs text-gray truncate" style={{ maxWidth: '15rem' }}>
                        {feedback.pageUrl}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div onClick={() => onOpenDetail(feedback.id)}>
                <ChevronRight size={LUCIDE_ICON_PX} className="text-gray" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
