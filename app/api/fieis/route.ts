import { NextRequest, NextResponse } from 'next/server'
import { buscarFieis, salvarFiel } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const termo = searchParams.get('termo')
    const fieis = await buscarFieis(termo ?? undefined)
    return NextResponse.json(fieis)
  } catch (error) {
    console.error('Erro ao buscar fiéis:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const id = await salvarFiel(body)
    return NextResponse.json({ id }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar fiel:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
