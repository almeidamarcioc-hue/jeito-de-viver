import { NextRequest, NextResponse } from 'next/server'
import { getConfiguracoes, updateConfiguracoes } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await getConfiguracoes()
    return NextResponse.json(config)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    await updateConfiguracoes(body)
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
