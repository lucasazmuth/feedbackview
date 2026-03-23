import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Dispatch an event to all matching webhooks for an organization
 */
export async function dispatchWebhookEvent(params: {
  organizationId: string
  event: string
  payload: Record<string, unknown>
}): Promise<void> {
  const { organizationId, event, payload } = params

  // Find all active webhooks for this org that listen to this event
  const { data: webhooks } = await supabaseAdmin
    .from('Webhook')
    .select('id, url, secret, events')
    .eq('organizationId', organizationId)
    .eq('active', true)

  if (!webhooks || webhooks.length === 0) return

  const matchingWebhooks = webhooks.filter(w =>
    w.events.includes(event) || w.events.includes('*')
  )

  // Dispatch to each webhook (fire-and-forget)
  for (const webhook of matchingWebhooks) {
    void deliverWebhook(webhook, event, payload)
  }
}

async function deliverWebhook(
  webhook: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() })
  const signature = createHmac('sha256', webhook.secret).update(body).digest('hex')

  let statusCode: number | null = null
  let response: string | null = null
  let success = false

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Buug-Event': event,
        'X-Buug-Signature': `sha256=${signature}`,
        'User-Agent': 'Buug-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })

    statusCode = res.status
    response = await res.text().catch(() => null)
    success = res.ok
  } catch (err: any) {
    response = err.message || 'Connection failed'
  }

  // Log delivery
  void supabaseAdmin
    .from('WebhookDelivery')
    .insert({
      webhookId: webhook.id,
      event,
      payload: { event, data: payload },
      statusCode,
      response: response?.slice(0, 1000), // Limit response size
      success,
      attempts: 1,
    })
    .then(() => {})
}
