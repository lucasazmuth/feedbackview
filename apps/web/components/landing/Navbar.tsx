'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Row, Button } from '@once-ui-system/core'
import { landingAuth, landingNavLinks } from '@/content/landing.pt-BR'
import { MenuIcon, CloseIcon } from './icons'

interface NavbarProps {
  isLoggedIn: boolean
}

export function Navbar({ isLoggedIn }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="landing-navbar" aria-label="Navegação principal">
      <span className="landing-logo">Buug</span>

      <ul className="nav-links" role="menubar">
        {landingNavLinks.map((item) => (
          <li key={item.href} role="none">
            <a href={item.href} className="nav-link-item" role="menuitem">
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      <Row gap="s" vertical="center" className="nav-auth-buttons">
        {isLoggedIn ? (
          <Link href="/dashboard">
            <Button variant="primary" size="s" label={landingAuth.panel} />
          </Link>
        ) : (
          <>
            <Link href="/auth/login">
              <Button variant="tertiary" size="s" label={landingAuth.login} />
            </Link>
            <Link href="/auth/register">
              <Button variant="primary" size="s" label={landingAuth.signupFree} />
            </Link>
          </>
        )}
      </Row>

      {/* Mobile hamburger */}
      <button
        className="nav-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="nav-mobile-menu" role="menu">
          {landingNavLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-mobile-link"
              role="menuitem"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="nav-mobile-auth">
            {isLoggedIn ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" size="m" label={landingAuth.panel} fillWidth />
              </Link>
            ) : (
              <>
                <Link href="/auth/register" onClick={() => setMobileOpen(false)}>
                  <Button variant="primary" size="m" label={landingAuth.signupFree} fillWidth />
                </Link>
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="tertiary" size="m" label={landingAuth.login} fillWidth />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
