import { NextRequest, NextResponse } from 'next/server'
import { deleteBloqueio } from '@/lib/db'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    await deleteBloqueio(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir bloqueio:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
