import Link from 'next/link'
import clsx from 'clsx'

type Tone = 'on-gradient' | 'on-dark'

export function AuthLogoLink({
  tone = 'on-dark',
  className,
}: {
  tone?: Tone
  className?: string
}) {
  return (
    <Link
      href="/"
      className={clsx(
        'no-underline',
        tone === 'on-gradient' && 'text-white',
        tone === 'on-dark' && 'text-off-white',
        className
      )}
    >
      <span className="font-logo text-2xl font-bold tracking-tight">Buug</span>
    </Link>
  )
}
