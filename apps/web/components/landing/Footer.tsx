import {
  Flex,
  Column,
  Text,
} from '@once-ui-system/core'
import { landingFooter } from '@/content/landing.pt-BR'

export function Footer() {
  return (
    <Flex
      as="footer"
      fillWidth
      horizontal="center"
      borderTop="neutral-medium"
      background="surface"
      role="contentinfo"
    >
      <Column maxWidth={64} fillWidth paddingX="l" paddingY="xl" gap="xl">
        <div className="landing-footer-grid">
          {/* Brand column */}
          <div className="landing-footer-col">
            <span className="landing-logo landing-logo--footer">Buug</span>
            <Text variant="body-default-xs" onBackground="neutral-weak" className="landing-footer-blurb">
              {landingFooter.blurb}
            </Text>
            <div className="landing-footer-social">
              <a href="https://www.linkedin.com/company/buug/about" target="_blank" rel="noopener noreferrer" className="landing-footer-social-link" aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://instagram.com/buug.io" target="_blank" rel="noopener noreferrer" className="landing-footer-social-link" aria-label="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <nav className="landing-footer-col" aria-label="Produto">
            <span className="landing-footer-heading">{landingFooter.productHeading}</span>
            {landingFooter.productLinks.map(link => (
              <a key={link.label} href={link.href} className="landing-footer-link">{link.label}</a>
            ))}
          </nav>

          {/* Company */}
          <nav className="landing-footer-col" aria-label="Empresa">
            <span className="landing-footer-heading">{landingFooter.companyHeading}</span>
            {landingFooter.companyLinks.map(link => (
              <a key={link.label} href={link.href} className="landing-footer-link">{link.label}</a>
            ))}
          </nav>

          {/* Legal */}
          <nav className="landing-footer-col" aria-label="Legal">
            <span className="landing-footer-heading">{landingFooter.legalHeading}</span>
            {landingFooter.legalLinks.map(link => (
              <a key={link.label} href={link.href} className="landing-footer-link">{link.label}</a>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="landing-footer-bottom">
          <Text variant="body-default-xs" onBackground="neutral-weak">
            &copy; {new Date().getFullYear()} {landingFooter.copyright}
          </Text>
          <div className="landing-footer-badges">
            {[
              <svg key="fb0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>,
              <svg key="fb1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
              <svg key="fb2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /><circle cx="12" cy="16" r="1" /></svg>,
            ].map((icon, i) => (
              <div key={i} className="landing-footer-badge-item">
                {icon}
                <span>{landingFooter.badges[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </Column>
    </Flex>
  )
}
