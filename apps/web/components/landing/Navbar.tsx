'use client'

import { useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'
import { Container } from '@/components/ui/Container'
import { landingAuth, landingNavLinks } from '@/content/landing.pt-BR'
import { MenuIcon, CloseIcon } from './icons'

interface NavbarProps {
  isLoggedIn: boolean
}

export function Navbar({ isLoggedIn }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 z-10 w-full',
        'border-b border-transparent-white',
        'backdrop-blur-[12px]'
      )}
    >
      <Container className="flex h-navigation-height items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="font-logo text-2xl font-bold tracking-tight text-off-white no-underline"
        >
          Buug
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {landingNavLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gray transition-colors hover:text-off-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-4">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className={clsx(
                'inline-flex items-center justify-center rounded-full',
                'bg-primary-gradient px-4 py-1.5 text-sm font-medium text-white',
                'transition-opacity hover:opacity-90'
              )}
            >
              {landingAuth.accessPanel}
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-sm text-gray transition-colors hover:text-off-white"
              >
                {landingAuth.login}
              </Link>
              <Link
                href="/auth/register"
                className={clsx(
                  'inline-flex items-center justify-center rounded-full',
                  'bg-primary-gradient px-4 py-1.5 text-sm font-medium text-white',
                  'transition-opacity hover:opacity-90'
                )}
              >
                {landingAuth.signupFree}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-off-white"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </Container>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 top-navigation-height z-50 bg-background md:hidden">
          <nav className="flex flex-col items-center gap-6 pt-12">
            {landingNavLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-lg text-off-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}

            <div className="mt-4 flex flex-col items-center gap-4">
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className={clsx(
                    'inline-flex items-center justify-center rounded-full',
                    'bg-primary-gradient px-6 py-2 text-md font-medium text-white'
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {landingAuth.accessPanel}
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/register"
                    className={clsx(
                      'inline-flex items-center justify-center rounded-full',
                      'bg-primary-gradient px-6 py-2 text-md font-medium text-white'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {landingAuth.signupFree}
                  </Link>
                  <Link
                    href="/auth/login"
                    className="text-md text-gray hover:text-off-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    {landingAuth.login}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
