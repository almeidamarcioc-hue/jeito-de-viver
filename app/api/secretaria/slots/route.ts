import { NextRequest, NextResponse } from 'next/server'
import { getSlotsPastor } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pastorId = Number(searchParams.get('pastorId') ?? '0')
    const dataInicio = searchParams.get('dataInicio') ?? ''
    const dataFim = searchParams.get('dataFim') ?? ''

    const mapa = await getSlotsPastor(pastorId, dataInicio, dataFim)

    // Serialize Map to nested object: { "2025-01-01": { "08:00": { tipo, dados } } }
    const result: Record<string, Record<string, unknown>> = {}
    for (const [chave, slot] of mapa.entries()) {
      const [data, hora] = chave.split('|')
      if (!result[data]) result[data] = {}
      result[data][hora] = slot
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
