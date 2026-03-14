import { FastifyRequest, FastifyReply } from 'fastify'
import { Transform, PassThrough } from 'stream'
import { pipeline } from 'stream/promises'

const PROXY_BASE = process.env.PROXY_BASE_URL || 'http://localhost:3002'
const TRACKER_URL = process.env.TRACKER_URL || 'http://localhost:3002/tracker.js'

const BLOCKED_REQUEST_HEADERS = ['host', 'connection', 'transfer-encoding']
const BLOCKED_RESPONSE_HEADERS = [
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'x-content-type-options',
  'strict-transport-security',
]

export async function createProxyHandler(
  request: FastifyRequest,
  reply: FastifyReply,
  targetUrl: string,
  projectId: string
) {
  const proxyBase = `${PROXY_BASE}/proxy/${projectId}`

  // Build outgoing headers
  const outHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': request.headers['accept'] as string || '*/*',
    'Accept-Language': request.headers['accept-language'] as string || 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  }

  // Forward cookies (minus SameSite=Strict which won't work cross-origin)
  if (request.headers.cookie) {
    outHeaders['Cookie'] = request.headers.cookie
  }

  // Forward referer rewritten to target domain
  if (request.headers.referer) {
    try {
      const refUrl = new URL(request.headers.referer)
      const targetBase = new URL(targetUrl)
      outHeaders['Referer'] = request.headers.referer.replace(refUrl.origin, targetBase.origin)
    } catch {}
  }

  let res: Response
  try {
    res = await fetch(targetUrl, {
      method: request.method,
      headers: outHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body as any,
      redirect: 'follow',
    })
  } catch (err: any) {
    return reply.code(502).send({ error: `Proxy fetch failed: ${err.message}` })
  }

  // Build response headers — remove blockers
  const responseHeaders: Record<string, string> = {}
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (BLOCKED_RESPONSE_HEADERS.includes(lower)) return
    if (lower === 'set-cookie') {
      // Rewrite cookies: remove SameSite=Strict/Lax, fix domain
      const rewritten = value
        .replace(/;\s*SameSite=(Strict|Lax)/gi, '; SameSite=None')
        .replace(/;\s*Secure/gi, '; Secure')
        .replace(/;\s*Domain=[^;]*/gi, '')
      responseHeaders[key] = rewritten
      return
    }
    responseHeaders[key] = value
  })

  // Don't pass content-encoding since we'll decode
  delete responseHeaders['content-encoding']
  delete responseHeaders['content-length']

  reply.code(res.status)

  const contentType = res.headers.get('content-type') || ''
  const isHtml = contentType.includes('text/html')
  const isCss = contentType.includes('text/css')
  const isJs = contentType.includes('javascript')

  if (!res.body) {
    return reply.headers(responseHeaders).send('')
  }

  reply.headers(responseHeaders)

  if (isHtml) {
    let html = await decodeResponse(res)
    html = rewriteHtml(html, proxyBase, projectId)
    html = injectTracker(html, projectId)
    // Set cookie so the notFoundHandler can resolve assets after replaceState removes /proxy/ID from URL
    reply.header('Set-Cookie', `__fv_pid=${projectId}; Path=/; SameSite=None; Secure`)
    return reply.type('text/html').send(html)
  }

  if (isCss) {
    let css = await decodeResponse(res)
    css = rewriteCss(css, proxyBase)
    return reply.type(contentType).send(css)
  }

  if (isJs) {
    let js = await decodeResponse(res)
    js = rewriteJs(js, proxyBase)
    return reply.type(contentType).send(js)
  }

  // Binary: stream through
  const buffer = await res.arrayBuffer()
  return reply.send(Buffer.from(buffer))
}

async function decodeResponse(res: Response): Promise<string> {
  // Node's fetch (undici) auto-decompresses gzip/br/deflate; body is already plain text
  return res.text()
}

function rewriteUrl(url: string, proxyBase: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) return url
  if (url.startsWith('//')) return `${proxyBase}/${url.replace(/^\/\//, 'https://')}`
  if (url.startsWith('/')) return `${proxyBase}${url}`
  if (url.startsWith('http://') || url.startsWith('https://')) return `${proxyBase}/${url}`
  return url
}

function rewriteHtml(html: string, proxyBase: string, projectId: string): string {
  // Rewrite href, src, action, srcset attributes
  return html
    .replace(/(href|src|action)="([^"]*?)"/gi, (_, attr, url) => `${attr}="${rewriteUrl(url, proxyBase)}"`)
    .replace(/(href|src|action)='([^']*?)'/gi, (_, attr, url) => `${attr}='${rewriteUrl(url, proxyBase)}'`)
    .replace(/url\(['"]?([^)'"]+)['"]?\)/gi, (_, url) => `url(${rewriteUrl(url, proxyBase)})`)
    // Rewrite fetch and XHR in inline scripts
    .replace(/fetch\(['"]([^'"]+)['"]/g, (_, url) => `fetch('${rewriteUrl(url, proxyBase)}'`)
    .replace(/\.open\(['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g, (_, method, url) =>
      `.open('${method}', '${rewriteUrl(url, proxyBase)}'`)
}

function rewriteCss(css: string, proxyBase: string): string {
  return css
    .replace(/url\(['"]?([^)'"]+)['"]?\)/gi, (_, url) => `url(${rewriteUrl(url, proxyBase)})`)
    .replace(/@import\s+['"]([^'"]+)['"]/gi, (_, url) => `@import '${rewriteUrl(url, proxyBase)}'`)
}

function rewriteJs(js: string, proxyBase: string): string {
  return js
    .replace(/fetch\(['"]([^'"]+)['"]/g, (_, url) => `fetch('${rewriteUrl(url, proxyBase)}'`)
    .replace(/\.open\(['"](\w+)['"]\s*,\s*['"]([^'"]+)['"]/g, (_, method, url) =>
      `.open('${method}', '${rewriteUrl(url, proxyBase)}'`)
}

function injectTracker(html: string, projectId: string): string {
  const proxyPath = `/proxy/${projectId}`
  // Must run BEFORE any other script so SPA router sees "/"
  const routerFix = `<script>
(function(){
  var base = "${proxyPath}";
  // Immediately rewrite URL to "/" so SPA router initializes on root
  var p = window.location.pathname;
  if(p.startsWith(base)){
    var newPath = p.slice(base.length) || '/';
    window.history.replaceState(null, '', newPath + window.location.search + window.location.hash);
  }
  // Intercept future navigations to add proxy prefix back for server requests
  var origPush = window.history.pushState.bind(window.history);
  var origReplace = window.history.replaceState.bind(window.history);
  window.history.pushState = function(s,t,u){ return origPush(s,t,u); };
  window.history.replaceState = function(s,t,u){ return origReplace(s,t,u); };
})();
</script>`
  const trackerScript = `<script src="${TRACKER_URL}" data-project="${projectId}" data-proxy-base="${PROXY_BASE}/proxy/${projectId}"></script>`
  // Inject router fix at the very top of <head> (before other scripts)
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${routerFix}${trackerScript}`)
  }
  if (html.includes('<head ')) {
    return html.replace(/<head([^>]*)>/, `<head$1>${routerFix}${trackerScript}`)
  }
  return routerFix + trackerScript + html
}
