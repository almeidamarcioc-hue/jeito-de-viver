import { NextRequest, NextResponse } from 'next/server'
import { checarConflito } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pastorId = searchParams.get('pastorId')
    const data = searchParams.get('data')
    const hora = searchParams.get('hora')
    const ignorarId = searchParams.get('ignorarId')

    if (!pastorId || !data || !hora) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: pastorId, data, hora.' },
        { status: 400 }
      )
    }

    const conflito = await checarConflito(
      parseInt(pastorId, 10),
      data,
      hora,
      ignorarId ? parseInt(ignorarId, 10) : undefined
    )

    return NextResponse.json({ conflito })
  } catch (error) {
    console.error('Erro ao verificar conflito:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
