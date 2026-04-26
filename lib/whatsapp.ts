export function formatarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return `55${digits}`
}

export function gerarUrl(telefone: string, mensagem: string): string | null {
  const numero = formatarTelefone(telefone)
  if (numero.length < 12) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

export function preencherTemplate(template: string, dados: Record<string, string>): string {
  let resultado = template
  for (const [chave, valor] of Object.entries(dados)) {
    const regex = new RegExp(`\\{${chave}\\}`, 'g')
    resultado = resultado.replace(regex, valor ?? '')
  }
  return resultado
}

export function abrirWhatsApp(telefone: string, mensagem: string): void {
  const url = gerarUrl(telefone, mensagem)
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
