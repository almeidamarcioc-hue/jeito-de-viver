import { NextRequest, NextResponse } from 'next/server'
import { getAgendamentos, criarAgendamento } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pastorId = searchParams.get('pastorId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')
    const status = searchParams.get('status')

    const agendamentos = await getAgendamentos({
      pastorId: pastorId ? parseInt(pastorId, 10) : undefined,
      dataInicio: dataInicio ?? undefined,
      dataFim: dataFim ?? undefined,
      status: status ?? undefined,
    })

    return NextResponse.json(agendamentos)
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = await criarAgendamento(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
