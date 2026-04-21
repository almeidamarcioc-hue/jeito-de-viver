import { NextRequest, NextResponse } from 'next/server'
import { getPastores, criarPastor } from '@/lib/db'

export async function GET() {
  try {
    const pastores = await getPastores()
    return NextResponse.json(pastores)
  } catch (error) {
    console.error('Erro ao buscar pastores:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = await criarPastor(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar pastor:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
