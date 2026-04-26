// ─── Secretaria types ──────────────────────────────────────────────────────

export interface Pastor {
  id: number
  nome: string
  telefone: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  imagem: string
}

export interface AgendamentoPastoral {
  id: number
  nome_fiel: string
  telefone: string
  assunto: string
  pastor_id: number
  data: string
  hora: string
  duracao_min: number
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
  data_criacao: string
  pastor_nome?: string
}

export interface Fiel {
  id: number
  nome: string
  telefone: string
  email: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  observacoes: string
  data_criacao: string
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

export interface HorarioAtendimento {
  dia_semana: number
  ativo: boolean
  inicio: string
  intervalo_inicio: string | null
  intervalo_fim: string | null
  fim: string
}

export interface Ferias {
  id: number
  pastor_id: number
  data_inicio: string
  data_fim: string
  motivo: string
  data_criacao: string
}

export interface Slot {
  tipo: 'confirmado' | 'pendente' | 'bloqueado'
  dados: Record<string, unknown>
}

// ─── Educational types ─────────────────────────────────────────────────────

export interface Professor {
  id: number
  nome: string
  email: string
  telefone: string
  disciplina: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  observacoes: string
  data_criacao: string
}

export interface Turma {
  id: number
  nome: string
  descricao: string
  professor_id: number | null
  professor_nome?: string
  turno: string
  ano_letivo: string
  ativo: boolean
  data_criacao: string
}

export interface Aluno {
  id: number
  nome: string
  email: string
  telefone: string
  data_nascimento: string
  turma_id: number | null
  turma_nome?: string
  responsavel: string
  telefone_responsavel: string
  endereco: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  observacoes: string
  ativo: boolean
  data_criacao: string
}

export interface AgendamentoEdu {
  id: number
  turma_id: number
  aluno_id: number | null
  professor_id: number | null
  data: string
  hora: string
  duracao_min: number
  assunto: string
  status: 'confirmado' | 'cancelado' | 'remarcado'
  observacoes: string
  data_criacao: string
  turma_nome?: string
  aluno_nome?: string
  professor_nome?: string
}

// Legacy alias for backward compat with old educational pages
export interface Agendamento extends AgendamentoEdu {}

// ─── Auth types ────────────────────────────────────────────────────────────

export interface Usuario {
  id: number
  usuario: string
  nome: string
  role: string
  modulos: string
  ativo: boolean
  data_criacao: string
}
