import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const warnings: { type: string; message: string }[] = []
  let compatible = true
  let recommendedMode: 'proxy' | 'embed' = 'proxy'
  let proxyBlocked = false
  let siteType: string | null = null
  let metaDescription: string | null = null
  let metaTitle: string | null = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,*/*',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      warnings.push({
        type: 'error',
        message: `O site retornou status ${res.status}. Verifique se a URL está correta e acessível.`,
      })
      compatible = false
      return NextResponse.json({ compatible, warnings, recommendedMode, proxyBlocked, siteType, metaDescription, metaTitle })
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      warnings.push({
        type: 'error',
        message: `A URL não retorna HTML (content-type: ${contentType}). O proxy só funciona com páginas web.`,
      })
      compatible = false
      return NextResponse.json({ compatible, warnings, recommendedMode, proxyBlocked, siteType, metaDescription, metaTitle })
    }

    const html = await res.text()

    // Extract meta description and title
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)
    if (descMatch?.[1]) {
      metaDescription = descMatch[1].trim().slice(0, 200)
    }
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch?.[1]) {
      metaTitle = titleMatch[1].trim()
    }

    // Check for Flutter — proxy won't work
    if (
      html.includes('flutter.js') ||
      html.includes('main.dart.js') ||
      html.includes('flutter_service_worker') ||
      html.includes('_flutter')
    ) {
      siteType = 'Flutter Web'
      proxyBlocked = true
      recommendedMode = 'embed'
      compatible = false
      warnings.push({
        type: 'error',
        message:
          'Site Flutter Web detectado. Apps Flutter usam Canvas/WebGL para renderizar — o Link Rápido não funciona. Use a Instalação no Site.',
      })
    }

    // Check for Angular
    if (
      !proxyBlocked &&
      (html.includes('ng-version') ||
       html.includes('ng-app') ||
       html.includes('angular.min.js') ||
       html.includes('@angular/core') ||
       html.includes('ng-controller'))
    ) {
      siteType = 'Angular'
      recommendedMode = 'embed'
      warnings.push({
        type: 'info',
        message:
          'Site Angular detectado. Recomendamos a Instalação no Site para melhor compatibilidade com SPAs.',
      })
    }

    // Check for React SPA (client-side rendered with minimal HTML)
    if (
      !proxyBlocked &&
      !siteType &&
      (html.includes('__next') || html.includes('_next/static') || html.includes('__NEXT_DATA__'))
    ) {
      siteType = 'Next.js'
      recommendedMode = 'embed'
      warnings.push({
        type: 'info',
        message:
          'Site Next.js detectado. Recomendamos a Instalação no Site para melhor integração.',
      })
    }

    if (
      !proxyBlocked &&
      !siteType &&
      (html.includes('react-root') ||
       html.includes('__react') ||
       html.includes('data-reactroot') ||
       html.includes('react.production.min') ||
       html.includes('react-dom'))
    ) {
      siteType = 'React SPA'
      recommendedMode = 'embed'
      warnings.push({
        type: 'info',
        message:
          'Site React detectado. Recomendamos a Instalação no Site para melhor compatibilidade com SPAs.',
      })
    }

    // Check for Vue.js
    if (
      !proxyBlocked &&
      !siteType &&
      (html.includes('__vue') ||
       html.includes('data-v-') ||
       html.includes('vue.min.js') ||
       html.includes('vue.runtime') ||
       html.includes('nuxt') ||
       html.includes('__nuxt'))
    ) {
      siteType = html.toLowerCase().includes('nuxt') ? 'Nuxt.js' : 'Vue.js'
      recommendedMode = 'embed'
      warnings.push({
        type: 'info',
        message:
          `Site ${siteType} detectado. Recomendamos a Instalação no Site para melhor compatibilidade com SPAs.`,
      })
    }

    // Check for Svelte/SvelteKit
    if (
      !proxyBlocked &&
      !siteType &&
      (html.includes('__sveltekit') ||
       html.includes('svelte') ||
       html.includes('.svelte-'))
    ) {
      siteType = 'SvelteKit'
      recommendedMode = 'embed'
      warnings.push({
        type: 'info',
        message:
          'Site SvelteKit detectado. Recomendamos a Instalação no Site para melhor compatibilidade.',
      })
    }

    // Check for heavy CSP that blocks iframes — proxy won't work
    const csp = res.headers.get('content-security-policy') || ''
    if (csp && (csp.includes("frame-ancestors 'none'") || csp.includes("frame-ancestors 'self'"))) {
      proxyBlocked = true
      recommendedMode = 'embed'
      compatible = false
      warnings.push({
        type: 'error',
        message:
          'O site bloqueia carregamento em iframe via CSP. O Link Rápido não funcionará. Use a Instalação no Site.',
      })
    } else if (csp && csp.includes('frame-ancestors')) {
      warnings.push({
        type: 'warning',
        message:
          'O site define Content-Security-Policy com frame-ancestors. O proxy pode ter limitações.',
      })
      if (recommendedMode === 'proxy') recommendedMode = 'embed'
    }

    // Check X-Frame-Options header
    const xfo = res.headers.get('x-frame-options') || ''
    if (!proxyBlocked && xfo && (xfo.toUpperCase() === 'DENY' || xfo.toUpperCase() === 'SAMEORIGIN')) {
      proxyBlocked = true
      recommendedMode = 'embed'
      compatible = false
      warnings.push({
        type: 'error',
        message:
          'O site bloqueia carregamento em iframe (X-Frame-Options). O Link Rápido não funcionará. Use a Instalação no Site.',
      })
    }

    // Check for external CDNs with known CORS restrictions
    const externalDomains = new Set<string>()
    const srcMatches = html.matchAll(/(?:src|href)=["']https?:\/\/([^/"']+)/gi)
    for (const match of srcMatches) {
      const domain = match[1]
      if (domain && !domain.includes(new URL(url).hostname)) {
        externalDomains.add(domain)
      }
    }
    if (externalDomains.size > 10) {
      warnings.push({
        type: 'info',
        message: `O site carrega recursos de ${externalDomains.size}+ domínios externos (CDNs). Alguns podem não funcionar corretamente através do proxy.`,
      })
    }

    // Check for Service Worker — problematic for proxy
    if (html.includes('serviceWorker.register') || html.includes('navigator.serviceWorker')) {
      if (recommendedMode === 'proxy') recommendedMode = 'embed'
      warnings.push({
        type: 'warning',
        message:
          'O site usa Service Worker, que pode interferir no funcionamento do proxy interceptando requisições.',
      })
    }

    // Check for Google-heavy integrations
    if (html.includes('accounts.google.com') || html.includes('googleapis.com/maps')) {
      warnings.push({
        type: 'info',
        message:
          'O site usa serviços Google (Auth/Maps) que exigem origens autorizadas e podem não funcionar através do proxy.',
      })
    }

    // If no issues detected, it's a simple site — proxy is great
    if (warnings.length === 0) {
      siteType = 'Site estático'
      recommendedMode = 'proxy'
      warnings.push({
        type: 'success',
        message: 'O site parece compatível com o Link Rápido! Nenhum problema detectado.',
      })
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      warnings.push({
        type: 'error',
        message: 'Timeout: o site demorou mais de 8 segundos para responder.',
      })
    } else {
      warnings.push({
        type: 'error',
        message: `Não foi possível acessar o site: ${err.message}`,
      })
    }
    compatible = false
  }

  return NextResponse.json({ compatible, warnings, recommendedMode, proxyBlocked, siteType, metaDescription, metaTitle })
}
