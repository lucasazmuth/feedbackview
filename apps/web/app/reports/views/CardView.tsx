'use client'

import { Column, Row, Text, Tag, Icon, Card, Flex } from '@once-ui-system/core'
import { formatDate, getTagVariant, getTypeLabel, getSeverityLabel, getStatusLabel } from '../utils/labels'

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
    <Column gap="s" fillWidth>
      {feedbacks.map((feedback) => {
        const selected = isSelected(feedback.id)
        return (
          <Card
            key={feedback.id}
            fillWidth
            padding="m"
            radius="l"
            style={{
              transition: 'box-shadow 0.15s ease',
              cursor: 'pointer',
              outline: selected ? '2px solid var(--brand-solid-strong)' : undefined,
              outlineOffset: -1,
            }}
          >
            <Row gap="m" vertical="center">
              {/* Checkbox */}
              <div
                onClick={(e) => { e.stopPropagation(); onToggleSelect(feedback.id) }}
                style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: selected ? '2px solid var(--brand-solid-strong)' : '2px solid var(--neutral-border-medium)',
                  background: selected ? 'var(--brand-solid-strong)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                {selected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              {feedback.screenshotUrl && (
                <Flex style={{ flexShrink: 0 }} onClick={() => onOpenDetail(feedback.id)}>
                  <img
                    src={feedback.screenshotUrl}
                    alt="Screenshot"
                    style={{
                      width: '5rem',
                      height: '3.5rem',
                      objectFit: 'cover',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--neutral-border-medium)',
                    }}
                  />
                </Flex>
              )}
              <Column gap="s" fillWidth style={{ minWidth: 0 }} onClick={() => onOpenDetail(feedback.id)}>
                <Row gap="xs" wrap vertical="center">
                  <Tag variant={getTagVariant(feedback.type)} size="s" label={getTypeLabel(feedback.type)} />
                  {feedback.severity && (
                    <Tag variant={getTagVariant(feedback.severity)} size="s" label={getSeverityLabel(feedback.severity)} />
                  )}
                  <Tag variant={getTagVariant(feedback.status)} size="s" label={getStatusLabel(feedback.status)} />
                  {feedback.Project?.name && (
                    <Tag variant="neutral" size="s" label={feedback.Project.name} />
                  )}
                  {(feedbackAssigneesMap[feedback.id] || []).length > 0 && (
                    <div style={{ display: 'flex', marginLeft: 4 }}>
                      {(feedbackAssigneesMap[feedback.id] || []).slice(0, 3).map((a, idx) => (
                        <div key={a.userId} title={a.name || a.email} style={{
                          width: 20, height: 20, borderRadius: '50%', background: '#111', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, marginLeft: idx > 0 ? -6 : 0, border: '2px solid #fff', zIndex: 3 - idx,
                        }}>
                          {(a.name || a.email).charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(feedbackAssigneesMap[feedback.id] || []).length > 3 && (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--neutral-alpha-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 600, marginLeft: -6, border: '2px solid #fff' }}>
                          +{(feedbackAssigneesMap[feedback.id] || []).length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </Row>
                <Text
                  variant="body-default-s"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {feedback.comment}
                </Text>
                <Row gap="s" vertical="center">
                  <Icon name="clock" size="xs" />
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {formatDate(feedback.createdAt)}
                  </Text>
                  {feedback.pageUrl && (
                    <>
                      <Text variant="body-default-xs" onBackground="neutral-weak">|</Text>
                      <Text
                        variant="body-default-xs"
                        onBackground="neutral-weak"
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '15rem' }}
                      >
                        {feedback.pageUrl}
                      </Text>
                    </>
                  )}
                </Row>
              </Column>
              <div onClick={() => onOpenDetail(feedback.id)}>
                <Icon name="chevronRight" size="s" />
              </div>
            </Row>
          </Card>
        )
      })}
    </Column>
  )
}
