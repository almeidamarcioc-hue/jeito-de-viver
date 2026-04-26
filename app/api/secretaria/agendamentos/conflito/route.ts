import { NextRequest, NextResponse } from 'next/server'
import { checarConflito } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pastorId = Number(searchParams.get('pastorId') ?? '0')
    const data = searchParams.get('data') ?? ''
    const hora = searchParams.get('hora') ?? ''
    const duracao = Number(searchParams.get('duracao') ?? '30')
    const ignorarId = searchParams.get('ignorarId')
    const conflito = await checarConflito(pastorId, data, hora, duracao, ignorarId ? Number(ignorarId) : undefined)
    return NextResponse.json({ conflito: !!conflito, agendamento: conflito })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
