'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Usuario {
  id: number
  usuario: string
  nome: string
  role: string
  modulos: string
  ativo: boolean
}

const MODULOS_OPTS = [
  { value: '*', label: 'Todos os módulos' },
  { value: 'secretaria', label: 'Secretaria' },
  { value: 'educacional', label: 'Educacional' },
  { value: 'secretaria,educacional', label: 'Secretaria + Educacional' },
]

const empty = { usuario: '', nome: '', senha: '', role: 'usuario', modulos: 'secretaria', ativo: true }

export default function ConfiguracoesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usuarios')
      if (!res.ok) throw new Error('Erro ao carregar usuários')
      setUsuarios(await res.json())
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

  function openEdit(u: Usuario) {
    setEditing(u)
    setForm({ usuario: u.usuario, nome: u.nome, senha: '', role: u.role, modulos: u.modulos, ativo: u.ativo })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.usuario.trim() || !form.nome.trim()) return
    if (!editing && !form.senha.trim()) { setErro('Senha é obrigatória para novos usuários.'); return }
    setSaving(true); setErro('')
    try {
      const method = editing ? 'PUT' : 'POST'
      const url = editing ? `/api/admin/usuarios/${editing.id}` : '/api/admin/usuarios'
      const body: Record<string, any> = { usuario: form.usuario, nome: form.nome, role: form.role, modulos: form.modulos, ativo: form.ativo }
      if (form.senha.trim()) body.senha = form.senha
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
      setShowModal(false)
      setSucesso(editing ? 'Usuário atualizado.' : 'Usuário criado com sucesso.')
      setTimeout(() => setSucesso(''), 3000)
      await load()
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setConfirmDelete(null)
      await load()
    } catch (e: any) {
      setErro(e.message)
    }
  }

  const roleLabel: Record<string, string> = { admin: 'Admin', usuario: 'Usuário' }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1F1F4D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1F1F4D 0%, #2E2E66 100%)', padding: '32px 16px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-xl font-bold">Configurações</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Gerenciamento de usuários e acesso</p>
          </div>
          <a href="/" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>← Voltar ao workspace</a>
        </div>

        {erro && !showModal && (
          <div className="bg-red-900 border border-red-600 text-red-200 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>
        )}
        {sucesso && (
          <div className="bg-green-900 border border-green-600 text-green-200 rounded-lg px-4 py-3 mb-4 text-sm">{sucesso}</div>
        )}

        <div className="bg-white bg-opacity-10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Usuários do Sistema</h2>
            <button onClick={openNew} style={{ backgroundColor: '#4848A8' }} className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              + Novo Usuário
            </button>
          </div>

          {usuarios.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <p className="text-3xl mb-2">👤</p>
              <p className="text-sm">Nenhum usuário cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {usuarios.map(u => (
                <div key={u.id} className="bg-white bg-opacity-10 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div style={{ backgroundColor: '#4848A8' }} className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {u.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold text-sm">{u.nome}</p>
                      <span style={{ backgroundColor: u.role === 'admin' ? '#4848A8' : '#374151' }} className="text-xs text-white px-2 py-0.5 rounded-full">{roleLabel[u.role] ?? u.role}</span>
                      {!u.ativo && <span className="text-xs bg-red-800 text-red-200 px-2 py-0.5 rounded-full">Inativo</span>}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>@{u.usuario} · {MODULOS_OPTS.find(m => m.value === u.modulos)?.label ?? u.modulos}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(u)} style={{ color: '#a5b4fc' }} className="text-xs font-medium hover:underline">Editar</button>
                    <button onClick={() => setConfirmDelete(u.id)} className="text-xs text-red-400 font-medium hover:underline">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div style={{ backgroundColor: '#1F1F4D' }} className="px-5 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-white font-semibold">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              {erro && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome Completo *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Usuário (login) *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={form.usuario} disabled={!!editing}
                  onChange={e => setForm(f => ({ ...f, usuario: e.target.value.toLowerCase().replace(/\s/g, '') }))} />
                {editing && <p className="text-xs text-gray-400 mt-0.5">O nome de usuário não pode ser alterado.</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Senha {editing ? '(deixe vazio para não alterar)' : '*'}</label>
                <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Perfil</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="usuario">Usuário</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Módulos</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                    value={form.modulos} onChange={e => setForm(f => ({ ...f, modulos: e.target.value }))}>
                    {MODULOS_OPTS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ativo-user" checked={form.ativo}
                  onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
                <label htmlFor="ativo-user" className="text-sm text-gray-700">Usuário ativo</label>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={() => { setShowModal(false); setErro('') }} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.usuario.trim() || !form.nome.trim()}
                style={{ backgroundColor: '#4848A8' }}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="font-semibold mb-1">Excluir usuário?</p>
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
