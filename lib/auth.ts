import crypto from 'crypto'

export function hashPassword(pwd: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(pwd, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(pwd: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    const derived = crypto.scryptSync(pwd, salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'))
  } catch {
    return false
  }
}
