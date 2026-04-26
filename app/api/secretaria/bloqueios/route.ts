import { NextRequest, NextResponse } from 'next/server'
import { getBloqueios, criarBloqueio, criarBloqueiosDia, deleteBloqueiosDia } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pastorId = Number(searchParams.get('pastorId') ?? '0')
    const dataInicio = searchParams.get('dataInicio') ?? ''
    const dataFim = searchParams.get('dataFim') ?? ''
    const rows = await getBloqueios(pastorId, dataInicio, dataFim)
    return NextResponse.json(rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { pastorId, data, hora, motivo } = body
    if (hora === 'dia') {
      await criarBloqueiosDia(Number(pastorId), data, motivo || 'Dia bloqueado')
      return NextResponse.json({ ok: true })
    }
    const id = await criarBloqueio(Number(pastorId), data, hora, motivo)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pastorId = Number(searchParams.get('pastorId') ?? '0')
    const data = searchParams.get('data') ?? ''
    await deleteBloqueiosDia(pastorId, data)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
