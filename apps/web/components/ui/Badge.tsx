import { clsx } from 'clsx'

type BadgeVariant =
  | 'BUG'
  | 'SUGGESTION'
  | 'QUESTION'
  | 'PRAISE'
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'default'

const variantClasses: Record<string, string> = {
  // Types — dark-friendly alpha backgrounds
  BUG: 'bg-red-500/15 text-red-400 border-red-500/25',
  SUGGESTION: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  QUESTION: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  PRAISE: 'bg-green-500/15 text-green-400 border-green-500/25',
  // Severity
  CRITICAL: 'bg-red-600/90 text-white border-red-600',
  HIGH: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  MEDIUM: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  LOW: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  // Status
  OPEN: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  IN_PROGRESS: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  RESOLVED: 'bg-green-500/15 text-green-400 border-green-500/25',
  CLOSED: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  // Default
  default: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
}

const labelMap: Record<string, string> = {
  BUG: 'Bug',
  SUGGESTION: 'Sugestão',
  QUESTION: 'Dúvida',
  PRAISE: 'Elogio',
  CRITICAL: 'Crítico',
  HIGH: 'Alto',
  MEDIUM: 'Médio',
  LOW: 'Baixo',
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
}

interface BadgeProps {
  variant?: BadgeVariant | string
  children?: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const classes = variantClasses[variant] || variantClasses.default
  const displayText = children ?? labelMap[variant] ?? variant

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        classes,
        className
      )}
    >
      {displayText}
    </span>
  )
}
