export const COOKIE_NAME = 'jdv_session'
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'jdv-change-me-in-production-2024'

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function createSessionToken(userId: number): Promise<string> {
  const payload = `${userId}.${Date.now()}`
  const key = await getKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const sigHex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${payload}.${sigHex}`
}

export async function verifySessionToken(token: string): Promise<number | null> {
  try {
    const lastDot = token.lastIndexOf('.')
    if (lastDot === -1) return null
    const payload = token.substring(0, lastDot)
    const sigHex = token.substring(lastDot + 1)
    const sigBytes = new Uint8Array((sigHex.match(/.{2}/g) ?? []).map(b => parseInt(b, 16)))
    const key = await getKey()
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload))
    if (!valid) return null
    const dotIdx = payload.indexOf('.')
    const ts = Number(payload.substring(dotIdx + 1))
    if (Date.now() - ts > 30 * 24 * 60 * 60 * 1000) return null
    return Number(payload.substring(0, dotIdx))
  } catch {
    return null
  }
}
