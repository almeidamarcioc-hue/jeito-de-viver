import { neon } from '@neondatabase/serverless'
import { Professor, Turma, Aluno, Agendamento } from '@/types'
import { hashPassword } from './auth'

function getDb() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL não configurado.')
  return neon(raw)
}

// ─── Init ──────────────────────────────────────────────────────────────────

export async function initDb() {
  const sql = getDb()

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
    CREATE TABLE IF NOT EXISTS agendamentos (
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

  await sql`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      usuario VARCHAR(100) NOT NULL UNIQUE,
      senha_hash VARCHAR(300) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      role VARCHAR(20) DEFAULT 'admin',
      ativo BOOLEAN DEFAULT TRUE,
      data_criacao TIMESTAMPTZ DEFAULT NOW()
    )
  `

  const existsAdmin = await sql`SELECT id FROM usuarios WHERE usuario = 'admin'`
  if ((existsAdmin as any[]).length === 0) {
    const hash = hashPassword('admin')
    await sql`
      INSERT INTO usuarios (usuario, senha_hash, nome, role)
      VALUES ('admin', ${hash}, 'Administrador', 'admin')
    `
  }
}

// ─── Professores ───────────────────────────────────────────────────────────

export async function getProfessores(): Promise<Professor[]> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM professores ORDER BY nome`
  return rows as Professor[]
}

export async function getProfessor(id: number): Promise<Professor | null> {
  const sql = getDb()
  const rows = await sql`SELECT * FROM professores WHERE id = ${id}`
  return (rows[0] as Professor) ?? null
}

export async function criarProfessor(data: Omit<Professor, 'id' | 'data_criacao'>): Promise<Professor> {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO professores (nome, email, telefone, disciplina, endereco, numero, bairro, cidade, estado, observacoes)
    VALUES (${data.nome}, ${data.email}, ${data.telefone}, ${data.disciplina},
            ${data.endereco}, ${data.numero}, ${data.bairro}, ${data.cidade}, ${data.estado}, ${data.observacoes})
    RETURNING *
  `
  return rows[0] as Professor
}

export async function updateProfessor(id: number, data: Partial<Omit<Professor, 'id' | 'data_criacao'>>): Promise<Professor> {
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
  return rows[0] as Professor
}

export async function deleteProfessor(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM professores WHERE id = ${id}`
}

// ─── Turmas ────────────────────────────────────────────────────────────────

export async function getTurmas(): Promise<Turma[]> {
  const sql = getDb()
  const rows = await sql`
    SELECT t.*, p.nome AS professor_nome
    FROM turmas t
    LEFT JOIN professores p ON t.professor_id = p.id
    ORDER BY t.nome
  `
  return rows as Turma[]
}

export async function getTurma(id: number): Promise<Turma | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT t.*, p.nome AS professor_nome
    FROM turmas t
    LEFT JOIN professores p ON t.professor_id = p.id
    WHERE t.id = ${id}
  `
  return (rows[0] as Turma) ?? null
}

export async function criarTurma(data: Omit<Turma, 'id' | 'data_criacao' | 'professor_nome'>): Promise<Turma> {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO turmas (nome, descricao, professor_id, turno, ano_letivo, ativo)
    VALUES (${data.nome}, ${data.descricao}, ${data.professor_id ?? null},
            ${data.turno}, ${data.ano_letivo}, ${data.ativo ?? true})
    RETURNING *
  `
  return rows[0] as Turma
}

export async function updateTurma(id: number, data: Partial<Omit<Turma, 'id' | 'data_criacao' | 'professor_nome'>>): Promise<Turma> {
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
  return rows[0] as Turma
}

export async function deleteTurma(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM turmas WHERE id = ${id}`
}

// ─── Alunos ────────────────────────────────────────────────────────────────

export async function getAlunos(filtros?: { turma_id?: number; busca?: string; ativo?: boolean }): Promise<Aluno[]> {
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

  return rows as Aluno[]
}

export async function getAluno(id: number): Promise<Aluno | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT a.*, t.nome AS turma_nome
    FROM alunos a
    LEFT JOIN turmas t ON a.turma_id = t.id
    WHERE a.id = ${id}
  `
  return (rows[0] as Aluno) ?? null
}

export async function criarAluno(data: Omit<Aluno, 'id' | 'data_criacao' | 'turma_nome'>): Promise<Aluno> {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO alunos (nome, email, telefone, data_nascimento, turma_id, responsavel,
                        telefone_responsavel, endereco, numero, bairro, cidade, estado, observacoes, ativo)
    VALUES (${data.nome}, ${data.email}, ${data.telefone},
            ${data.data_nascimento || null}, ${data.turma_id ?? null},
            ${data.responsavel}, ${data.telefone_responsavel},
            ${data.endereco}, ${data.numero}, ${data.bairro}, ${data.cidade}, ${data.estado},
            ${data.observacoes}, ${data.ativo ?? true})
    RETURNING *
  `
  return rows[0] as Aluno
}

export async function updateAluno(id: number, data: Partial<Omit<Aluno, 'id' | 'data_criacao' | 'turma_nome'>>): Promise<Aluno> {
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
  return rows[0] as Aluno
}

export async function deleteAluno(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM alunos WHERE id = ${id}`
}

// ─── Agendamentos ──────────────────────────────────────────────────────────

export async function getAgendamentos(filtros?: { turma_id?: number; data?: string; data_inicio?: string; data_fim?: string }): Promise<Agendamento[]> {
  const sql = getDb()

  if (filtros?.turma_id && filtros?.data) {
    const rows = await sql`
      SELECT ag.*,
        t.nome AS turma_nome,
        a.nome AS aluno_nome,
        p.nome AS professor_nome
      FROM agendamentos ag
      LEFT JOIN turmas t ON ag.turma_id = t.id
      LEFT JOIN alunos a ON ag.aluno_id = a.id
      LEFT JOIN professores p ON ag.professor_id = p.id
      WHERE ag.turma_id = ${filtros.turma_id} AND ag.data = ${filtros.data}
      ORDER BY ag.hora
    `
    return rows as Agendamento[]
  }

  if (filtros?.turma_id && filtros?.data_inicio && filtros?.data_fim) {
    const rows = await sql`
      SELECT ag.*,
        t.nome AS turma_nome,
        a.nome AS aluno_nome,
        p.nome AS professor_nome
      FROM agendamentos ag
      LEFT JOIN turmas t ON ag.turma_id = t.id
      LEFT JOIN alunos a ON ag.aluno_id = a.id
      LEFT JOIN professores p ON ag.professor_id = p.id
      WHERE ag.turma_id = ${filtros.turma_id}
        AND ag.data BETWEEN ${filtros.data_inicio} AND ${filtros.data_fim}
      ORDER BY ag.data, ag.hora
    `
    return rows as Agendamento[]
  }

  if (filtros?.data) {
    const rows = await sql`
      SELECT ag.*,
        t.nome AS turma_nome,
        a.nome AS aluno_nome,
        p.nome AS professor_nome
      FROM agendamentos ag
      LEFT JOIN turmas t ON ag.turma_id = t.id
      LEFT JOIN alunos a ON ag.aluno_id = a.id
      LEFT JOIN professores p ON ag.professor_id = p.id
      WHERE ag.data = ${filtros.data}
      ORDER BY ag.hora
    `
    return rows as Agendamento[]
  }

  const rows = await sql`
    SELECT ag.*,
      t.nome AS turma_nome,
      a.nome AS aluno_nome,
      p.nome AS professor_nome
    FROM agendamentos ag
    LEFT JOIN turmas t ON ag.turma_id = t.id
    LEFT JOIN alunos a ON ag.aluno_id = a.id
    LEFT JOIN professores p ON ag.professor_id = p.id
    ORDER BY ag.data DESC, ag.hora
  `
  return rows as Agendamento[]
}

export async function getAgendamento(id: number): Promise<Agendamento | null> {
  const sql = getDb()
  const rows = await sql`
    SELECT ag.*,
      t.nome AS turma_nome,
      a.nome AS aluno_nome,
      p.nome AS professor_nome
    FROM agendamentos ag
    LEFT JOIN turmas t ON ag.turma_id = t.id
    LEFT JOIN alunos a ON ag.aluno_id = a.id
    LEFT JOIN professores p ON ag.professor_id = p.id
    WHERE ag.id = ${id}
  `
  return (rows[0] as Agendamento) ?? null
}

export async function criarAgendamento(data: Omit<Agendamento, 'id' | 'data_criacao' | 'turma_nome' | 'aluno_nome' | 'professor_nome'>): Promise<Agendamento> {
  const sql = getDb()
  const rows = await sql`
    INSERT INTO agendamentos (turma_id, aluno_id, professor_id, data, hora, duracao_min, assunto, status, observacoes)
    VALUES (${data.turma_id}, ${data.aluno_id ?? null}, ${data.professor_id ?? null},
            ${data.data}, ${data.hora}, ${data.duracao_min ?? 50},
            ${data.assunto}, ${data.status ?? 'confirmado'}, ${data.observacoes})
    RETURNING *
  `
  return rows[0] as Agendamento
}

export async function updateAgendamento(id: number, data: Partial<Omit<Agendamento, 'id' | 'data_criacao' | 'turma_nome' | 'aluno_nome' | 'professor_nome'>>): Promise<Agendamento> {
  const sql = getDb()
  const rows = await sql`
    UPDATE agendamentos SET
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
  return rows[0] as Agendamento
}

export async function deleteAgendamento(id: number): Promise<void> {
  const sql = getDb()
  await sql`DELETE FROM agendamentos WHERE id = ${id}`
}

// ─── Usuários ──────────────────────────────────────────────────────────────

export async function getUsuarioPorLogin(usuario: string) {
  const sql = getDb()
  const rows = await sql`SELECT * FROM usuarios WHERE usuario = ${usuario} AND ativo = TRUE`
  return rows[0] ?? null
}

// ─── Stats ─────────────────────────────────────────────────────────────────

export async function getStats(): Promise<{ totalAlunos: number; totalTurmas: number; totalProfessores: number; alunosAtivos: number }> {
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
