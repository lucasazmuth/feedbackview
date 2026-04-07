import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'
import { ConditionalEmbed } from '@/components/ConditionalEmbed'
import { landingMeta } from '@/content/landing.pt-BR'

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

const SITE_URL = 'https://buug.io'

export const metadata: Metadata = {
  title: {
    default: landingMeta.title,
    template: '%s | Buug',
  },
  description: landingMeta.description,
  keywords: [
    'relatório de bug',
    'QA',
    'replay de sessão',
    'web vitals',
    'homologação',
    'feedback em site',
    'widget de bug',
    'teste de software',
    'e-commerce',
    'agência',
  ],
  authors: [{ name: 'Buug' }],
  creator: 'Buug',
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: 'Buug',
    title: landingMeta.openGraphTitle,
    description: landingMeta.openGraphDescription,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Buug: QA com replay e Web Vitals' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: landingMeta.twitterTitle,
    description: landingMeta.twitterDescription,
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
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
        <ConditionalEmbed />
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
