import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, COOKIE_NAME } from '@/lib/session'
import { getUsuario, getUsuarios, criarUsuario } from '@/lib/db'

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

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAdmin(req)
    if (!userId) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    const usuarios = await getUsuarios()
    return NextResponse.json(usuarios)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAdmin(req)
    if (!userId) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    const body = await req.json()
    const { usuario, nome, senha, role, modulos } = body
    if (!usuario || !nome || !senha) return NextResponse.json({ error: 'Campos obrigatórios: usuario, nome, senha' }, { status: 400 })
    const id = await criarUsuario({ usuario, nome, senha, role: role ?? 'usuario', modulos: modulos ?? 'secretaria' })
    return NextResponse.json({ id }, { status: 201 })
  } catch (e: any) {
    const isDup = e.message?.includes('unique') || e.message?.includes('duplicate') || e.message?.includes('usuarios_usuario_key')
    return NextResponse.json({ error: isDup ? 'Nome de usuário já existe.' : e.message }, { status: isDup ? 409 : 500 })
  }
}
