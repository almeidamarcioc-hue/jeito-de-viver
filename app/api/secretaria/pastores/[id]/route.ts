import { NextRequest, NextResponse } from 'next/server'
import { getPastor, updatePastor, deletePastor, pastorTemAgendamentos } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pastor = await getPastor(Number(id))
    if (!pastor) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json(pastor)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    await updatePastor(Number(id), body)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const temAgs = await pastorTemAgendamentos(Number(id))
    if (temAgs) return NextResponse.json({ error: 'Este pastor possui agendamentos ativos e não pode ser excluído.' }, { status: 400 })
    await deletePastor(Number(id))
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
