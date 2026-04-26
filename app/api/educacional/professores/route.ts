import { NextRequest, NextResponse } from 'next/server'
import { getProfessores, criarProfessor } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await getProfessores()
    return NextResponse.json(rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.nome) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    const prof = await criarProfessor(body)
    return NextResponse.json(prof, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
