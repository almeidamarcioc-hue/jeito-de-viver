import { NextRequest, NextResponse } from 'next/server'
import { getSlotsPastor } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pastorId = searchParams.get('pastorId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    if (!pastorId || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: pastorId, dataInicio, dataFim.' },
        { status: 400 }
      )
    }

    const slotsMap = await getSlotsPastor(parseInt(pastorId, 10), dataInicio, dataFim)

    // Converte Map de "data|hora" para objeto aninhado { data: { hora: slot } }
    const slots: Record<string, Record<string, { tipo: string; dados: Record<string, unknown> }>> = {}
    for (const [chave, slot] of slotsMap.entries()) {
      const [data, hora] = chave.split('|')
      if (!slots[data]) slots[data] = {}
      slots[data][hora] = slot
    }

    return NextResponse.json(slots)
  } catch (error) {
    console.error('Erro ao buscar slots:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
