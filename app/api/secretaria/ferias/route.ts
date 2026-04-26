import { NextRequest, NextResponse } from 'next/server'
import { getFerias, criarFerias } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pastorId = Number(searchParams.get('pastorId') ?? searchParams.get('pastor_id') ?? '0')
    const rows = await getFerias(pastorId)
    return NextResponse.json(rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pastorId, dataInicio, dataFim, motivo } = body
    if (!dataInicio || !dataFim) return NextResponse.json({ error: 'Datas são obrigatórias.' }, { status: 400 })
    const id = await criarFerias(Number(pastorId), dataInicio, dataFim, motivo || 'Férias')
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
