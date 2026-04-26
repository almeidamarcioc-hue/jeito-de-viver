'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Professor } from '@/types'

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const empty: Omit<Professor, 'id' | 'data_criacao'> = {
  nome: '', email: '', telefone: '', disciplina: '',
  endereco: '', numero: '', bairro: '', cidade: '', estado: '', observacoes: '',
}

export default function ProfessoresPage() {
  const [professores, setProfessores] = useState<Professor[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Professor | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  async function load() {
    try {
      setLoading(true)
      const res = await fetch('/api/educacional/professores')
      if (!res.ok) throw new Error('Erro ao carregar professores')
      setProfessores(await res.json())
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

  function openEdit(p: Professor) {
    setEditing(p)
    setForm({
      nome: p.nome, email: p.email, telefone: p.telefone, disciplina: p.disciplina,
      endereco: p.endereco, numero: p.numero, bairro: p.bairro,
      cidade: p.cidade, estado: p.estado, observacoes: p.observacoes,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/educacional/professores/${editing.id}` : '/api/educacional/professores'
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
      const res = await fetch(`/api/educacional/professores/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setConfirmDelete(null)
      await load()
    } catch (e: any) {
      setErro(e.message)
    }
  }

  const filtered = professores.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.disciplina.toLowerCase().includes(busca.toLowerCase()) ||
    p.email.toLowerCase().includes(busca.toLowerCase())
  )

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader icon="👨‍🏫" title="Professores" subtitle={`${professores.length} professor${professores.length !== 1 ? 'es' : ''} cadastrado${professores.length !== 1 ? 's' : ''}`} />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4">
          {erro}
          <button className="ml-3 underline text-sm" onClick={() => setErro('')}>Fechar</button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
          placeholder="Buscar por nome, disciplina ou e-mail..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <button
          onClick={openNew}
          style={{ backgroundColor: '#E07535' }}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 whitespace-nowrap"
        >
          + Novo Professor
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">👨‍🏫</p>
          <p className="font-semibold">Nenhum professor encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="flex items-center gap-3 px-4 py-3">
                <div style={{ backgroundColor: '#E07535', color: 'white' }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight truncate">{p.nome}</p>
                  <p style={{ color: '#E07535' }} className="text-xs truncate">{p.disciplina || 'Sem disciplina'}</p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-1 text-sm text-gray-600">
                {p.email && <p>✉️ {p.email}</p>}
                {p.telefone && <p>📞 {p.telefone}</p>}
                {p.cidade && <p>📍 {p.cidade}{p.estado ? ` - ${p.estado}` : ''}</p>}
                {p.observacoes && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.observacoes}</p>}
              </div>
              <div className="px-4 pb-3 flex gap-2">
                <button onClick={() => openEdit(p)} style={{ color: '#E07535' }} className="text-sm font-medium hover:underline">Editar</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setConfirmDelete(p.id)} className="text-sm text-red-500 font-medium hover:underline">Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }} className="px-5 py-4 flex items-center justify-between">
              <h2 className="text-white font-semibold">{editing ? 'Editar Professor' : 'Novo Professor'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="Nome *" value={form.nome} onChange={v => setForm(f => ({ ...f, nome: v }))} />
              <Field label="Disciplina" value={form.disciplina} onChange={v => setForm(f => ({ ...f, disciplina: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
                <Field label="Telefone" value={form.telefone} onChange={v => setForm(f => ({ ...f, telefone: v }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Field label="Endereço" value={form.endereco} onChange={v => setForm(f => ({ ...f, endereco: v }))} /></div>
                <Field label="Número" value={form.numero} onChange={v => setForm(f => ({ ...f, numero: v }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Bairro" value={form.bairro} onChange={v => setForm(f => ({ ...f, bairro: v }))} />
                <Field label="Cidade" value={form.cidade} onChange={v => setForm(f => ({ ...f, cidade: v }))} />
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
            <p className="font-semibold mb-1">Excluir professor?</p>
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}
