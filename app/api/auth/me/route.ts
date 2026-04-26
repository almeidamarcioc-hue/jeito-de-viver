import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/session'
import { getUsuario } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const userId = await verifySessionToken(token)
  if (!userId) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 })

  const usuario = await getUsuario(userId)
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  return NextResponse.json(usuario)
}
