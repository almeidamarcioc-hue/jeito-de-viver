/**
 * Formata o telefone para o padrão internacional brasileiro (55XXXXXXXXXX).
 * Remove todos os caracteres não numéricos e adiciona o código 55 se necessário.
 */
export function formatarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }
  return `55${digits}`
}

/**
 * Gera a URL do WhatsApp Web para enviar uma mensagem.
 * Retorna null se o telefone for inválido (menos de 10 dígitos locais).
 */
export function gerarUrl(telefone: string, mensagem: string): string | null {
  const numero = formatarTelefone(telefone)
  // Mínimo: 55 (2) + DDD (2) + número (8) = 12 dígitos
  if (numero.length < 12) return null
  const texto = encodeURIComponent(mensagem)
  return `https://wa.me/${numero}?text=${texto}`
}

/**
 * Preenche um template de mensagem substituindo as variáveis.
 * Suporta: {nome}, {pastor}, {data}, {hora}, {assunto}, {telefone}, {nome_fiel}
 */
export function preencherTemplate(template: string, dados: Record<string, string>): string {
  let resultado = template
  for (const [chave, valor] of Object.entries(dados)) {
    const regex = new RegExp(`\\{${chave}\\}`, 'g')
    resultado = resultado.replace(regex, valor ?? '')
  }
  return resultado
}

/**
 * Abre o WhatsApp Web em uma nova aba do navegador.
 * Deve ser chamado apenas no lado cliente (browser).
 */
export function abrirWhatsApp(telefone: string, mensagem: string): void {
  const url = gerarUrl(telefone, mensagem)
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
