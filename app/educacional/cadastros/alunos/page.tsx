'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Aluno, Turma } from '@/types'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const empty: Omit<Aluno, 'id' | 'data_criacao' | 'turma_nome'> = {
  nome: '', email: '', telefone: '', data_nascimento: '',
  turma_id: null, responsavel: '', telefone_responsavel: '',
  endereco: '', numero: '', bairro: '', cidade: '', estado: '',
  observacoes: '', ativo: true,
}

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Aluno | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  async function load() {
    try {
      setLoading(true)
      const [resAlunos, resTurmas] = await Promise.all([
        fetch('/api/educacional/alunos'),
        fetch('/api/educacional/turmas'),
      ])
      if (!resAlunos.ok) throw new Error('Erro ao carregar alunos')
      setAlunos(await resAlunos.json())
      setTurmas(resTurmas.ok ? await resTurmas.json() : [])
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(empty)
    setShowModal(true)
  }

  function openEdit(a: Aluno) {
    setEditing(a)
    setForm({
      nome: a.nome, email: a.email, telefone: a.telefone,
      data_nascimento: a.data_nascimento ? a.data_nascimento.substring(0, 10) : '',
      turma_id: a.turma_id, responsavel: a.responsavel,
      telefone_responsavel: a.telefone_responsavel,
      endereco: a.endereco, numero: a.numero, bairro: a.bairro,
      cidade: a.cidade, estado: a.estado, observacoes: a.observacoes, ativo: a.ativo,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/educacional/alunos/${editing.id}` : '/api/educacional/alunos'
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
      const res = await fetch(`/api/educacional/alunos/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setConfirmDelete(null)
      await load()
    } catch (e: any) {
      setErro(e.message)
    }
  }

  const filtered = alunos.filter(a => {
    const matchBusca = !filtroBusca ||
      a.nome.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      a.email.toLowerCase().includes(filtroBusca.toLowerCase()) ||
      a.telefone.includes(filtroBusca)
    const matchTurma = !turmaSelecionada || String(a.turma_id) === turmaSelecionada
    return matchBusca && matchTurma
  })

  function calcIdade(dn: string) {
    if (!dn) return null
    const d = new Date(dn)
    const hoje = new Date()
    let idade = hoje.getFullYear() - d.getFullYear()
    if (hoje.getMonth() < d.getMonth() || (hoje.getMonth() === d.getMonth() && hoje.getDate() < d.getDate())) idade--
    return idade
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader icon="🎒" title="Alunos" subtitle={`${alunos.length} aluno${alunos.length !== 1 ? 's' : ''} cadastrado${alunos.length !== 1 ? 's' : ''}`} />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4">
          {erro}
          <button className="ml-3 underline text-sm" onClick={() => setErro('')}>Fechar</button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={filtroBusca}
          onChange={e => setFiltroBusca(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          value={turmaSelecionada}
          onChange={e => setTurmaSelecionada(e.target.value)}
        >
          <option value="">Todas as turmas</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button
          onClick={openNew}
          style={{ backgroundColor: '#E07535' }}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 whitespace-nowrap"
        >
          + Novo Aluno
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">🎒</p>
          <p className="font-semibold">Nenhum aluno encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const idade = calcIdade(a.data_nascimento)
            return (
              <div key={a.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="flex items-center gap-3 px-4 py-3">
                  <div style={{ backgroundColor: '#E07535', color: 'white' }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight truncate">{a.nome}</p>
                    <p style={{ color: '#E07535' }} className="text-xs truncate">
                      {a.turma_nome || 'Sem turma'}
                      {idade !== null ? ` · ${idade} anos` : ''}
                    </p>
                  </div>
                  {!a.ativo && <span className="text-xs bg-gray-600 text-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">Inativo</span>}
                </div>
                <div className="px-4 py-3 space-y-1 text-sm text-gray-600">
                  {a.email && <p>✉️ {a.email}</p>}
                  {a.telefone && <p>📞 {a.telefone}</p>}
                  {a.responsavel && <p>👤 Resp: {a.responsavel}{a.telefone_responsavel ? ` · ${a.telefone_responsavel}` : ''}</p>}
                  {a.cidade && <p>📍 {a.cidade}{a.estado ? ` - ${a.estado}` : ''}</p>}
                  {a.observacoes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.observacoes}</p>}
                </div>
                <div className="px-4 pb-3 flex gap-2">
                  <button onClick={() => openEdit(a)} style={{ color: '#E07535' }} className="text-sm font-medium hover:underline">Editar</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setConfirmDelete(a.id)} className="text-sm text-red-500 font-medium hover:underline">Excluir</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? 'Editar Aluno' : 'Novo Aluno'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Data de Nascimento</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Turma</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.turma_id ?? ''} onChange={e => setForm(f => ({ ...f, turma_id: e.target.value ? Number(e.target.value) : null }))}>
                    <option value="">Sem turma</option>
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Telefone</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Responsável</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tel. Responsável</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.telefone_responsavel} onChange={e => setForm(f => ({ ...f, telefone_responsavel: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Endereço</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Número</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.bairro} onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <select className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-orange-400"
                    value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                    <option value="">UF</option>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Observações</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" rows={3}
                  value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo-aluno" checked={form.ativo}
                  onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="ativo-aluno" className="text-sm text-gray-700">Aluno ativo</label>
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
            <p className="font-semibold mb-1">Excluir aluno?</p>
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
