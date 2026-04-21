import { NextRequest, NextResponse } from 'next/server'
import { getProximoHorarioLivre } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pastorId = searchParams.get('pastorId')
    const aPartir = searchParams.get('aPartir')

    if (!pastorId) {
      return NextResponse.json(
        { error: 'Parâmetro obrigatório: pastorId.' },
        { status: 400 }
      )
    }

    const proximo = await getProximoHorarioLivre(
      parseInt(pastorId, 10),
      aPartir ?? undefined
    )

    return NextResponse.json({ proximo })
  } catch (error) {
    console.error('Erro ao buscar próximo horário livre:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
