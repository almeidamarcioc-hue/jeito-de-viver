import { NextResponse } from 'next/server'
import { initDb } from '@/lib/db'

export async function GET() {
  try {
    await initDb()
    return NextResponse.json({ success: true, message: 'Banco de dados inicializado com sucesso.' })
  } catch (error) {
    console.error('Erro ao inicializar banco:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
