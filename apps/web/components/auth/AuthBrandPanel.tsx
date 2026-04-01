import { AuthLogoLink } from './AuthLogoLink'

export type AuthBrandFeature = {
  icon: React.ReactNode
  text: string
}

export function AuthBrandPanel({
  headline,
  lead,
  features,
}: {
  headline: string
  lead: string
  features: AuthBrandFeature[]
}) {
  return (
    <div className="auth-brand-panel relative flex-1 overflow-hidden bg-primary-gradient sticky top-0 h-screen">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 70% 20%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10 flex h-full w-full flex-col items-start justify-center gap-8 p-10 md:p-12">
        <AuthLogoLink tone="on-gradient" />

        <div className="flex max-w-[24rem] flex-col gap-4">
          <h2 className="m-0 text-[2rem] font-bold leading-tight text-white">{headline}</h2>
          <p className="m-0 text-base leading-relaxed text-white/80">{lead}</p>
        </div>

        <ul className="flex max-w-[22rem] list-none flex-col gap-4 p-0 m-0">
          {features.map((item) => (
            <li key={item.text} className="flex items-center gap-3">
              <div className="auth-brand-feature-icon">{item.icon}</div>
              <span className="text-sm text-white/90">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
