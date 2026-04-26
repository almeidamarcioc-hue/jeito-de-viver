import { neon } from '@neondatabase/serverless'
import { hashPassword } from './auth'

// ─── Connection ────────────────────────────────────────────────────────────

function getDb() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL não configurado.')
  const url = raw
    .replace(/[?&]channel_binding=[^&]*/g, '')
    .replace(/\?&/, '?')
    .replace(/[?&]$/, '')
  return neon(url)
}

// ─── Init ──────────────────────────────────────────────────────────────────

export async function initDb(): Promise<void> {
  const sql = getDb()

  // ── Secretaria tables ──
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
      duracao_min INTEGER DEFAULT 30,
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
    CREATE TABLE IF NOT EXISTS ferias (
      id SERIAL PRIMARY KEY,
      pastor_id INTEGER REFERENCES pastores(id),
      data_inicio DATE NOT NULL,
      data_fim DATE NOT NULL,
      motivo TEXT DEFAULT 'Férias',
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

  await sql`
    CREATE TABLE IF NOT EXISTS horarios_atendimento (
      dia_semana INTEGER PRIMARY KEY,
      ativo BOOLEAN DEFAULT true,
      inicio TIME DEFAULT '08:00',
      intervalo_inicio TIME,
      intervalo_fim TIME,
      fim TIME DEFAULT '18:00'
    )
  `

  await sql`
    INSERT INTO horarios_atendimento (dia_semana, ativo, inicio, intervalo_inicio, intervalo_fim, fim)
    VALUES
      (0, false, '08:00', '12:00', '13:00', '18:00'),
      (1, true,  '08:00', '12:00', '13:00', '18:00'),
      (2, true,  '08:00', '12:00', '13:00', '18:00'),
      (3, true,  '08:00', '12:00', '13:00', '18:00'),
      (4, true,  '08:00', '12:00', '13:00', '18:00'),
      (5, true,  '08:00', '12:00', '13:00', '18:00'),
      (6, false, '08:00', '12:00', '13:00', '18:00')
    ON CONFLICT (dia_semana) DO NOTHING
  `

  // Migrate secretaria tables
  await sql`ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS duracao_min INTEGER DEFAULT 30`
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS numero VARCHAR(20) DEFAULT ''`
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS bairro VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS cidade VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE pastores ADD COLUMN IF NOT EXISTS estado VARCHAR(2) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS numero VARCHAR(20) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS bairro VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS cidade VARCHAR(100) DEFAULT ''`
  await sql`ALTER TABLE fieis ADD COLUMN IF NOT EXISTS estado VARCHAR(2) DEFAULT ''`

  // Seed default pastores if none exist
  const pastoresExistentes = await sql`SELECT COUNT(*) AS cnt FROM pastores`
  const countPastores = Number((pastoresExistentes[0] as { cnt: string }).cnt)
  if (countPastores === 0) {
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Haimo', '', '', '')`
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Jou', '', '', '')`
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Marisa', '', '', '')`
    await sql`INSERT INTO pastores (nome, telefone, endereco, imagem) VALUES ('Sâmela', '', '', '')`
  }

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

  // ── Educational tables ──
  await sql`
    CREATE TABLE IF NOT EXISTS professores (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(200) NOT NULL,
      email VARCHAR(200) DEFAULT '',
      telefone VARCHAR(20) DEFAULT '',
      disciplina VARCHAR(200) DEFAULT '',
      endereco VARCHAR(300) DEFAULT '',
      numero VARCHAR(20) DEFAULT '',
      bairro VARCHAR(100) DEFAULT '',
      cidade VARCHAR(100) DEFAULT '',
      estado VARCHAR(2) DEFAULT '',
      observacoes TEXT DEFAULT '',
      data_criacao TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS turmas (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(200) NOT NULL,
      descricao TEXT DEFAULT '',
      professor_id INTEGER REFERENCES professores(id) ON DELETE SET NULL,
      turno VARCHAR(20) DEFAULT 'Manhã',
      ano_letivo VARCHAR(10) DEFAULT '',
      ativo BOOLEAN DEFAULT TRUE,
      data_criacao TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS alunos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(200) NOT NULL,
      email VARCHAR(200) DEFAULT '',
      telefone VARCHAR(20) DEFAULT '',
      data_nascimento DATE,
      turma_id INTEGER REFERENCES turmas(id) ON DELETE SET NULL,
      responsavel VARCHAR(200) DEFAULT '',
      telefone_responsavel VARCHAR(20) DEFAULT '',
      endereco VARCHAR(300) DEFAULT '',
      numero VARCHAR(20) DEFAULT '',
      bairro VARCHAR(100) DEFAULT '',
      cidade VARCHAR(100) DEFAULT '',
      estado VARCHAR(2) DEFAULT '',
      observacoes TEXT DEFAULT '',
      ativo BOOLEAN DEFAULT TRUE,
      data_criacao TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS agendamentos_edu (
      id SERIAL PRIMARY KEY,
      turma_id INTEGER NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
      aluno_id INTEGER REFERENCES alunos(id) ON DELETE SET NULL,
      professor_id INTEGER REFERENCES professores(id) ON DELETE SET NULL,
      data DATE NOT NULL,
      hora TIME NOT NULL,
      duracao_min INTEGER DEFAULT 50,
      assunto VARCHAR(300) DEFAULT '',
      status VARCHAR(20) DEFAULT 'confirmado',
      observacoes TEXT DEFAULT '',
      data_criacao TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // ── Users table ──
  await sql`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL UNIQUE,
      senha_hash VARCHAR(300) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      modulos TEXT DEFAULT '*',
      ativo BOOLEAN DEFAULT TRUE,
      data_criacao TIMESTAMPTZ DEFAULT NOW()
    )
  `

  // Add modulos column if it doesn't exist (migration)
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS modulos TEXT DEFAULT '*'`

  // Seed admin user
  const existsAdmin = await sql`SELECT id FROM usuarios WHERE usuario = 'admin'`
  if ((existsAdmin as unknown[]).length === 0) {
    const hash = hashPassword('admin')
    await sql`
      INSERT INTO usuarios (usuario, senha_hash, nome, role, modulos)
      VALUES ('admin', ${hash}, 'Administrador', 'admin', '*')
    `
  }
}

// ─── Pastores ──────────────────────────────────────────────────────────────

export async function getPastores() {
  const sql = getDb()
  const rows = await sql`SELECT * FROM pastores ORDER BY nome`
  return rows
}

export async function getPastor(id: number) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM pastores WHERE id = ${id}`
  if (rows.length === 0) return null
  return rows[0]
}

export async function criarPastor(dados: Record<string, unknown>): Promise<number> {
  const sql = getDb()
  const nome = (dados.nome as string) ?? ''
  const telefone = (dados.telefone as string) ?? ''
  const endereco = (dados.endereco as string) ?? ''
  const numero = (dados.numero as string) ?? ''
  const bairro = (dados.bairro as string) ?? ''
  const cidade = (dados.cidade as string) ?? ''
  const estado = (dados.estado as string) ?? ''
  const imagem = (dados.imagem as string) ?? ''
  const rows = await sql`
    INSERT INTO pastores (nome, telefone, endereco, numero, bairro, cidade, estado, imagem)
    VALUES (${nome}, ${telefone}, ${endereco}, ${numero}, ${bairro}, ${cidade}, ${estado}, ${imagem})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updatePastor(id: number, dados: Record<string, unknown>): Promise<void> {
  const sql = getDb()
  const pastor = await getPastor(id)
  if (!pastor) return
  const p = pastor as Record<string, unknown>
  const nome = (dados.nome as string) ?? p.nome
  const telefone = (dados.telefone as string) ?? p.telefone
  const endereco = (dados.endereco as string) ?? p.endereco
  const numero = (dados.numero as string) ?? p.numero ?? ''
  const bairro = (dados.bairro as string) ?? p.bairro ?? ''
  const cidade = (dados.cidade as string) ?? p.cidade ?? ''
  const estado = (dados.estado as string) ?? p.estado ?? ''
  const imagem = (dados.imagem as string) ?? p.imagem
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

// ─── Agendamentos Pastorais ────────────────────────────────────────────────

export async function criarAgendamentoPastoral(dados: Record<string, unknown>): Promise<number> {
  const sql = getDb()
  const nome_fiel = (dados.nome_fiel as string) ?? ''
  const telefone = (dados.telefone as string) ?? ''
  const assunto = (dados.assunto as string) ?? ''
  const pastor_id = (dados.pastor_id as number) ?? 0
  const data = (dados.data as string) ?? ''
  const hora = (dados.hora as string) ?? ''
  const duracao_min = (dados.duracao_min as number) ?? 30
  const status = (dados.status as string) ?? 'pendente'
  const recorrencia = (dados.recorrencia as string) ?? 'nenhuma'
  const observacoes = (dados.observacoes as string) ?? ''

  const [hh, mm] = hora.split(':').map(Number)
  const endMin = hh * 60 + mm + duracao_min
  const endHora = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`
  const bloqueados = await sql`
    SELECT id FROM bloqueios
    WHERE pastor_id = ${pastor_id}
      AND data = ${data}::date
      AND LEFT(hora::text, 5) >= ${hora}
      AND LEFT(hora::text, 5) < ${endHora}
    LIMIT 1
  `
  if (bloqueados.length > 0) {
    throw new Error('BLOQUEADO: Este horário está bloqueado para o pastor.')
  }

  const rows = await sql`
    INSERT INTO agendamentos (nome_fiel, telefone, assunto, pastor_id, data, hora, duracao_min, status, recorrencia, observacoes)
    VALUES (${nome_fiel}, ${telefone}, ${assunto}, ${pastor_id}, ${data}::date, ${hora}::time, ${duracao_min}, ${status}, ${recorrencia}, ${observacoes})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function getAgendamentoPastoral(id: number) {
  const sql = getDb()
  const rows = await sql`
    SELECT a.*, p.nome AS pastor_nome, p.telefone AS pastor_tel
    FROM agendamentos a
    LEFT JOIN pastores p ON a.pastor_id = p.id
    WHERE a.id = ${id}
  `
  if (rows.length === 0) return null
  return rows[0]
}

export async function getAgendamentosPastorais(opts?: {
  pastorId?: number
  dataInicio?: string
  dataFim?: string
  status?: string
}) {
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

  return rows
}

export async function updateAgendamentoPastoral(id: number, dados: Record<string, unknown>): Promise<void> {
  const sql = getDb()
  const atual = await getAgendamentoPastoral(id)
  if (!atual) return
  const a = atual as Record<string, unknown>

  const nome_fiel = (dados.nome_fiel as string) ?? a.nome_fiel
  const telefone = (dados.telefone as string) ?? a.telefone
  const assunto = (dados.assunto as string) ?? a.assunto
  const pastor_id = (dados.pastor_id as number) ?? a.pastor_id
  const data = (dados.data as string) ?? a.data
  const hora = (dados.hora as string) ?? a.hora
  const duracao_min = (dados.duracao_min as number) ?? a.duracao_min ?? 30
  const status = (dados.status as string) ?? a.status
  const recorrencia = (dados.recorrencia as string) ?? a.recorrencia
  const observacoes = (dados.observacoes as string) ?? a.observacoes
  const lembrete_enviado = (dados.lembrete_enviado as number) ?? a.lembrete_enviado
  const confirmacao_enviada = (dados.confirmacao_enviada as number) ?? a.confirmacao_enviada

  await sql`
    UPDATE agendamentos
    SET
      nome_fiel = ${nome_fiel},
      telefone = ${telefone},
      assunto = ${assunto},
      pastor_id = ${pastor_id},
      data = ${data}::date,
      hora = ${hora}::time,
      duracao_min = ${duracao_min},
      status = ${status},
      recorrencia = ${recorrencia},
      observacoes = ${observacoes},
      lembrete_enviado = ${lembrete_enviado},
      confirmacao_enviada = ${confirmacao_enviada}
    WHERE id = ${id}
  `
}

export async function deleteAgendamentoPastoral(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM agendamentos WHERE id = ${id}`
}

export async function checarConflito(
  pastorId: number,
  data: string,
  hora: string,
  duracao = 30,
  ignorarId?: number
) {
  const sql = getDb()
  let rows
  if (ignorarId) {
    rows = await sql`
      SELECT * FROM agendamentos
      WHERE pastor_id = ${pastorId}
        AND data = ${data}::date
        AND status NOT IN ('cancelado')
        AND id != ${ignorarId}
        AND hora::time < (${hora}::time + (${duracao} || ' minutes')::interval)
        AND (hora::time + (duracao_min || ' minutes')::interval) > ${hora}::time
      LIMIT 1
    `
  } else {
    rows = await sql`
      SELECT * FROM agendamentos
      WHERE pastor_id = ${pastorId}
        AND data = ${data}::date
        AND status NOT IN ('cancelado')
        AND hora::time < (${hora}::time + (${duracao} || ' minutes')::interval)
        AND (hora::time + (duracao_min || ' minutes')::interval) > ${hora}::time
      LIMIT 1
    `
  }
  if (rows.length === 0) return null
  return rows[0]
}

function agoraBrasil(): { data: string; hora: string } {
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  const p = fmt.formatToParts(now)
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '00'
  return { data: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}` }
}

export async function getProximoHorarioLivre(
  pastorId: number,
  aPartir?: string
): Promise<{ data: string; hora: string } | null> {
  const sql = getDb()
  const br = agoraBrasil()
  const dataBase = aPartir ?? br.data
  const horaMin = dataBase === br.data ? br.hora : '00:00'

  const rows = await sql`
    WITH slots AS (
      SELECT
        (gs_date::date)::text AS data,
        to_char(('08:00'::time + (gs_h * INTERVAL '30 minutes')), 'HH24:MI') AS hora
      FROM
        generate_series(
          ${dataBase}::date,
          ${dataBase}::date + INTERVAL '30 days',
          INTERVAL '1 day'
        ) AS gs_date,
        generate_series(0, 21) AS gs_h
    ),
    ocupados AS (
      SELECT
        a.data::text,
        LEFT((a.hora::time + (g.offset_min * INTERVAL '1 minute'))::text, 5) AS hora
      FROM agendamentos a
      CROSS JOIN generate_series(0, a.duracao_min - 1, 30) AS g(offset_min)
      WHERE a.pastor_id = ${pastorId}
        AND a.status NOT IN ('cancelado')
        AND a.data >= ${dataBase}::date
        AND a.data <= ${dataBase}::date + INTERVAL '30 days'
      UNION ALL
      SELECT data::text, LEFT(hora::text, 5) AS hora
      FROM bloqueios
      WHERE pastor_id = ${pastorId}
        AND data >= ${dataBase}::date
        AND data <= ${dataBase}::date + INTERVAL '30 days'
    )
    SELECT s.data, s.hora
    FROM slots s
    WHERE NOT EXISTS (
      SELECT 1 FROM ocupados o
      WHERE o.data = s.data AND o.hora = s.hora
    )
    AND (s.data > ${dataBase} OR (s.data = ${dataBase} AND s.hora > ${horaMin}))
    ORDER BY s.data, s.hora
    LIMIT 1
  `

  if (rows.length === 0) return null
  const row = rows[0] as { data: string; hora: string }
  return { data: row.data, hora: row.hora }
}

// ─── Bloqueios ─────────────────────────────────────────────────────────────

export async function getBloqueios(pastorId: number, dataInicio: string, dataFim: string) {
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
  return rows
}

export async function criarBloqueio(pastorId: number, data: string, hora: string, motivo?: string): Promise<number> {
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

export async function criarBloqueiosDia(pastorId: number, data: string, motivo: string): Promise<void> {
  const sql = getDb()
  const HORAS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']
  await sql`DELETE FROM bloqueios WHERE pastor_id = ${pastorId} AND data = ${data}::date`
  for (const hora of HORAS) {
    await sql`INSERT INTO bloqueios (pastor_id, data, hora, motivo) VALUES (${pastorId}, ${data}::date, ${hora}::time, ${motivo})`
  }
}

export async function deleteBloqueiosDia(pastorId: number, data: string): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM bloqueios WHERE pastor_id = ${pastorId} AND data = ${data}::date`
}

export async function getSlotsPastor(pastorId: number, dataInicio: string, dataFim: string): Promise<Map<string, { tipo: string; dados: Record<string, unknown> }>> {
  const sql = getDb()

  const agendamentosRows = await sql`
    SELECT
      a.id,
      a.data::text,
      LEFT((a.hora::time + (g.offset_min * INTERVAL '1 minute'))::text, 5) AS hora,
      a.status,
      a.nome_fiel,
      a.telefone,
      a.assunto,
      a.observacoes,
      a.duracao_min,
      a.hora::text AS hora_inicio
    FROM agendamentos a
    CROSS JOIN generate_series(0, a.duracao_min - 1, 30) AS g(offset_min)
    WHERE a.pastor_id = ${pastorId}
      AND a.data >= ${dataInicio}::date
      AND a.data <= ${dataFim}::date
      AND a.status NOT IN ('cancelado')
    ORDER BY a.data, hora
  `

  const bloqueiosRows = await sql`
    SELECT id, data::text, LEFT(hora::text, 5) AS hora, motivo
    FROM bloqueios
    WHERE pastor_id = ${pastorId}
      AND data >= ${dataInicio}::date
      AND data <= ${dataFim}::date
    ORDER BY data, hora
  `

  const mapa = new Map<string, { tipo: string; dados: Record<string, unknown> }>()

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

export async function buscarFieis(termo?: string) {
  const sql = getDb()
  if (termo && termo.trim() !== '') {
    const like = `%${termo}%`
    const rows = await sql`
      SELECT * FROM fieis
      WHERE nome ILIKE ${like} OR telefone ILIKE ${like}
      ORDER BY nome
    `
    return rows
  }
  const rows = await sql`SELECT * FROM fieis ORDER BY nome`
  return rows
}

export async function getFiel(id: number) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM fieis WHERE id = ${id}`
  if (rows.length === 0) return null
  return rows[0]
}

export async function salvarFiel(dados: Record<string, unknown>): Promise<number> {
  const sql = getDb()
  const nome = (dados.nome as string) ?? ''
  const telefone = (dados.telefone as string) ?? ''
  const email = (dados.email as string) ?? ''
  const endereco = (dados.endereco as string) ?? ''
  const numero = (dados.numero as string) ?? ''
  const bairro = (dados.bairro as string) ?? ''
  const cidade = (dados.cidade as string) ?? ''
  const estado = (dados.estado as string) ?? ''
  const observacoes = (dados.observacoes as string) ?? ''
  const rows = await sql`
    INSERT INTO fieis (nome, telefone, email, endereco, numero, bairro, cidade, estado, observacoes)
    VALUES (${nome}, ${telefone}, ${email}, ${endereco}, ${numero}, ${bairro}, ${cidade}, ${estado}, ${observacoes})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateFiel(id: number, dados: Record<string, unknown>): Promise<void> {
  const sql = getDb()
  const atual = await getFiel(id)
  if (!atual) return
  const a = atual as Record<string, unknown>
  const nome = (dados.nome as string) ?? a.nome
  const telefone = (dados.telefone as string) ?? a.telefone
  const email = (dados.email as string) ?? a.email
  const endereco = (dados.endereco as string) ?? a.endereco
  const numero = (dados.numero as string) ?? a.numero ?? ''
  const bairro = (dados.bairro as string) ?? a.bairro ?? ''
  const cidade = (dados.cidade as string) ?? a.cidade ?? ''
  const estado = (dados.estado as string) ?? a.estado ?? ''
  const observacoes = (dados.observacoes as string) ?? a.observacoes
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

// ─── Configurações ─────────────────────────────────────────────────────────

export async function getConfiguracoes() {
  const sql = getDb()
  const rows = await sql`SELECT * FROM configuracoes WHERE id = 1`
  if (rows.length === 0) {
    return { id: 1, horas_lembrete: 24, msg_confirmacao: '', msg_lembrete: '', msg_cancelamento: '', msg_remarcacao: '', msg_pastor: '' }
  }
  return rows[0]
}

export async function updateConfiguracoes(dados: Record<string, unknown>): Promise<void> {
  const sql = getDb()
  const atual = await getConfiguracoes() as Record<string, unknown>
  const horas_lembrete = (dados.horas_lembrete as number) ?? atual.horas_lembrete
  const msg_confirmacao = (dados.msg_confirmacao as string) ?? atual.msg_confirmacao
  const msg_lembrete = (dados.msg_lembrete as string) ?? atual.msg_lembrete
  const msg_cancelamento = (dados.msg_cancelamento as string) ?? atual.msg_cancelamento
  const msg_remarcacao = (dados.msg_remarcacao as string) ?? atual.msg_remarcacao
  const msg_pastor = (dados.msg_pastor as string) ?? atual.msg_pastor

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

// ─── Horários de Atendimento ───────────────────────────────────────────────

export async function getHorarios() {
  const sql = getDb()
  const rows = await sql`
    SELECT
      dia_semana,
      ativo,
      LEFT(inicio::text, 5) AS inicio,
      CASE WHEN intervalo_inicio IS NOT NULL THEN LEFT(intervalo_inicio::text, 5) END AS intervalo_inicio,
      CASE WHEN intervalo_fim IS NOT NULL THEN LEFT(intervalo_fim::text, 5) END AS intervalo_fim,
      LEFT(fim::text, 5) AS fim
    FROM horarios_atendimento
    ORDER BY dia_semana
  `
  return rows
}

export async function salvarHorarios(horarios: Array<{
  dia_semana: number
  ativo: boolean
  inicio: string
  intervalo_inicio: string | null
  intervalo_fim: string | null
  fim: string
}>): Promise<void> {
  const sql = getDb()
  for (const h of horarios) {
    const ini: string | null = h.intervalo_inicio || null
    const ifim: string | null = h.intervalo_fim || null
    await sql`
      INSERT INTO horarios_atendimento (dia_semana, ativo, inicio, intervalo_inicio, intervalo_fim, fim)
      VALUES (${h.dia_semana}, ${h.ativo}, ${h.inicio}, ${ini}, ${ifim}, ${h.fim})
      ON CONFLICT (dia_semana) DO UPDATE SET
        ativo            = EXCLUDED.ativo,
        inicio           = EXCLUDED.inicio,
        intervalo_inicio = EXCLUDED.intervalo_inicio,
        intervalo_fim    = EXCLUDED.intervalo_fim,
        fim              = EXCLUDED.fim
    `
  }
}

// ─── Férias ────────────────────────────────────────────────────────────────

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  while (d <= e) {
    dates.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return dates
}

export async function getFerias(pastorId: number) {
  const sql = getDb()
  const rows = await sql`
    SELECT id, pastor_id, data_inicio::text, data_fim::text, motivo, data_criacao
    FROM ferias WHERE pastor_id = ${pastorId} ORDER BY data_inicio
  `
  return rows
}

export async function criarFerias(pastorId: number, dataInicio: string, dataFim: string, motivo: string): Promise<number> {
  const sql = getDb()
  const mot = motivo || 'Férias'
  const rows = await sql`
    INSERT INTO ferias (pastor_id, data_inicio, data_fim, motivo)
    VALUES (${pastorId}, ${dataInicio}::date, ${dataFim}::date, ${mot})
    RETURNING id
  `
  const id = (rows[0] as { id: number }).id
  for (const data of datesBetween(dataInicio, dataFim)) {
    await criarBloqueiosDia(pastorId, data, mot)
  }
  return id
}

export async function deletarFerias(id: number): Promise<void> {
  const sql = getDb()
  const rows = await sql`SELECT pastor_id, data_inicio::text, data_fim::text FROM ferias WHERE id = ${id}`
  if (rows.length === 0) return
  const { pastor_id, data_inicio, data_fim } = rows[0] as { pastor_id: number; data_inicio: string; data_fim: string }
  await sql`DELETE FROM ferias WHERE id = ${id}`
  for (const data of datesBetween(data_inicio, data_fim)) {
    await deleteBloqueiosDia(pastor_id, data)
  }
}

// ─── Educational: Professores ──────────────────────────────────────────────

export async function getProfessores() {
  const sql = getDb()
  const rows = await sql`SELECT * FROM professores ORDER BY nome`
  return rows
}

export async function getProfessor(id: number) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM professores WHERE id = ${id}`
  return rows[0] ?? null
}

export async function criarProfessor(data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO professores (nome, email, telefone, disciplina, endereco, numero, bairro, cidade, estado, observacoes)
    VALUES (${data.nome ?? ''}, ${data.email ?? ''}, ${data.telefone ?? ''}, ${data.disciplina ?? ''},
            ${data.endereco ?? ''}, ${data.numero ?? ''}, ${data.bairro ?? ''}, ${data.cidade ?? ''}, ${data.estado ?? ''}, ${data.observacoes ?? ''})
    RETURNING *
  `
  return rows[0]
}

export async function updateProfessor(id: number, data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    UPDATE professores SET
      nome = COALESCE(${data.nome ?? null}, nome),
      email = COALESCE(${data.email ?? null}, email),
      telefone = COALESCE(${data.telefone ?? null}, telefone),
      disciplina = COALESCE(${data.disciplina ?? null}, disciplina),
      endereco = COALESCE(${data.endereco ?? null}, endereco),
      numero = COALESCE(${data.numero ?? null}, numero),
      bairro = COALESCE(${data.bairro ?? null}, bairro),
      cidade = COALESCE(${data.cidade ?? null}, cidade),
      estado = COALESCE(${data.estado ?? null}, estado),
      observacoes = COALESCE(${data.observacoes ?? null}, observacoes)
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0]
}

export async function deleteProfessor(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM professores WHERE id = ${id}`
}

// ─── Educational: Turmas ───────────────────────────────────────────────────

export async function getTurmas() {
  const sql = getDb()
  const rows = await sql`
    SELECT t.*, p.nome AS professor_nome
    FROM turmas t
    LEFT JOIN professores p ON t.professor_id = p.id
    ORDER BY t.nome
  `
  return rows
}

export async function getTurma(id: number) {
  const sql = getDb()
  const rows = await sql`
    SELECT t.*, p.nome AS professor_nome
    FROM turmas t
    LEFT JOIN professores p ON t.professor_id = p.id
    WHERE t.id = ${id}
  `
  return rows[0] ?? null
}

export async function criarTurma(data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO turmas (nome, descricao, professor_id, turno, ano_letivo, ativo)
    VALUES (${data.nome ?? ''}, ${data.descricao ?? ''}, ${data.professor_id ?? null},
            ${data.turno ?? 'Manhã'}, ${data.ano_letivo ?? ''}, ${data.ativo ?? true})
    RETURNING *
  `
  return rows[0]
}

export async function updateTurma(id: number, data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    UPDATE turmas SET
      nome = COALESCE(${data.nome ?? null}, nome),
      descricao = COALESCE(${data.descricao ?? null}, descricao),
      professor_id = CASE WHEN ${data.professor_id !== undefined} THEN ${data.professor_id ?? null} ELSE professor_id END,
      turno = COALESCE(${data.turno ?? null}, turno),
      ano_letivo = COALESCE(${data.ano_letivo ?? null}, ano_letivo),
      ativo = COALESCE(${data.ativo ?? null}, ativo)
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0]
}

export async function deleteTurma(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM turmas WHERE id = ${id}`
}

// ─── Educational: Alunos ───────────────────────────────────────────────────

export async function getAlunos(filtros?: { turma_id?: number; busca?: string }) {
  const sql = getDb()
  let rows

  if (filtros?.turma_id) {
    rows = await sql`
      SELECT a.*, t.nome AS turma_nome
      FROM alunos a
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE a.turma_id = ${filtros.turma_id}
      ORDER BY a.nome
    `
  } else if (filtros?.busca) {
    const busca = `%${filtros.busca}%`
    rows = await sql`
      SELECT a.*, t.nome AS turma_nome
      FROM alunos a
      LEFT JOIN turmas t ON a.turma_id = t.id
      WHERE a.nome ILIKE ${busca} OR a.telefone ILIKE ${busca} OR a.email ILIKE ${busca}
      ORDER BY a.nome
    `
  } else {
    rows = await sql`
      SELECT a.*, t.nome AS turma_nome
      FROM alunos a
      LEFT JOIN turmas t ON a.turma_id = t.id
      ORDER BY a.nome
    `
  }

  return rows
}

export async function getAluno(id: number) {
  const sql = getDb()
  const rows = await sql`
    SELECT a.*, t.nome AS turma_nome
    FROM alunos a
    LEFT JOIN turmas t ON a.turma_id = t.id
    WHERE a.id = ${id}
  `
  return rows[0] ?? null
}

export async function criarAluno(data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO alunos (nome, email, telefone, data_nascimento, turma_id, responsavel,
                        telefone_responsavel, endereco, numero, bairro, cidade, estado, observacoes, ativo)
    VALUES (${data.nome ?? ''}, ${data.email ?? ''}, ${data.telefone ?? ''},
            ${data.data_nascimento || null}, ${data.turma_id ?? null},
            ${data.responsavel ?? ''}, ${data.telefone_responsavel ?? ''},
            ${data.endereco ?? ''}, ${data.numero ?? ''}, ${data.bairro ?? ''}, ${data.cidade ?? ''}, ${data.estado ?? ''},
            ${data.observacoes ?? ''}, ${data.ativo ?? true})
    RETURNING *
  `
  return rows[0]
}

export async function updateAluno(id: number, data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    UPDATE alunos SET
      nome = COALESCE(${data.nome ?? null}, nome),
      email = COALESCE(${data.email ?? null}, email),
      telefone = COALESCE(${data.telefone ?? null}, telefone),
      data_nascimento = CASE WHEN ${data.data_nascimento !== undefined} THEN ${data.data_nascimento || null} ELSE data_nascimento END,
      turma_id = CASE WHEN ${data.turma_id !== undefined} THEN ${data.turma_id ?? null} ELSE turma_id END,
      responsavel = COALESCE(${data.responsavel ?? null}, responsavel),
      telefone_responsavel = COALESCE(${data.telefone_responsavel ?? null}, telefone_responsavel),
      endereco = COALESCE(${data.endereco ?? null}, endereco),
      numero = COALESCE(${data.numero ?? null}, numero),
      bairro = COALESCE(${data.bairro ?? null}, bairro),
      cidade = COALESCE(${data.cidade ?? null}, cidade),
      estado = COALESCE(${data.estado ?? null}, estado),
      observacoes = COALESCE(${data.observacoes ?? null}, observacoes),
      ativo = COALESCE(${data.ativo ?? null}, ativo)
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0]
}

export async function deleteAluno(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM alunos WHERE id = ${id}`
}

// ─── Educational: Agendamentos (agendamentos_edu) ──────────────────────────

export async function getAgendamentosEdu(filtros?: {
  turma_id?: number
  data?: string
  data_inicio?: string
  data_fim?: string
}) {
  const sql = getDb()

  if (filtros?.turma_id && filtros?.data) {
    const rows = await sql`
      SELECT ag.*, t.nome AS turma_nome, a.nome AS aluno_nome, p.nome AS professor_nome
      FROM agendamentos_edu ag
      LEFT JOIN turmas t ON ag.turma_id = t.id
      LEFT JOIN alunos a ON ag.aluno_id = a.id
      LEFT JOIN professores p ON ag.professor_id = p.id
      WHERE ag.turma_id = ${filtros.turma_id} AND ag.data = ${filtros.data}
      ORDER BY ag.hora
    `
    return rows
  }

  if (filtros?.turma_id && filtros?.data_inicio && filtros?.data_fim) {
    const rows = await sql`
      SELECT ag.*, t.nome AS turma_nome, a.nome AS aluno_nome, p.nome AS professor_nome
      FROM agendamentos_edu ag
      LEFT JOIN turmas t ON ag.turma_id = t.id
      LEFT JOIN alunos a ON ag.aluno_id = a.id
      LEFT JOIN professores p ON ag.professor_id = p.id
      WHERE ag.turma_id = ${filtros.turma_id}
        AND ag.data BETWEEN ${filtros.data_inicio} AND ${filtros.data_fim}
      ORDER BY ag.data, ag.hora
    `
    return rows
  }

  if (filtros?.data) {
    const rows = await sql`
      SELECT ag.*, t.nome AS turma_nome, a.nome AS aluno_nome, p.nome AS professor_nome
      FROM agendamentos_edu ag
      LEFT JOIN turmas t ON ag.turma_id = t.id
      LEFT JOIN alunos a ON ag.aluno_id = a.id
      LEFT JOIN professores p ON ag.professor_id = p.id
      WHERE ag.data = ${filtros.data}
      ORDER BY ag.hora
    `
    return rows
  }

  const rows = await sql`
    SELECT ag.*, t.nome AS turma_nome, a.nome AS aluno_nome, p.nome AS professor_nome
    FROM agendamentos_edu ag
    LEFT JOIN turmas t ON ag.turma_id = t.id
    LEFT JOIN alunos a ON ag.aluno_id = a.id
    LEFT JOIN professores p ON ag.professor_id = p.id
    ORDER BY ag.data DESC, ag.hora
  `
  return rows
}

export async function getAgendamentoEdu(id: number) {
  const sql = getDb()
  const rows = await sql`
    SELECT ag.*, t.nome AS turma_nome, a.nome AS aluno_nome, p.nome AS professor_nome
    FROM agendamentos_edu ag
    LEFT JOIN turmas t ON ag.turma_id = t.id
    LEFT JOIN alunos a ON ag.aluno_id = a.id
    LEFT JOIN professores p ON ag.professor_id = p.id
    WHERE ag.id = ${id}
  `
  return rows[0] ?? null
}

export async function criarAgendamentoEdu(data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO agendamentos_edu (turma_id, aluno_id, professor_id, data, hora, duracao_min, assunto, status, observacoes)
    VALUES (${data.turma_id}, ${data.aluno_id ?? null}, ${data.professor_id ?? null},
            ${data.data}, ${data.hora}, ${data.duracao_min ?? 50},
            ${data.assunto ?? ''}, ${data.status ?? 'confirmado'}, ${data.observacoes ?? ''})
    RETURNING *
  `
  return rows[0]
}

export async function updateAgendamentoEdu(id: number, data: Record<string, unknown>) {
  const sql = getDb()
  const rows = await sql`
    UPDATE agendamentos_edu SET
      turma_id   = COALESCE(${data.turma_id ?? null}, turma_id),
      aluno_id   = CASE WHEN ${data.aluno_id !== undefined} THEN ${data.aluno_id ?? null} ELSE aluno_id END,
      professor_id = CASE WHEN ${data.professor_id !== undefined} THEN ${data.professor_id ?? null} ELSE professor_id END,
      data       = COALESCE(${data.data ?? null}, data),
      hora       = COALESCE(${data.hora ?? null}, hora),
      duracao_min = COALESCE(${data.duracao_min ?? null}, duracao_min),
      assunto    = COALESCE(${data.assunto ?? null}, assunto),
      status     = COALESCE(${data.status ?? null}, status),
      observacoes = COALESCE(${data.observacoes ?? null}, observacoes)
    WHERE id = ${id}
    RETURNING *
  `
  return rows[0]
}

export async function deleteAgendamentoEdu(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM agendamentos_edu WHERE id = ${id}`
}

// ─── Educational: Stats ────────────────────────────────────────────────────

export async function getStats() {
  const sql = getDb()
  const [alunos, turmas, professores, ativos] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM alunos`,
    sql`SELECT COUNT(*) AS count FROM turmas`,
    sql`SELECT COUNT(*) AS count FROM professores`,
    sql`SELECT COUNT(*) AS count FROM alunos WHERE ativo = TRUE`,
  ])
  return {
    totalAlunos: Number(alunos[0].count),
    totalTurmas: Number(turmas[0].count),
    totalProfessores: Number(professores[0].count),
    alunosAtivos: Number(ativos[0].count),
  }
}

// ─── Usuários ──────────────────────────────────────────────────────────────

export async function getUsuarioPorLogin(usuario: string) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM usuarios WHERE usuario = ${usuario} AND ativo = TRUE`
  return rows[0] ?? null
}

export async function getUsuarios() {
  const sql = getDb()
  const rows = await sql`SELECT id, usuario, nome, role, modulos, ativo, data_criacao FROM usuarios ORDER BY nome`
  return rows
}

export async function getUsuario(id: number) {
  const sql = getDb()
  const rows = await sql`SELECT id, usuario, nome, role, modulos, ativo, data_criacao FROM usuarios WHERE id = ${id}`
  return rows[0] ?? null
}

export async function criarUsuario(dados: { usuario: string; senha: string; nome: string; role?: string; modulos?: string }): Promise<number> {
  const sql = getDb()
  const hash = hashPassword(dados.senha)
  const rows = await sql`
    INSERT INTO usuarios (usuario, senha_hash, nome, role, modulos)
    VALUES (${dados.usuario}, ${hash}, ${dados.nome}, ${dados.role ?? 'admin'}, ${dados.modulos ?? '*'})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateUsuario(id: number, dados: { nome?: string; senha?: string; role?: string; modulos?: string; ativo?: boolean }): Promise<void> {
  const sql = getDb()
  if (dados.senha) {
    const hash = hashPassword(dados.senha)
    await sql`
      UPDATE usuarios SET
        nome = COALESCE(${dados.nome ?? null}, nome),
        senha_hash = ${hash},
        role = COALESCE(${dados.role ?? null}, role),
        modulos = COALESCE(${dados.modulos ?? null}, modulos),
        ativo = COALESCE(${dados.ativo ?? null}, ativo)
      WHERE id = ${id}
    `
  } else {
    await sql`
      UPDATE usuarios SET
        nome = COALESCE(${dados.nome ?? null}, nome),
        role = COALESCE(${dados.role ?? null}, role),
        modulos = COALESCE(${dados.modulos ?? null}, modulos),
        ativo = COALESCE(${dados.ativo ?? null}, ativo)
      WHERE id = ${id}
    `
  }
}

export async function deleteUsuario(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM usuarios WHERE id = ${id}`
}
