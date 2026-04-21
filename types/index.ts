export interface Pastor {
  id: number
  nome: string
  telefone: string
  endereco: string
  imagem: string
}

export interface Agendamento {
  id: number
  nome_fiel: string
  telefone: string
  assunto: string
  pastor_id: number
  data: string
  hora: string
  status: string
  recorrencia: string
  observacoes: string
  data_criacao: string
  lembrete_enviado: number
  confirmacao_enviada: number
  pastor_nome?: string
  pastor_tel?: string
}

export interface Bloqueio {
  id: number
  pastor_id: number
  data: string
  hora: string
  motivo: string
  pastor_nome?: string
}

export interface Fiel {
  id: number
  nome: string
  telefone: string
  email: string
  endereco: string
  observacoes: string
}

export interface Configuracoes {
  id: number
  horas_lembrete: number
  msg_confirmacao: string
  msg_lembrete: string
  msg_cancelamento: string
  msg_remarcacao: string
  msg_pastor: string
}

export interface Slot {
  tipo: 'confirmado' | 'pendente' | 'bloqueado'
  dados: Record<string, any>
}
