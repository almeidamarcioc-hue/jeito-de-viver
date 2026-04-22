const BASE_URL = (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '')
const API_KEY = process.env.EVOLUTION_API_KEY ?? ''
const INSTANCE = process.env.EVOLUTION_INSTANCE ?? 'secretaria-ibtm'

function headers() {
  return { 'Content-Type': 'application/json', apikey: API_KEY }
}

function formatarNumero(telefone: string): string {
  const digits = telefone.replace(/\D/g, '')
  return digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
}

export function isConfigurado(): boolean {
  return Boolean(BASE_URL && API_KEY)
}

export async function getStatus(): Promise<'open' | 'close' | 'connecting' | 'error'> {
  if (!isConfigurado()) return 'error'
  try {
    const res = await fetch(`${BASE_URL}/instance/connectionState/${INSTANCE}`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (!res.ok) return 'error'
    const data = await res.json()
    return (data?.instance?.state ?? data?.state ?? 'error') as 'open' | 'close' | 'connecting' | 'error'
  } catch {
    return 'error'
  }
}

export async function getQRCode(): Promise<{ qrcode: string | null; status: string }> {
  if (!isConfigurado()) return { qrcode: null, status: 'error' }
  try {
    // Tenta criar a instância (idempotente — ignora se já existir)
    await fetch(`${BASE_URL}/instance/create`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ instanceName: INSTANCE, qrcode: true }),
    })
    const res = await fetch(`${BASE_URL}/instance/connect/${INSTANCE}`, {
      headers: headers(),
      cache: 'no-store',
    })
    if (!res.ok) return { qrcode: null, status: 'error' }
    const data = await res.json()
    const qrcode = data?.base64 ?? data?.qrcode?.base64 ?? null
    return { qrcode, status: 'connecting' }
  } catch {
    return { qrcode: null, status: 'error' }
  }
}

// Delay aleatório entre 3-8s para simular digitação humana e evitar bloqueio
function delayHumano(): Promise<void> {
  const ms = 3000 + Math.random() * 5000
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function enviarMensagem(telefone: string, mensagem: string): Promise<{ ok: boolean; erro?: string }> {
  if (!isConfigurado()) return { ok: false, erro: 'Evolution API não configurada' }
  const numero = formatarNumero(telefone)
  if (numero.length < 12) return { ok: false, erro: 'Telefone inválido' }
  try {
    // Simula presença ativa antes de enviar (reduz risco de bloqueio)
    await fetch(`${BASE_URL}/chat/updatePresence/${INSTANCE}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ number: numero, presence: 'composing' }),
    }).catch(() => { /* opcional, ignora falha */ })

    await delayHumano()

    const res = await fetch(`${BASE_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        number: numero,
        text: mensagem,
        // Delay de digitação proporcional ao tamanho da mensagem
        delay: Math.min(mensagem.length * 50, 4000),
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, erro: String(err?.message ?? err?.error ?? `HTTP ${res.status}`) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: String(e) }
  }
}
