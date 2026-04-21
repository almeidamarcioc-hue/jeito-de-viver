import { NextRequest, NextResponse } from 'next/server'
import { getConfiguracoes, updateConfiguracoes } from '@/lib/db'

export async function GET() {
  try {
    const config = await getConfiguracoes()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Erro ao buscar configurações:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    await updateConfiguracoes(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
