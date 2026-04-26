import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'jdv_session'
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'jdv-change-me-in-production-2024'
const PUBLIC = ['/login', '/api/auth/login', '/api/auth/logout', '/api/init']

async function verifyToken(token: string): Promise<boolean> {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return false
    const payload = token.substring(0, lastDot)
    const sigHex = token.substring(lastDot + 1)
    const sigBytes = new Uint8Array((sigHex.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)))
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SESSION_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
    if (!valid) return false
    const dotIdx = payload.indexOf('.')
    const ts = Number(payload.substring(dotIdx + 1))
    return Date.now() - ts <= 30 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png|ibtm-logo.png|manifest.json|icons).*)'],
}
