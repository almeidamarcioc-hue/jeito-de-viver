import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/session'
import { getUsuario, updateUsuario, deleteUsuario } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest): Promise<number | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  const userId = await verifySessionToken(token)
  if (!userId) return null
  const usuario = await getUsuario(userId)
  if (!usuario || usuario.role !== 'admin' || !usuario.ativo) return null
  return userId
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin(req)
    if (!adminId) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    const { id } = await params
    const usuario = await getUsuario(Number(id))
    if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    return NextResponse.json(usuario)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin(req)
    if (!adminId) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    const { id } = await params
    const body = await req.json()
    const { nome, senha, role, modulos, ativo } = body
    await updateUsuario(Number(id), { nome, senha: senha || undefined, role, modulos, ativo })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminId = await requireAdmin(req)
    if (!adminId) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    const { id } = await params
    if (Number(id) === adminId) return NextResponse.json({ error: 'Não é possível excluir o próprio usuário.' }, { status: 400 })
    await deleteUsuario(Number(id))
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
