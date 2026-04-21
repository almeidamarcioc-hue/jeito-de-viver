import { NextRequest, NextResponse } from 'next/server'
import { getFiel, updateFiel, deleteFiel } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    const fiel = await getFiel(id)
    if (!fiel) {
      return NextResponse.json({ error: 'Fiel não encontrado.' }, { status: 404 })
    }
    return NextResponse.json(fiel)
  } catch (error) {
    console.error('Erro ao buscar fiel:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    const body = await request.json()
    await updateFiel(id, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar fiel:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    await deleteFiel(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir fiel:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
