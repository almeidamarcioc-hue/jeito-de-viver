import { NextRequest, NextResponse } from 'next/server'
import { buscarFieis, salvarFiel } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const termo = searchParams.get('termo') ?? searchParams.get('busca') ?? undefined
    const rows = await buscarFieis(termo)
    return NextResponse.json(rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    const id = await salvarFiel(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
