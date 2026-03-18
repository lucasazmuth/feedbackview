import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import '@once-ui-system/core/css/tokens.css'
import '@once-ui-system/core/css/styles.css'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['700'] })

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#111111',
}

const SITE_URL = 'https://buug.io'

export const metadata: Metadata = {
  title: {
    default: 'Buug — Bug Reporting com Web Vitals, Replay e Rage Clicks',
    template: '%s | Buug',
  },
  description: 'Plataforma de QA com captura automática: screenshot, session replay, Core Web Vitals, rage clicks e logs de console. Resolva bugs sem reproduzir.',
  keywords: ['bug reporting', 'QA', 'session replay', 'web vitals', 'rage clicks', 'screenshot automático', 'feedback widget', 'teste de software'],
  authors: [{ name: 'Buug' }],
  creator: 'Buug',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'Buug',
    title: 'Buug — Bug Reporting com Web Vitals, Replay e Rage Clicks',
    description: 'O único QA tool que captura Core Web Vitals, rage clicks e session replay em cada report. Setup em 1 minuto.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Buug — QA com captura em tempo real' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buug — Bug Reporting com Web Vitals e Replay',
    description: 'O único QA tool que captura Core Web Vitals, rage clicks e session replay em cada report.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: {},
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
        <Script src={`/embed.js?v=${Date.now()}`} data-project="d21f0583-5d85-4e3f-aa4b-e1a6c9bcd2a6" strategy="lazyOnload" />
        {/* Google Analytics 4 — set NEXT_PUBLIC_GA_ID in .env to activate */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} strategy="afterInteractive" />
            <Script id="gtag-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}',{page_path:window.location.pathname});`}</Script>
          </>
        )}
      </body>
    </html>
  )
}
