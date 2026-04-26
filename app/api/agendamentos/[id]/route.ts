import { NextRequest, NextResponse } from 'next/server'
import { getAgendamentoEdu as getAgendamento, updateAgendamentoEdu as updateAgendamento, deleteAgendamentoEdu as deleteAgendamento } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const ag = await getAgendamento(Number(id))
    if (!ag) return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })
    return NextResponse.json(ag)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const ag = await updateAgendamento(Number(id), body)
    return NextResponse.json(ag)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteAgendamento(Number(id))
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
