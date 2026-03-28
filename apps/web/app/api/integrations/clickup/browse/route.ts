import { NextRequest, NextResponse } from 'next/server'
import { getTeams, getSpaces, getLists } from '@/lib/clickup/client'

/**
 * POST — Browse ClickUp hierarchy (teams, spaces, lists) with a given token.
 * Body: { token, action: 'teams' | 'spaces' | 'lists', teamId?, spaceId? }
 */
export async function POST(req: NextRequest) {
  const { token, action, teamId, spaceId } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 })

  try {
    if (action === 'teams') {
      const teams = await getTeams(token)
      return NextResponse.json({ teams })
    }
    if (action === 'spaces' && teamId) {
      const spaces = await getSpaces(token, teamId)
      return NextResponse.json({ spaces })
    }
    if (action === 'lists' && spaceId) {
      const lists = await getLists(token, spaceId)
      return NextResponse.json({ lists })
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao buscar dados do ClickUp' }, { status: 500 })
  }
}
