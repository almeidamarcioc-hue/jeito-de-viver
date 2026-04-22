import { neon } from '@neondatabase/serverless'

// ─── Types ─────────────────────────────────────────────────────────────────

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

export interface Slot {
  tipo: 'confirmado' | 'pendente' | 'bloqueado'
  dados: Record<string, unknown>
}

// ─── Connection ────────────────────────────────────────────────────────────

function getDb() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL não configurado. Adicione esta variável de ambiente no Vercel.')
  const url = raw
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '')
  return neon(url)
}

// ─── Init ──────────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  const sql = getDb()

  await sql`
    CREATE TABLE IF NOT EXISTS pastores (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(20) DEFAULT '',
      endereco TEXT DEFAULT '',
      numero VARCHAR(20) DEFAULT '',
      bairro VARCHAR(100) DEFAULT '',
      cidade VARCHAR(100) DEFAULT '',
      estado VARCHAR(2) DEFAULT '',
      imagem TEXT DEFAULT ''
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id SERIAL PRIMARY KEY,
      nome_fiel VARCHAR(100) NOT NULL,
      telefone VARCHAR(20) DEFAULT '',
      assunto TEXT DEFAULT '',
      pastor_id INTEGER REFERENCES pastores(id),
      data DATE NOT NULL,
      hora TIME NOT NULL,
      status VARCHAR(20) DEFAULT 'pendente',
      recorrencia VARCHAR(20) DEFAULT 'nenhuma',
      observacoes TEXT DEFAULT '',
      data_criacao TIMESTAMP DEFAULT NOW(),
      lembrete_enviado INTEGER DEFAULT 0,
      confirmacao_enviada INTEGER DEFAULT 0
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS bloqueios (
      id SERIAL PRIMARY KEY,
      pastor_id INTEGER REFERENCES pastores(id),
      data DATE NOT NULL,
      hora TIME NOT NULL,
      motivo TEXT DEFAULT '',
      data_criacao TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS fieis (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      telefone VARCHAR(20) DEFAULT '',
      email VARCHAR(100) DEFAULT '',
      endereco TEXT DEFAULT '',
      numero VARCHAR(20) DEFAULT '',
      bairro VARCHAR(100) DEFAULT '',
      cidade VARCHAR(100) DEFAULT '',
      estado VARCHAR(2) DEFAULT '',
      observacoes TEXT DEFAULT '',
      data_criacao TIMESTAMP DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS configuracoes (
      id INTEGER PRIMARY KEY DEFAULT 1,
      horas_lembrete INTEGER DEFAULT 24,
      msg_confirmacao TEXT DEFAULT '',
      msg_lembrete TEXT DEFAULT '',
      msg_cancelamento TEXT DEFAULT '',
      msg_remarcacao TEXT DEFAULT '',
      msg_pastor TEXT DEFAULT ''
    )
  `

  // Migrate existing tables: add new address columns if missing
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS numero VARCHAR(20) DEFAULT ''`
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS bairro VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS cidade VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS estado VARCHAR(2) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS numero VARCHAR(20) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS bairro VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS cidade VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS estado VARCHAR(2) DEFAULT ''`

  // Insert default pastores if none exist
  const pastoresExistentes = await sql`SELECT COUNT(*) AS cnt FROM pastores`
  const count = Number((pastoresExistentes[0] as { cnt: string }).cnt)

  if (count === 0) {
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Haimo', '', '', '')`
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Jou', '', '', '')`
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Marisa', '', '', '')`
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Sâmela', '', '', '')`
  }

  // Upsert default config with example messages
  await sql`
    INSERT INTO configuracoes (id, horas_lembrete, msg_confirmacao, msg_lembrete, msg_cancelamento, msg_remarcacao, msg_pastor)
    VALUES (
      1,
      24,
      'Olá {nome}! Seu agendamento com o(a) pastor(a) {pastor} foi confirmado para o dia {data} às {hora}. Assunto: {assunto}. Que Deus abençoe! 🙏',
      'Olá {nome}! Lembramos que você tem um agendamento com o(a) pastor(a) {pastor} amanhã, dia {data} às {hora}. Estamos esperando por você!',
      'Olá {nome}! Seu agendamento com o(a) pastor(a) {pastor} para o dia {data} às {hora} foi cancelado. Entre em contato para remarcar.',
      'Olá {nome}! Seu agendamento foi remarcado para o dia {data} às {hora} com o(a) pastor(a) {pastor}. Qualquer dúvida, estamos à disposição.',
      'Pastor(a), novo agendamento: {nome_fiel} - Assunto: {assunto} - {data} às {hora}. Telefone: {telefone}.'
    )
    ON CONFLICT (id) DO UPDATE SET
      msg_confirmacao = CASE WHEN configuracoes.msg_confirmacao = '' THEN EXCLUDED.msg_confirmacao ELSE configuracoes.msg_confirmacao END,
      msg_lembrete    = CASE WHEN configuracoes.msg_lembrete    = '' THEN EXCLUDED.msg_lembrete    ELSE configuracoes.msg_lembrete    END,
      msg_cancelamento= CASE WHEN configuracoes.msg_cancelamento= '' THEN EXCLUDED.msg_cancelamento ELSE configuracoes.msg_cancelamento END,
      msg_remarcacao  = CASE WHEN configuracoes.msg_remarcacao  = '' THEN EXCLUDED.msg_remarcacao  ELSE configuracoes.msg_remarcacao  END,
      msg_pastor      = CASE WHEN configuracoes.msg_pastor      = '' THEN EXCLUDED.msg_pastor      ELSE configuracoes.msg_pastor      END
  `
}

// ─── Pastores ──────────────────────────────────────────────────────────────

export async function getPastores(): Promise<Pastor[]> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM pastores ORDER BY nome`
  return rows as unknown as Pastor[]
}

export async function getPastor(id: number): Promise<Pastor | null> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM pastores WHERE id = ${id}`
  if (rows.length === 0) return null
  return rows[0] as unknown as Pastor
}

export async function criarPastor(dados: Partial<Pastor>): Promise<number> {
  const sql = getDb()
  const nome = dados.nome ?? ''
  const telefone = dados.telefone ?? ''
  const endereco = dados.endereco ?? ''
  const numero = dados.numero ?? ''
  const bairro = dados.bairro ?? ''
  const cidade = dados.cidade ?? ''
  const estado = dados.estado ?? ''
  const imagem = dados.imagem ?? ''
  const rows = await sql`
    INSERT INTO pastores (nome, telefone, endereco, numero, bairro, cidade, estado, imagem)
    VALUES (${nome}, ${telefone}, ${endereco}, ${numero}, ${bairro}, ${cidade}, ${estado}, ${imagem})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updatePastor(id: number, dados: Partial<Pastor>): Promise<void> {
  const sql = getDb()
  const pastor = await getPastor(id)
  if (!pastor) return
  const nome = dados.nome ?? pastor.nome
  const telefone = dados.telefone ?? pastor.telefone
  const endereco = dados.endereco ?? pastor.endereco
  const numero = dados.numero ?? pastor.numero ?? ''
  const bairro = dados.bairro ?? pastor.bairro ?? ''
  const cidade = dados.cidade ?? pastor.cidade ?? ''
  const estado = dados.estado ?? pastor.estado ?? ''
  const imagem = dados.imagem ?? pastor.imagem
  await sql`
    UPDATE pastores
    SET nome = ${nome}, telefone = ${telefone}, endereco = ${endereco},
        numero = ${numero}, bairro = ${bairro}, cidade = ${cidade}, estado = ${estado}, imagem = ${imagem}
    WHERE id = ${id}
  `
}

export async function deletePastor(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM pastores WHERE id = ${id}`
}

export async function pastorTemAgendamentos(id: number): Promise<boolean> {
  const sql = getDb()
  const rows = await sql`
    SELECT COUNT(*) AS cnt FROM agendamentos
    WHERE pastor_id = ${id} AND status NOT IN ('cancelado')
  `
  return Number((rows[0] as { cnt: string }).cnt) > 0
}

// ─── Agendamentos ──────────────────────────────────────────────────────────

export async function criarAgendamento(dados: Partial<Agendamento>): Promise<number> {
  const sql = getDb()
  const nome_fiel = dados.nome_fiel ?? ''
  const telefone = dados.telefone ?? ''
  const assunto = dados.assunto ?? ''
  const pastor_id = dados.pastor_id ?? 0
  const data = dados.data ?? ''
  const hora = dados.hora ?? ''
  const status = dados.status ?? 'pendente'
  const recorrencia = dados.recorrencia ?? 'nenhuma'
  const observacoes = dados.observacoes ?? ''
  const rows = await sql`
    INSERT INTO agendamentos (nome_fiel, telefone, assunto, pastor_id, data, hora, status, recorrencia, observacoes)
    VALUES (${nome_fiel}, ${telefone}, ${assunto}, ${pastor_id}, ${data}::date, ${hora}::time, ${status}, ${recorrencia}, ${observacoes})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function getAgendamento(id: number): Promise<Agendamento | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
    FROM agendamentos a
    LEFT JOIN pastores p ON a.pastor_id = p.id
    WHERE a.id = ${id}
  `
  if (rows.length === 0) return null
  return rows[0] as unknown as Agendamento
}

export async function getAgendamentos(opts?: {
  pastorId?: number
  dataInicio?: string
  dataFim?: string
  status?: string
}): Promise<Agendamento[]> {
  const sql = getDb()
  const { pastorId, dataInicio, dataFim, status } = opts ?? {}

  let rows

  if (pastorId && dataInicio && dataFim && status) {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.pastor_id = ${pastorId}
        AND a.data >= ${dataInicio}::date
        AND a.data <= ${dataFim}::date
        AND a.status = ${status}
      ORDER BY a.data, a.hora
    `
  } else if (pastorId && dataInicio && dataFim) {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.pastor_id = ${pastorId}
        AND a.data >= ${dataInicio}::date
        AND a.data <= ${dataFim}::date
      ORDER BY a.data, a.hora
    `
  } else if (pastorId && status) {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.pastor_id = ${pastorId}
        AND a.status = ${status}
      ORDER BY a.data, a.hora
    `
  } else if (pastorId) {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.pastor_id = ${pastorId}
      ORDER BY a.data, a.hora
    `
  } else if (dataInicio && dataFim && status) {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.data >= ${dataInicio}::date
        AND a.data <= ${dataFim}::date
        AND a.status = ${status}
      ORDER BY a.data, a.hora
    `
  } else if (dataInicio && dataFim) {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.data >= ${dataInicio}::date
        AND a.data <= ${dataFim}::date
      ORDER BY a.data, a.hora
    `
  } else if (status) {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.status = ${status}
      ORDER BY a.data, a.hora
    `
  } else {
    rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      ORDER BY a.data, a.hora
    `
  }

  return rows as unknown as Agendamento[]
}

export async function getAgendamentosHoje(pastorId?: number): Promise<Agendamento[]> {
  const sql = getDb()
  if (pastorId) {
    const rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.data = CURRENT_DATE
        AND a.pastor_id = ${pastorId}
        AND a.status != 'cancelado'
      ORDER BY a.hora
    `
    return rows as unknown as Agendamento[]
  }
  const rows = await sql`
    SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
    FROM agendamentos a
    LEFT JOIN pastores p ON a.pastor_id = p.id
    WHERE a.data = CURRENT_DATE
      AND a.status != 'cancelado'
    ORDER BY a.hora
  `
  return rows as unknown as Agendamento[]
}

export async function getAgendamentosSemana(pastorId?: number): Promise<Agendamento[]> {
  const sql = getDb()
  if (pastorId) {
    const rows = await sql`
      SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
      FROM agendamentos a
      LEFT JOIN pastores p ON a.pastor_id = p.id
      WHERE a.data >= CURRENT_DATE
        AND a.data < CURRENT_DATE + INTERVAL '7 days'
        AND a.pastor_id = ${pastorId}
        AND a.status != 'cancelado'
      ORDER BY a.data, a.hora
    `
    return rows as unknown as Agendamento[]
  }
  const rows = await sql`
    SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
    FROM agendamentos a
    LEFT JOIN pastores p ON a.pastor_id = p.id
    WHERE a.data >= CURRENT_DATE
      AND a.data < CURRENT_DATE + INTERVAL '7 days'
      AND a.status != 'cancelado'
    ORDER BY a.data, a.hora
  `
  return rows as unknown as Agendamento[]
}

export async function updateAgendamento(id: number, dados: Partial<Agendamento>): Promise<void> {
  const sql = getDb()
  const atual = await getAgendamento(id)
  if (!atual) return

  const nome_fiel = dados.nome_fiel ?? atual.nome_fiel
  const telefone = dados.telefone ?? atual.telefone
  const assunto = dados.assunto ?? atual.assunto
  const pastor_id = dados.pastor_id ?? atual.pastor_id
  const data = dados.data ?? atual.data
  const hora = dados.hora ?? atual.hora
  const status = dados.status ?? atual.status
  const recorrencia = dados.recorrencia ?? atual.recorrencia
  const observacoes = dados.observacoes ?? atual.observacoes
  const lembrete_enviado = dados.lembrete_enviado ?? atual.lembrete_enviado
  const confirmacao_enviada = dados.confirmacao_enviada ?? atual.confirmacao_enviada

  await sql`
    UPDATE agendamentos
    SET
      nome_fiel = ${nome_fiel},
      telefone = ${telefone},
      assunto = ${assunto},
      pastor_id = ${pastor_id},
      data = ${data}::date,
      hora = ${hora}::time,
      status = ${status},
      recorrencia = ${recorrencia},
      observacoes = ${observacoes},
      lembrete_enviado = ${lembrete_enviado},
      confirmacao_enviada = ${confirmacao_enviada}
    WHERE id = ${id}
  `
}

export async function deleteAgendamento(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM agendamentos WHERE id = ${id}`
}

export async function checarConflito(
  pastorId: number,
  data: string,
  hora: string,
  ignorarId?: number
): Promise<Agendamento | null> {
  const sql = getDb()
  let rows
  if (ignorarId) {
    rows = await sql`
      SELECT * FROM agendamentos
      WHERE pastor_id = ${pastorId}
        AND data = ${data}::date
        AND hora = ${hora}::time
        AND status NOT IN ('cancelado')
        AND id != ${ignorarId}
      LIMIT 1
    `
  } else {
    rows = await sql`
      SELECT * FROM agendamentos
      WHERE pastor_id = ${pastorId}
        AND data = ${data}::date
        AND hora = ${hora}::time
        AND status NOT IN ('cancelado')
      LIMIT 1
    `
  }
  if (rows.length === 0) return null
  return rows[0] as unknown as Agendamento
}

export async function getProximoHorarioLivre(
  pastorId: number,
  aPartir?: string
): Promise<{ data: string; hora: string } | null> {
  const sql = getDb()
  const dataBase = aPartir ?? new Date().toISOString().slice(0, 10)

  // Generate slots for the next 30 days, from 08:00 to 18:00, every hour
  // Note: generate_series with time type is not supported; use integer offsets instead
  const rows = await sql`
    WITH slots AS (
      SELECT
        (gs_date::date)::text AS data,
        to_char(('08:00'::time + (gs_h * INTERVAL '1 hour')), 'HH24:MI') AS hora
      FROM
        generate_series(
          ${dataBase}::date,
          ${dataBase}::date + INTERVAL '30 days',
          INTERVAL '1 day'
        ) AS gs_date,
        generate_series(0, 10) AS gs_h
    ),
    ocupados AS (
      SELECT data::text, hora::text
      FROM agendamentos
      WHERE pastor_id = ${pastorId}
        AND status NOT IN ('cancelado')
        AND data >= ${dataBase}::date
        AND data <= ${dataBase}::date + INTERVAL '30 days'
      UNION ALL
      SELECT data::text, hora::text
      FROM bloqueios
      WHERE pastor_id = ${pastorId}
        AND data >= ${dataBase}::date
        AND data <= ${dataBase}::date + INTERVAL '30 days'
    )
    SELECT s.data, s.hora
    FROM slots s
    WHERE NOT EXISTS (
      SELECT 1 FROM ocupados o
      WHERE o.data = s.data
        AND LEFT(o.hora, 5) = s.hora
    )
    ORDER BY s.data, s.hora
    LIMIT 1
  `

  if (rows.length === 0) return null
  const row = rows[0] as { data: string; hora: string }
  return { data: row.data, hora: row.hora }
}

// ─── Lembretes ─────────────────────────────────────────────────────────────

export async function getLembretesPendentes(): Promise<Agendamento[]> {
  const sql = getDb()
  const config = await getConfiguracoes()
  const horas = config.horas_lembrete

  const rows = await sql`
    SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
    FROM agendamentos a
    LEFT JOIN pastores p ON a.pastor_id = p.id
    WHERE a.status IN ('confirmado', 'pendente')
      AND a.lembrete_enviado = 0
      AND (a.data::timestamp + a.hora::interval) <= NOW() + (${horas} || ' hours')::interval
      AND (a.data::timestamp + a.hora::interval) > NOW()
    ORDER BY a.data, a.hora
  `
  return rows as unknown as Agendamento[]
}

export async function marcarLembreteEnviado(id: number): Promise<void> {
  const sql = getDb()
  await sql`UPDATE agendamentos SET lembrete_enviado = 1 WHERE id = ${id}`
}

export async function marcarConfirmacaoEnviada(id: number): Promise<void> {
  const sql = getDb()
  await sql`UPDATE agendamentos SET confirmacao_enviada = 1 WHERE id = ${id}`
}

// ─── Configurações ─────────────────────────────────────────────────────────

export async function getConfiguracoes(): Promise<Configuracoes> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM configuracoes WHERE id = 1`
  if (rows.length === 0) {
    return {
      id: 1,
      horas_lembrete: 24,
      msg_confirmacao: '',
      msg_lembrete: '',
      msg_cancelamento: '',
      msg_remarcacao: '',
      msg_pastor: '',
    }
  }
  return rows[0] as unknown as Configuracoes
}

export async function updateConfiguracoes(dados: Partial<Configuracoes>): Promise<void> {
  const sql = getDb()
  const atual = await getConfiguracoes()
  const horas_lembrete = dados.horas_lembrete ?? atual.horas_lembrete
  const msg_confirmacao = dados.msg_confirmacao ?? atual.msg_confirmacao
  const msg_lembrete = dados.msg_lembrete ?? atual.msg_lembrete
  const msg_cancelamento = dados.msg_cancelamento ?? atual.msg_cancelamento
  const msg_remarcacao = dados.msg_remarcacao ?? atual.msg_remarcacao
  const msg_pastor = dados.msg_pastor ?? atual.msg_pastor

  await sql`
    UPDATE configuracoes
    SET
      horas_lembrete = ${horas_lembrete},
      msg_confirmacao = ${msg_confirmacao},
      msg_lembrete = ${msg_lembrete},
      msg_cancelamento = ${msg_cancelamento},
      msg_remarcacao = ${msg_remarcacao},
      msg_pastor = ${msg_pastor}
    WHERE id = 1
  `
}

// ─── Bloqueios ─────────────────────────────────────────────────────────────

export async function getBloqueios(
  pastorId: number,
  dataInicio: string,
  dataFim: string
): Promise<Bloqueio[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT b.*, p.nome AS pastor_nome
    FROM bloqueios b
    LEFT JOIN pastores p ON b.pastor_id = p.id
    WHERE b.pastor_id = ${pastorId}
      AND b.data >= ${dataInicio}::date
      AND b.data <= ${dataFim}::date
    ORDER BY b.data, b.hora
  `
  return rows as unknown as Bloqueio[]
}

export async function criarBloqueio(
  pastorId: number,
  data: string,
  hora: string,
  motivo?: string
): Promise<number> {
  const sql = getDb()
  const mot = motivo ?? ''
  const rows = await sql`
    INSERT INTO bloqueios (pastor_id, data, hora, motivo)
    VALUES (${pastorId}, ${data}::date, ${hora}::time, ${mot})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function deleteBloqueio(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM bloqueios WHERE id = ${id}`
}

export async function getBloqueioSlot(
  pastorId: number,
  data: string,
  hora: string
): Promise<Bloqueio | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT b.*, p.nome AS pastor_nome
    FROM bloqueios b
    LEFT JOIN pastores p ON b.pastor_id = p.id
    WHERE b.pastor_id = ${pastorId}
      AND b.data = ${data}::date
      AND b.hora = ${hora}::time
    LIMIT 1
  `
  if (rows.length === 0) return null
  return rows[0] as unknown as Bloqueio
}

export async function getSlotsPastor(
  pastorId: number,
  dataInicio: string,
  dataFim: string
): Promise<Map<string, Slot>> {
  const sql = getDb()

  const agendamentosRows = await sql`
    SELECT id, data::text, LEFT(hora::text, 5) AS hora, status, nome_fiel, telefone, assunto, observacoes
    FROM agendamentos
    WHERE pastor_id = ${pastorId}
      AND data >= ${dataInicio}::date
      AND data <= ${dataFim}::date
      AND status NOT IN ('cancelado')
    ORDER BY data, hora
  `

  const bloqueiosRows = await sql`
    SELECT id, data::text, LEFT(hora::text, 5) AS hora, motivo
    FROM bloqueios
    WHERE pastor_id = ${pastorId}
      AND data >= ${dataInicio}::date
      AND data <= ${dataFim}::date
    ORDER BY data, hora
  `

  const mapa = new Map<string, Slot>()

  for (const row of agendamentosRows) {
    const r = row as { data: string; hora: string; status: string; [key: string]: unknown }
    const chave = `${r.data}|${r.hora}`
    mapa.set(chave, {
      tipo: r.status === 'confirmado' ? 'confirmado' : 'pendente',
      dados: r as Record<string, unknown>,
    })
  }

  for (const row of bloqueiosRows) {
    const r = row as { data: string; hora: string; [key: string]: unknown }
    const chave = `${r.data}|${r.hora}`
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        tipo: 'bloqueado',
        dados: r as Record<string, unknown>,
      })
    }
  }

  return mapa
}

// ─── Fiéis ─────────────────────────────────────────────────────────────────

export async function buscarFieis(termo?: string): Promise<Fiel[]> {
  const sql = getDb()
  if (termo && termo.trim() !== '') {
    const like = `%${termo}%`
    const rows = await sql`
      SELECT * FROM fieis
      WHERE nome ILIKE ${like} OR telefone ILIKE ${like}
      ORDER BY nome
    `
    return rows as unknown as Fiel[]
  }
  const rows = await sql`SELECT * FROM fieis ORDER BY nome`
  return rows as unknown as Fiel[]
}

export async function getFiel(id: number): Promise<Fiel | null> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM fieis WHERE id = ${id}`
  if (rows.length === 0) return null
  return rows[0] as unknown as Fiel
}

export async function salvarFiel(dados: Partial<Fiel>): Promise<number> {
  const sql = getDb()
  const nome = dados.nome ?? ''
  const telefone = dados.telefone ?? ''
  const email = dados.email ?? ''
  const endereco = dados.endereco ?? ''
  const numero = dados.numero ?? ''
  const bairro = dados.bairro ?? ''
  const cidade = dados.cidade ?? ''
  const estado = dados.estado ?? ''
  const observacoes = dados.observacoes ?? ''
  const rows = await sql`
    INSERT INTO fieis (nome, telefone, email, endereco, numero, bairro, cidade, estado, observacoes)
    VALUES (${nome}, ${telefone}, ${email}, ${endereco}, ${numero}, ${bairro}, ${cidade}, ${estado}, ${observacoes})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateFiel(id: number, dados: Partial<Fiel>): Promise<void> {
  const sql = getDb()
  const atual = await getFiel(id)
  if (!atual) return
  const nome = dados.nome ?? atual.nome
  const telefone = dados.telefone ?? atual.telefone
  const email = dados.email ?? atual.email
  const endereco = dados.endereco ?? atual.endereco
  const numero = dados.numero ?? atual.numero ?? ''
  const bairro = dados.bairro ?? atual.bairro ?? ''
  const cidade = dados.cidade ?? atual.cidade ?? ''
  const estado = dados.estado ?? atual.estado ?? ''
  const observacoes = dados.observacoes ?? atual.observacoes
  await sql`
    UPDATE fieis
    SET nome = ${nome}, telefone = ${telefone}, email = ${email}, endereco = ${endereco},
        numero = ${numero}, bairro = ${bairro}, cidade = ${cidade}, estado = ${estado}, observacoes = ${observacoes}
    WHERE id = ${id}
  `
}

export async function deleteFiel(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM fieis WHERE id = ${id}`
}
