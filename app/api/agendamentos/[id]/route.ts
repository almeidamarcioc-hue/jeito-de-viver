import { NextRequest, NextResponse } from 'next/server'
import { getAgendamento, updateAgendamento, deleteAgendamento } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    const agendamento = await getAgendamento(id)
    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado.' }, { status: 404 })
    }
    return NextResponse.json(agendamento)
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error)
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
    await updateAgendamento(id, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar agendamento:', error)
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
    await deleteAgendamento(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
