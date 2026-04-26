'use client'

import { useEffect, useState, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Agendamento, Turma, Aluno, Professor } from '@/types'

const DIAS_PT = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_CONFIG: Record<string, { bg: string; border: string; label: string; text: string }> = {
  confirmado: { bg: '#f0fdf4', border: '#22c55e', label: 'Confirmado', text: '#166534' },
  cancelado:  { bg: '#fef2f2', border: '#ef4444', label: 'Cancelado',  text: '#991b1b' },
  remarcado:  { bg: '#eff6ff', border: '#3b82f6', label: 'Remarcado',  text: '#1e40af' },
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function formatDatePT(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS_PT[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

type FormState = {
  turma_id: number
  aluno_id: number | null
  professor_id: number | null
  data: string
  hora: string
  duracao_min: number
  assunto: string
  status: 'confirmado' | 'cancelado' | 'remarcado'
  observacoes: string
}

const emptyForm: FormState = {
  turma_id: 0,
  aluno_id: null,
  professor_id: null,
  data: toDateStr(new Date()),
  hora: '08:00',
  duracao_min: 50,
  assunto: '',
  status: 'confirmado',
  observacoes: '',
}

export default function AgendaPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [professores, setProfessores] = useState<Professor[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [turmaSel, setTurmaSel] = useState<number | 'todas'>('todas')
  const [dataSel, setDataSel] = useState(toDateStr(new Date()))
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Agendamento | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  // carrega turmas, alunos, professores uma vez
  useEffect(() => {
    Promise.all([
      fetch('/api/turmas').then(r => r.json()),
      fetch('/api/alunos').then(r => r.json()),
      fetch('/api/professores').then(r => r.json()),
    ]).then(([t, a, p]) => {
      setTurmas(Array.isArray(t) ? t : [])
      setAlunos(Array.isArray(a) ? a : [])
      setProfessores(Array.isArray(p) ? p : [])
    }).catch(e => setErro(e.message))
  }, [])

  const loadAgendamentos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ data: dataSel })
      if (turmaSel !== 'todas') params.set('turma_id', String(turmaSel))
      const res = await fetch(`/api/agendamentos?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar agenda')
      setAgendamentos(await res.json())
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [dataSel, turmaSel])

  useEffect(() => { loadAgendamentos() }, [loadAgendamentos])

  function openNew() {
    setEditing(null)
    setForm({
      ...emptyForm,
      data: dataSel,
      turma_id: turmaSel !== 'todas' ? turmaSel : 0,
    })
    setShowModal(true)
  }

  function openEdit(ag: Agendamento) {
    setEditing(ag)
    setForm({
      turma_id: ag.turma_id,
      aluno_id: ag.aluno_id,
      professor_id: ag.professor_id,
      data: ag.data.substring(0, 10),
      hora: ag.hora.substring(0, 5),
      duracao_min: ag.duracao_min,
      assunto: ag.assunto,
      status: ag.status,
      observacoes: ag.observacoes,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.turma_id || !form.data || !form.hora) return
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/agendamentos/${editing.id}` : '/api/agendamentos'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
      setShowModal(false)
      await loadAgendamentos()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/agendamentos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setConfirmDelete(null)
      await loadAgendamentos()
    } catch (e: any) {
      setErro(e.message)
    }
  }

  async function handleStatusChange(ag: Agendamento, status: string) {
    try {
      await fetch(`/api/agendamentos/${ag.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await loadAgendamentos()
    } catch (e: any) {
      setErro(e.message)
    }
  }

  // alunos filtrados pela turma selecionada no formulário
  const alunosDaTurma = form.turma_id
    ? alunos.filter(a => a.turma_id === form.turma_id)
    : alunos

  const agrupados = turmas
    .filter(t => turmaSel === 'todas' || t.id === turmaSel)
    .map(t => ({
      turma: t,
      ags: agendamentos.filter(a => a.turma_id === t.id),
    }))
    .filter(g => turmaSel !== 'todas' || g.ags.length > 0)

  return (
    <div>
      <PageHeader logo title="Agenda" subtitle={formatDatePT(dataSel)} />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {erro} <button className="ml-2 underline" onClick={() => setErro('')}>Fechar</button>
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Navegação de data */}
        <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm px-3 py-2 border border-gray-200">
          <button onClick={() => setDataSel(d => addDays(d, -1))} className="text-gray-500 hover:text-gray-800 px-1">‹</button>
          <input
            type="date"
            value={dataSel}
            onChange={e => setDataSel(e.target.value)}
            className="text-sm font-medium text-gray-700 focus:outline-none"
          />
          <button onClick={() => setDataSel(d => addDays(d, 1))} className="text-gray-500 hover:text-gray-800 px-1">›</button>
          <button
            onClick={() => setDataSel(toDateStr(new Date()))}
            style={{ color: '#E07535' }}
            className="text-xs font-semibold ml-1 hover:underline"
          >
            Hoje
          </button>
        </div>

        {/* Filtro de turma */}
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:border-orange-400"
          value={turmaSel}
          onChange={e => setTurmaSel(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
        >
          <option value="todas">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>

        <button
          onClick={openNew}
          style={{ backgroundColor: '#E07535' }}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 whitespace-nowrap ml-auto"
        >
          + Novo Agendamento
        </button>
      </div>

      {/* Conteúdo */}
      {loading ? <LoadingSpinner /> : agrupados.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold">Nenhum agendamento para esta data.</p>
          <button onClick={openNew} style={{ color: '#E07535' }} className="text-sm mt-2 underline">
            Criar agendamento
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
          {agrupados.map(({ turma, ags }) => (
            <div key={turma.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Header turma */}
              <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="px-4 py-3 flex items-center gap-3">
                <div style={{ backgroundColor: '#E07535' }} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">🏫</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{turma.nome}</p>
                  <p style={{ color: '#E07535' }} className="text-xs">{turma.turno} · {ags.length} agendamento{ags.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => { setForm({ ...emptyForm, data: dataSel, turma_id: turma.id }); setEditing(null); setShowModal(true) }}
                  style={{ color: '#E07535' }}
                  className="text-xl font-bold hover:opacity-70 flex-shrink-0"
                  title="Adicionar agendamento nesta turma"
                >+</button>
              </div>

              {/* Lista de agendamentos */}
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {ags.map(ag => {
                  const cfg = STATUS_CONFIG[ag.status] ?? STATUS_CONFIG.confirmado
                  return (
                    <div
                      key={ag.id}
                      style={{ backgroundColor: cfg.bg, borderLeft: `3px solid ${cfg.border}` }}
                      className="rounded-lg px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-gray-800">{ag.hora.substring(0,5)}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: cfg.border + '22', color: cfg.text }}>{cfg.label}</span>
                          </div>
                          {ag.aluno_nome && <p className="text-sm font-semibold text-gray-800 truncate">🎒 {ag.aluno_nome}</p>}
                          {ag.professor_nome && <p className="text-xs text-gray-500 truncate">👨‍🏫 {ag.professor_nome}</p>}
                          {ag.assunto && <p className="text-xs text-gray-500 truncate mt-0.5">{ag.assunto}</p>}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(ag)} style={{ color: '#E07535' }} className="text-xs font-medium hover:underline">Editar</button>
                          <button onClick={() => setConfirmDelete(ag.id)} className="text-xs text-red-500 font-medium hover:underline">Excluir</button>
                        </div>
                      </div>
                      {/* Status rápido */}
                      <div className="flex gap-2 mt-1.5">
                        {(['confirmado','cancelado','remarcado'] as const).map(s => (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(ag, s)}
                            className="text-xs px-2 py-0.5 rounded border transition-colors"
                            style={ag.status === s
                              ? { backgroundColor: STATUS_CONFIG[s].border, color: 'white', borderColor: STATUS_CONFIG[s].border }
                              : { borderColor: '#e5e7eb', color: '#6b7280' }
                            }
                          >
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal novo/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Turma *</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={form.turma_id || ''}
                  onChange={e => setForm(f => ({ ...f, turma_id: Number(e.target.value), aluno_id: null }))}
                >
                  <option value="">Selecione a turma</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data *</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.data}
                    onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora *</label>
                  <input
                    type="time"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.hora}
                    onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Aluno</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={form.aluno_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">Sem aluno específico</option>
                  {alunosDaTurma.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Professor</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={form.professor_id ?? ''}
                  onChange={e => setForm(f => ({ ...f, professor_id: e.target.value ? Number(e.target.value) : null }))}
                >
                  <option value="">Sem professor específico</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duração (min)</label>
                  <input
                    type="number"
                    min={10}
                    max={480}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.duracao_min}
                    onChange={e => setForm(f => ({ ...f, duracao_min: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  >
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="remarcado">Remarcado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assunto</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={form.assunto}
                  onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
                  placeholder="Ex: Aula de reposição, Reunião, Prova..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none"
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.turma_id || !form.data || !form.hora}
                style={{ backgroundColor: '#E07535' }}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="font-semibold mb-1">Excluir agendamento?</p>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
