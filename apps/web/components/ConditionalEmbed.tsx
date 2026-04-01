'use client'

import { usePathname } from 'next/navigation'
import Script from 'next/script'

/**
 * Widget de feedback: não carrega em /auth/* para manter a mesma experiência “limpa” da landing no login/cadastro.
 */
export function ConditionalEmbed() {
  const path = usePathname()
  // Evita carregar o widget antes do pathname existir (hidratação) ou em qualquer rota /auth/*
  if (!path || path.startsWith('/auth')) return null

  return (
    <Script
      src="/embed.js"
      data-project="d21f0583-5d85-4e3f-aa4b-e1a6c9bcd2a6"
      strategy="lazyOnload"
    />
  )
}
