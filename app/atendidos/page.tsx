'use client'

import { useEffect, useState, useRef } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import Modal from '@/components/Modal'
import { Fiel } from '@/types'

function abrirWhatsApp(telefone: string, mensagem: string) {
  const num = telefone.replace(/\D/g, '')
  const url = `https://wa.me/${num.startsWith('55') ? num : '55' + num}?text=${encodeURIComponent(mensagem)}`
  window.open(url, '_blank')
}

const fielVazio: Partial<Fiel> = { nome: '', telefone: '', email: '', endereco: '', observacoes: '' }

export default function AtendidosPage() {
  const [fieis, setFieis] = useState<Fiel[]>([])
  const [loading, setLoading] = useState(true)
  const [termoBusca, setTermoBusca] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal de edição / criação
  const [modalAberto, setModalAberto] = useState(false)
  const [fielEditando, setFielEditando] = useState<Partial<Fiel>>(fielVazio)
  const [isNovo, setIsNovo] = useState(false)

  const buscaRef = useRef<NodeJS.Timeout | null>(null)

  const carregar = async (termo?: string) => {
    setLoading(true)
    try {
      const url = termo ? `/api/fieis?termo=${encodeURIComponent(termo)}` : '/api/fieis'
      const res = await fetch(url)
      const data = await res.json()
      setFieis(Array.isArray(data) ? data : [])
    } catch {
      setErro('Erro ao carregar cadastro de fiéis')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const handleBusca = (valor: string) => {
    setTermoBusca(valor)
    if (buscaRef.current) clearTimeout(buscaRef.current)
    buscaRef.current = setTimeout(() => carregar(valor), 400)
  }

  const abrirNovo = () => {
    setFielEditando({ ...fielVazio })
    setIsNovo(true)
    setModalAberto(true)
    setSucesso('')
    setErro('')
  }

  const abrirEditar = (fiel: Fiel) => {
    setFielEditando({ ...fiel })
    setIsNovo(false)
    setModalAberto(true)
    setSucesso('')
    setErro('')
  }

  const fecharModal = () => {
    setModalAberto(false)
    setFielEditando({ ...fielVazio })
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fielEditando.nome?.trim()) {
      setErro('Nome é obrigatório.')
      return
    }
    setSubmitting(true)
    setErro('')
    setSucesso('')
    try {
      if (isNovo) {
        await fetch('/api/fieis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fielEditando),
        })
        setSucesso('Fiel cadastrado com sucesso!')
      } else {
        await fetch(`/api/fieis/${fielEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fielEditando),
        })
        setSucesso('Cadastro atualizado!')
      }
      fecharModal()
      await carregar(termoBusca)
    } catch {
      setErro('Erro ao salvar cadastro.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir este cadastro permanentemente?')) return
    try {
      await fetch(`/api/fieis/${id}`, { method: 'DELETE' })
      setSucesso('Cadastro excluído.')
      await carregar(termoBusca)
    } catch {
      setErro('Erro ao excluir.')
    }
  }

  return (
    <div>
      <PageHeader icon="🙍" title="Fiéis Atendidos" subtitle="Cadastro de membros e visitantes" />

      {erro && !modalAberto && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>
      )}
      {sucesso && (
        <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{sucesso}</div>
      )}

      {/* Barra de busca e botão */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={termoBusca}
          onChange={(e) => handleBusca(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: '#e5e7eb', minWidth: 200 }}
          onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
        <button
          onClick={abrirNovo}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="px-5 py-2 rounded-lg text-sm font-semibold"
          onMouseOver={(e) => {
            ;(e.target as HTMLButtonElement).style.backgroundColor = '#C5A059'
            ;(e.target as HTMLButtonElement).style.color = '#002347'
          }}
          onMouseOut={(e) => {
            ;(e.target as HTMLButtonElement).style.backgroundColor = '#002347'
            ;(e.target as HTMLButtonElement).style.color = '#ffffff'
          }}
        >
          ➕ Novo Cadastro
        </button>
        <span className="text-sm text-gray-500">
          {fieis.length} cadastro(s)
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <LoadingSpinner />
      ) : fieis.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-5xl mb-3">🙍</p>
          <p className="font-semibold">
            {termoBusca ? 'Nenhum resultado encontrado.' : 'Nenhum fiel cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
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
                <tr
                  key={fiel.id}
                  className="border-b hover:bg-gray-50 transition-colors"
                  style={{ borderColor: '#f3f4f6', backgroundColor: idx % 2 === 1 ? '#fafafa' : undefined }}
                >
                  <td className="px-4 py-3 font-semibold text-gray-800">{fiel.nome}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{fiel.telefone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{fiel.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {fiel.telefone && (
                        <button
                          onClick={() => abrirWhatsApp(fiel.telefone, `Olá ${fiel.nome}!`)}
                          className="px-2 py-1 rounded text-xs font-semibold"
                          style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                          title="Enviar WhatsApp"
                        >
                          📱
                        </button>
                      )}
                      <button
                        onClick={() => abrirEditar(fiel)}
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(fiel.id)}
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Edição / Criação */}
      <Modal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={isNovo ? 'Novo Cadastro de Fiel' : 'Editar Cadastro'}
      >
        <form onSubmit={handleSalvar} className="space-y-4">
          {erro && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={fielEditando.nome ?? ''}
              onChange={(e) => setFielEditando((f) => ({ ...f, nome: e.target.value }))}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
            <input
              type="tel"
              value={fielEditando.telefone ?? ''}
              onChange={(e) => setFielEditando((f) => ({ ...f, telefone: e.target.value }))}
              placeholder="(11) 99999-9999"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={fielEditando.email ?? ''}
              onChange={(e) => setFielEditando((f) => ({ ...f, email: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço</label>
            <input
              type="text"
              value={fielEditando.endereco ?? ''}
              onChange={(e) => setFielEditando((f) => ({ ...f, endereco: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Observações</label>
            <textarea
              value={fielEditando.observacoes ?? ''}
              onChange={(e) => setFielEditando((f) => ({ ...f, observacoes: e.target.value }))}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              style={{ backgroundColor: '#002347', color: '#fff' }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              onMouseOver={(e) => {
                ;(e.target as HTMLButtonElement).style.backgroundColor = '#C5A059'
                ;(e.target as HTMLButtonElement).style.color = '#002347'
              }}
              onMouseOut={(e) => {
                ;(e.target as HTMLButtonElement).style.backgroundColor = '#002347'
                ;(e.target as HTMLButtonElement).style.color = '#ffffff'
              }}
            >
              {submitting ? 'Salvando...' : '💾 Salvar'}
            </button>
            <button
              type="button"
              onClick={fecharModal}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
