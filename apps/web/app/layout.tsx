import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@once-ui-system/core/css/tokens.css'
import '@once-ui-system/core/css/styles.css'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Qbug — QA com Captura em Tempo Real',
  description: 'Plataforma de QA com captura automática de bugs: screenshot, session replay e logs.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      data-theme="light"
      data-brand="indigo"
      data-accent="violet"
      data-neutral="slate"
      data-solid="contrast"
      data-solid-style="flat"
      data-border="playful"
      data-surface="filled"
      data-transition="all"
      data-scaling="100"
      data-viz-style="gradient"
      suppressHydrationWarning
    >
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
