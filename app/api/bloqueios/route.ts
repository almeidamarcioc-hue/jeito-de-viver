import { NextRequest, NextResponse } from 'next/server'
import { getBloqueios, criarBloqueio } from '@/lib/db'

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

    const bloqueios = await getBloqueios(parseInt(pastorId, 10), dataInicio, dataFim)
    return NextResponse.json(bloqueios)
  } catch (error) {
    console.error('Erro ao buscar bloqueios:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pastorId, data, hora, motivo } = body

    if (!pastorId || !data || !hora) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: pastorId, data, hora.' },
        { status: 400 }
      )
    }

    const id = await criarBloqueio(pastorId, data, hora, motivo)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar bloqueio:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
