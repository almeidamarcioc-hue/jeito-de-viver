import { NextRequest, NextResponse } from 'next/server'
import { getAgendamentosPastorais, criarAgendamentoPastoral } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pastorId = searchParams.get('pastorId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const status = searchParams.get('status')
    const rows = await getAgendamentosPastorais({
      pastorId: pastorId ? Number(pastorId) : undefined,
      dataInicio: dataInicio ?? undefined,
      dataFim: dataFim ?? undefined,
      status: status ?? undefined,
    })
    return NextResponse.json(rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = await criarAgendamentoPastoral(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
