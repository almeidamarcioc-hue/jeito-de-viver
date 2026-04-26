import { NextRequest, NextResponse } from 'next/server'
import { getAlunos, criarAluno } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const turma_id = searchParams.get('turma_id')
    const busca = searchParams.get('busca')
    const rows = await getAlunos({
      turma_id: turma_id ? Number(turma_id) : undefined,
      busca: busca ?? undefined,
    })
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
    const aluno = await criarAluno(body)
    return NextResponse.json(aluno, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
