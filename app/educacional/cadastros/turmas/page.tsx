'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Turma, Professor } from '@/types'

const TURNOS = ['Manhã', 'Tarde', 'Noite', 'Integral']

const empty = {
  nome: '', descricao: '', professor_id: null as number | null,
  turno: 'Manhã', ano_letivo: '', ativo: true,
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [professores, setProfessores] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Turma | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  async function load() {
    try {
      setLoading(true)
      const [resTurmas, resProfessores] = await Promise.all([
        fetch('/api/educacional/turmas'),
        fetch('/api/educacional/professores'),
      ])
      if (!resTurmas.ok) throw new Error('Erro ao carregar turmas')
      setTurmas(await resTurmas.json())
      setProfessores(resProfessores.ok ? await resProfessores.json() : [])
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ ...empty, ano_letivo: new Date().getFullYear().toString() })
    setShowModal(true)
  }

  function openEdit(t: Turma) {
    setEditing(t)
    setForm({
      nome: t.nome, descricao: t.descricao, professor_id: t.professor_id,
      turno: t.turno, ano_letivo: t.ano_letivo, ativo: t.ativo,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/educacional/turmas/${editing.id}` : '/api/educacional/turmas'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
      setShowModal(false)
      await load()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/educacional/turmas/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setConfirmDelete(null)
      await load()
    } catch (e: any) {
      setErro(e.message)
    }
  }

  const filtered = turmas.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (t.professor_nome ?? '').toLowerCase().includes(busca.toLowerCase()) ||
    t.turno.toLowerCase().includes(busca.toLowerCase())
  )

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader icon="🏫" title="Turmas" subtitle={`${turmas.length} turma${turmas.length !== 1 ? 's' : ''} cadastrada${turmas.length !== 1 ? 's' : ''}`} />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4">
          {erro}
          <button className="ml-3 underline text-sm" onClick={() => setErro('')}>Fechar</button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          placeholder="Buscar por nome, professor ou turno..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <button
          onClick={openNew}
          style={{ backgroundColor: '#E07535' }}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 whitespace-nowrap"
        >
          + Nova Turma
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">🏫</p>
          <p className="font-semibold">Nenhuma turma encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="flex items-center gap-3 px-4 py-3">
                <div style={{ backgroundColor: '#E07535', color: 'white' }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  🏫
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight truncate">{t.nome}</p>
                  <p style={{ color: '#E07535' }} className="text-xs">{t.turno} · {t.ano_letivo || 'Ano não definido'}</p>
                </div>
                {!t.ativo && <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded-full">Inativa</span>}
              </div>
              <div className="px-4 py-3 space-y-1 text-sm text-gray-600">
                {t.professor_nome && <p>👨‍🏫 {t.professor_nome}</p>}
                {t.descricao && <p className="text-xs text-gray-400 line-clamp-2">{t.descricao}</p>}
              </div>
              <div className="px-4 pb-3 flex gap-2">
                <button onClick={() => openEdit(t)} style={{ color: '#E07535' }} className="text-sm font-medium hover:underline">Editar</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setConfirmDelete(t.id)} className="text-sm text-red-500 font-medium hover:underline">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? 'Editar Turma' : 'Nova Turma'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" rows={2}
                  value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))}>
                    {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ano Letivo</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.ano_letivo} onChange={e => setForm(f => ({ ...f, ano_letivo: e.target.value }))} placeholder="ex: 2025" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Professor Responsável</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={form.professor_id ?? ''} onChange={e => setForm(f => ({ ...f, professor_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">Sem professor atribuído</option>
                  {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo" checked={form.ativo}
                  onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="ativo" className="text-sm text-gray-700">Turma ativa</label>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.nome.trim()}
                style={{ backgroundColor: '#E07535' }}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="font-semibold mb-1">Excluir turma?</p>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita. Os alunos desta turma ficarão sem turma associada.</p>
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
