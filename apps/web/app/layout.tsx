import Script from 'next/script'
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import '@once-ui-system/core/css/tokens.css'
import '@once-ui-system/core/css/styles.css'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['700'] })

export const metadata: Metadata = {
  title: 'Report Bug — QA com Captura em Tempo Real',
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
      <body className={inter.className} style={{ ['--font-logo' as string]: spaceGrotesk.style.fontFamily }}>
        <Providers>{children}</Providers>
        <Script src="/embed.js?v=4" data-project="d21f0583-5d85-4e3f-aa4b-e1a6c9bcd2a6" strategy="lazyOnload" />
      </body>
    </html>
  )
}
