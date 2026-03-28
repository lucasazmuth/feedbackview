import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/clickup/client'

/**
 * POST — Test a ClickUp API token by calling /user.
 * Body: { token: string }
 */
export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })
  }

  try {
    const data = await getAuthorizedUser(token)
    return NextResponse.json({
      valid: true,
      user: { username: data.user.username, email: data.user.email },
    })
  } catch (err: any) {
    return NextResponse.json({
      valid: false,
      error: err.status === 401 ? 'Token inválido ou expirado' : (err.message || 'Erro ao conectar'),
    })
  }
}
