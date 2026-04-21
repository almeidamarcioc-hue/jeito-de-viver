import { NextRequest, NextResponse } from 'next/server'
import { getPastor, updatePastor, deletePastor, pastorTemAgendamentos } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    const pastor = await getPastor(id)
    if (!pastor) {
      return NextResponse.json({ error: 'Pastor não encontrado.' }, { status: 404 })
    }
    return NextResponse.json(pastor)
  } catch (error) {
    console.error('Erro ao buscar pastor:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    const body = await request.json()
    await updatePastor(id, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar pastor:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    const temAgendamentos = await pastorTemAgendamentos(id)
    if (temAgendamentos) {
      return NextResponse.json(
        { error: 'Não é possível excluir um pastor com agendamentos ativos.' },
        { status: 409 }
      )
    }
    await deletePastor(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir pastor:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
