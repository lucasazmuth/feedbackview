import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Generate a new API key with prefix for identification
 * Returns: { key: 'buug_sk_abc123...', keyHash: 'sha256...', prefix: 'buug_sk_abc1' }
 */
export function generateApiKey(): { key: string; keyHash: string; prefix: string } {
  const raw = randomBytes(32).toString('hex')
  const key = `buug_sk_${raw}`
  const keyHash = hashApiKey(key)
  const prefix = key.slice(0, 16) // "buug_sk_abc12345"
  return { key, keyHash, prefix }
}

/**
 * Hash an API key for storage (SHA-256)
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Validate an API key from the Authorization header
 * Returns the API key record with org info, or null if invalid
 */
export async function validateApiKey(authHeader: string | null): Promise<{
  id: string
  organizationId: string
  permissions: string[]
} | null> {
  if (!authHeader || !authHeader.startsWith('Bearer buug_sk_')) {
    return null
  }

  const key = authHeader.replace('Bearer ', '')
  const keyHash = hashApiKey(key)

  const { data: apiKey } = await supabaseAdmin
    .from('ApiKey')
    .select('id, organizationId, permissions, expiresAt')
    .eq('keyHash', keyHash)
    .single()

  if (!apiKey) return null

  // Check expiration
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return null
  }

  // Update lastUsedAt (fire-and-forget)
  void supabaseAdmin
    .from('ApiKey')
    .update({ lastUsedAt: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then(() => {})

  return {
    id: apiKey.id,
    organizationId: apiKey.organizationId,
    permissions: apiKey.permissions || [],
  }
}

/**
 * Check if API key has a specific permission
 */
export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes(required) || permissions.includes('*')
}

// Simple in-memory rate limiter per API key
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const API_RATE_LIMIT = 100 // requests per minute
const API_RATE_WINDOW = 60_000

export function isApiRateLimited(keyId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(keyId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + API_RATE_WINDOW })
    return false
  }
  entry.count++
  return entry.count > API_RATE_LIMIT
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key)
  }
}, 5 * 60_000)
