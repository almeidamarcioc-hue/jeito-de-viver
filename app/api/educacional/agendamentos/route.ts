import { NextRequest, NextResponse } from 'next/server'
import { getAgendamentosEdu, criarAgendamentoEdu } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const turma_id = searchParams.get('turma_id')
    const data = searchParams.get('data')
    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')
    const rows = await getAgendamentosEdu({
      turma_id: turma_id ? Number(turma_id) : undefined,
      data: data ?? undefined,
      data_inicio: data_inicio ?? undefined,
      data_fim: data_fim ?? undefined,
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
    if (!body.turma_id) return NextResponse.json({ error: 'Turma é obrigatória.' }, { status: 400 })
    if (!body.data) return NextResponse.json({ error: 'Data é obrigatória.' }, { status: 400 })
    if (!body.hora) return NextResponse.json({ error: 'Hora é obrigatória.' }, { status: 400 })
    const ag = await criarAgendamentoEdu({
      turma_id: Number(body.turma_id),
      aluno_id: body.aluno_id ? Number(body.aluno_id) : null,
      professor_id: body.professor_id ? Number(body.professor_id) : null,
      data: body.data,
      hora: body.hora,
      duracao_min: body.duracao_min ?? 50,
      assunto: body.assunto ?? '',
      status: body.status ?? 'confirmado',
      observacoes: body.observacoes ?? '',
    })
    return NextResponse.json(ag, { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
