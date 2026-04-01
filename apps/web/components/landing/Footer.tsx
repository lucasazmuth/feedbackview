import { Container } from '@/components/ui/Container'
import { landingFooter } from '@/content/landing.pt-BR'

export function Footer() {
  return (
    <footer role="contentinfo">
      <Container className="pt-6 pb-10 md:pt-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,18rem)_repeat(3,minmax(0,1fr))] lg:gap-x-12 items-start mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-1">
            <span className="text-lg font-bold text-off-white">Buug</span>
            <p className="text-sm text-gray leading-relaxed m-0 max-w-[18rem]">
              {landingFooter.blurb}
            </p>
          </div>

          {/* Product links */}
          <nav className="flex flex-col gap-3" aria-label="Produto">
            <span className="text-xs font-bold uppercase tracking-wider text-gray mb-1">
              {landingFooter.productHeading}
            </span>
            {landingFooter.productLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-primary-text transition-colors hover:text-off-white no-underline"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Company links */}
          <nav className="flex flex-col gap-3" aria-label="Empresa">
            <span className="text-xs font-bold uppercase tracking-wider text-gray mb-1">
              {landingFooter.companyHeading}
            </span>
            {landingFooter.companyLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-primary-text transition-colors hover:text-off-white no-underline"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Legal links */}
          <nav className="flex flex-col gap-3" aria-label="Legal">
            <span className="text-xs font-bold uppercase tracking-wider text-gray mb-1">
              {landingFooter.legalHeading}
            </span>
            {landingFooter.legalLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-primary-text transition-colors hover:text-off-white no-underline"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-transparent-white pt-6">
          <span className="text-xs text-gray">
            &copy; {new Date().getFullYear()} {landingFooter.copyright}
          </span>
          <div className="flex items-center gap-2">
            {landingFooter.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 rounded-full border border-transparent-white bg-transparent-white px-2.5 py-0.5 text-[1rem] text-gray"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  )
}
