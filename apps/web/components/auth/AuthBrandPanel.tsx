import type { ReactNode } from 'react'
import clsx from 'clsx'
import { AuthLogoLink } from './AuthLogoLink'

export type AuthBrandFeature = {
  icon: ReactNode
  title: string
  description?: string
}

export function AuthBrandPanel({
  tag,
  headline,
  lead,
  features,
}: {
  /** Mesmo padrão do pill do hero da landing (`landingHero.tag`). */
  tag?: string
  headline: ReactNode
  lead: string
  features: AuthBrandFeature[]
}) {
  return (
    <div className="auth-brand-panel relative h-screen flex-1 overflow-hidden bg-primary-gradient sticky top-0">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }}
      />
      <div
        className={clsx(
          'relative z-10 flex h-full w-full flex-col items-start justify-center gap-6',
          'px-6 py-10 md:px-10 md:py-16 lg:px-12'
        )}
      >
        <AuthLogoLink tone="on-gradient" />

        {tag ? (
          <span
            className={clsx(
              'inline-flex items-center rounded-full border border-transparent-white px-3 py-1',
              'text-xs text-white/70'
            )}
          >
            {tag}
          </span>
        ) : null}

        <div className="flex max-w-[24rem] flex-col gap-4">
          <h2 className="text-white text-xl font-bold leading-[1.2] tracking-tight md:text-2xl md:leading-[1.15]">
            {headline}
          </h2>
          <p className="m-0 text-sm leading-relaxed text-white/60">{lead}</p>
        </div>

        <ul className="m-0 flex max-w-[24rem] list-none flex-col gap-3 p-0">
          {features.map((item) => (
            <li key={item.title} className="flex items-center gap-3">
              <div className="auth-brand-feature-icon text-white">{item.icon}</div>
              <span className="text-sm font-medium text-white/90">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
