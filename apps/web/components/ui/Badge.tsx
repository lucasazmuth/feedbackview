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
  // Types
  BUG: 'bg-red-100 text-red-700 border-red-200',
  SUGGESTION: 'bg-blue-100 text-blue-700 border-blue-200',
  QUESTION: 'bg-purple-100 text-purple-700 border-purple-200',
  PRAISE: 'bg-green-100 text-green-700 border-green-200',
  // Severity
  CRITICAL: 'bg-red-600 text-white border-red-700',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200',
  // Status
  OPEN: 'bg-amber-100 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-100 text-green-700 border-green-200',
  CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
  // Default
  default: 'bg-gray-100 text-gray-600 border-gray-200',
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
