import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  const warnings: { type: string; message: string }[] = []
  let compatible = true

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
      return NextResponse.json({ compatible, warnings })
    }

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('text/html')) {
      warnings.push({
        type: 'error',
        message: `A URL não retorna HTML (content-type: ${contentType}). O proxy só funciona com páginas web.`,
      })
      compatible = false
      return NextResponse.json({ compatible, warnings })
    }

    const html = await res.text()

    // Check for Flutter
    if (
      html.includes('flutter.js') ||
      html.includes('main.dart.js') ||
      html.includes('flutter_service_worker') ||
      html.includes('_flutter')
    ) {
      warnings.push({
        type: 'warning',
        message:
          'Este site parece usar Flutter Web. Apps Flutter usam Canvas/WebGL para renderizar, o que limita a captura de sessão e pode causar problemas de compatibilidade.',
      })
      compatible = false
    }

    // Check for heavy CSP
    const csp = res.headers.get('content-security-policy') || ''
    if (csp && (csp.includes("frame-ancestors 'none'") || csp.includes('frame-ancestors'))) {
      warnings.push({
        type: 'warning',
        message:
          'O site define Content-Security-Policy que pode bloquear o carregamento em iframe. O proxy remove esses headers, mas pode haver limitações.',
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

    // Check for Service Worker
    if (html.includes('serviceWorker.register') || html.includes('navigator.serviceWorker')) {
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

    if (warnings.length === 0) {
      warnings.push({
        type: 'success',
        message: 'O site parece compatível com o proxy! Nenhum problema detectado.',
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

  return NextResponse.json({ compatible, warnings })
}
