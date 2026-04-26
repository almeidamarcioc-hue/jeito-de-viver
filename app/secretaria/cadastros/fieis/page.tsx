'use client'

import { useEffect, useState, useRef } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import Modal from '@/components/Modal'
import { Fiel } from '@/types'

const fielVazio: Partial<Fiel> = { nome: '', telefone: '', email: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', observacoes: '' }
const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none'
const iStyle = { borderColor: '#e5e7eb' }
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#C5A059' }
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#e5e7eb' }

export default function CadastroFieisPage() {
  const [fieis, setFieis] = useState<Fiel[]>([])
  const [loading, setLoading] = useState(true)
  const [termoBusca, setTermoBusca] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [fielEditando, setFielEditando] = useState<Partial<Fiel>>(fielVazio)
  const [isNovo, setIsNovo] = useState(false)
  const buscaRef = useRef<NodeJS.Timeout | null>(null)

  const carregar = async (termo?: string) => {
    setLoading(true)
    try {
      const url = termo ? `/api/secretaria/fieis?termo=${encodeURIComponent(termo)}` : '/api/secretaria/fieis'
      const res = await fetch(url)
      const data = await res.json()
      setFieis(Array.isArray(data) ? data : [])
    } catch { setErro('Erro ao carregar fiéis.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const res = await fetch('/api/secretaria/fieis')
        const data = await res.json()
        setFieis(Array.isArray(data) ? data : [])
      } finally { setLoading(false) }
    }
    init()
  }, [])

  const handleBusca = (valor: string) => {
    setTermoBusca(valor)
    if (buscaRef.current) clearTimeout(buscaRef.current)
    buscaRef.current = setTimeout(async () => {
      const url = valor ? `/api/secretaria/fieis?termo=${encodeURIComponent(valor)}` : '/api/secretaria/fieis'
      const res = await fetch(url)
      const data = await res.json()
      setFieis(Array.isArray(data) ? data : [])
    }, 400)
  }

  const abrirNovo = () => { setFielEditando({ ...fielVazio }); setIsNovo(true); setModalAberto(true); setSucesso(''); setErro('') }
  const abrirEditar = (fiel: Fiel) => { setFielEditando({ ...fiel }); setIsNovo(false); setModalAberto(true); setSucesso(''); setErro('') }
  const fecharModal = () => { setModalAberto(false); setFielEditando({ ...fielVazio }) }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fielEditando.nome?.trim()) { setErro('Nome é obrigatório.'); return }
    setSubmitting(true); setErro(''); setSucesso('')
    try {
      if (isNovo) {
        const res = await fetch('/api/secretaria/fieis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fielEditando) })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Erro ${res.status}`) }
      } else {
        const res = await fetch(`/api/secretaria/fieis/${fielEditando.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fielEditando) })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Erro ${res.status}`) }
      }
      fecharModal()
      const res2 = await fetch('/api/secretaria/fieis')
      setFieis(Array.isArray(await res2.json()) ? await res2.json() : [])
      setSucesso(isNovo ? 'Fiel cadastrado com sucesso!' : 'Cadastro atualizado!')
    } catch (e: unknown) { setErro(e instanceof Error ? e.message : 'Erro ao salvar.') }
    finally { setSubmitting(false) }
  }

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir este cadastro?')) return
    await fetch(`/api/secretaria/fieis/${id}`, { method: 'DELETE' })
    setSucesso('Cadastro excluído.')
    const res = await fetch('/api/secretaria/fieis')
    setFieis(Array.isArray(await res.json()) ? await res.json() : [])
  }

  return (
    <div>
      <PageHeader icon="🙍" title="Cadastro de Fiéis" subtitle="Membros e visitantes da igreja" />

      {erro && !modalAberto && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>}
      {sucesso && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{sucesso}</div>}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <input type="text" value={termoBusca} onChange={e => handleBusca(e.target.value)} placeholder="Buscar por nome ou telefone..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ borderColor: '#e5e7eb', minWidth: 180 }}
          onFocus={e => { e.target.style.borderColor = '#C5A059' }} onBlur={e => { e.target.style.borderColor = '#e5e7eb' }} />
        <button onClick={abrirNovo} style={{ backgroundColor: '#002347', color: '#fff' }} className="px-5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap">➕ Novo Fiel</button>
        <span className="text-sm text-gray-500">{fieis.length} cadastro(s)</span>
      </div>

      {loading ? <LoadingSpinner /> : fieis.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-5xl mb-3">🙍</p>
          <p className="font-semibold">{termoBusca ? 'Nenhum resultado.' : 'Nenhum fiel cadastrado.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#002347' }}>
                <th style={{ color: '#C5A059' }} className="px-4 py-3 text-left font-semibold">Nome</th>
                <th style={{ color: '#C5A059' }} className="px-4 py-3 text-left font-semibold hidden sm:table-cell">Telefone</th>
                <th style={{ color: '#C5A059' }} className="px-4 py-3 text-left font-semibold hidden md:table-cell">Email</th>
                <th style={{ color: '#C5A059' }} className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fieis.map((fiel, idx) => (
                <tr key={fiel.id} className="border-b hover:bg-gray-50" style={{ borderColor: '#f3f4f6', backgroundColor: idx % 2 === 1 ? '#fafafa' : undefined }}>
                  <td className="px-4 py-3 font-semibold text-gray-800">{fiel.nome}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fiel.telefone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{fiel.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => abrirEditar(fiel)} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>✏️ Editar</button>
                      <button onClick={() => handleExcluir(fiel.id)} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalAberto} onClose={fecharModal} title={isNovo ? 'Novo Fiel' : 'Editar Fiel'}>
        <form onSubmit={handleSalvar} className="space-y-4">
          {erro && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>}
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label><input type="text" value={fielEditando.nome ?? ''} onChange={e => setFielEditando(f => ({ ...f, nome: e.target.value }))} required className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label><input type="tel" value={fielEditando.telefone ?? ''} onChange={e => setFielEditando(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Email</label><input type="email" value={fielEditando.email ?? ''} onChange={e => setFielEditando(f => ({ ...f, email: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Endereço</label><input type="text" value={fielEditando.endereco ?? ''} onChange={e => setFielEditando(f => ({ ...f, endereco: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Número</label><input type="text" value={fielEditando.numero ?? ''} onChange={e => setFielEditando(f => ({ ...f, numero: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label><input type="text" value={fielEditando.bairro ?? ''} onChange={e => setFielEditando(f => ({ ...f, bairro: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label><input type="text" value={fielEditando.cidade ?? ''} onChange={e => setFielEditando(f => ({ ...f, cidade: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label><input type="text" value={fielEditando.estado ?? ''} onChange={e => setFielEditando(f => ({ ...f, estado: e.target.value.toUpperCase().slice(0,2) }))} placeholder="SP" maxLength={2} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          </div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Observações</label><textarea value={fielEditando.observacoes ?? ''} onChange={e => setFielEditando(f => ({ ...f, observacoes: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting} style={{ backgroundColor: '#002347', color: '#fff' }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">{submitting ? 'Salvando...' : '💾 Salvar'}</button>
            <button type="button" onClick={fecharModal} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700">Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
