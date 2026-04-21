'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import Modal from '@/components/Modal'
import { Pastor, Configuracoes } from '@/types'

const configVazia: Configuracoes = {
  id: 1,
  horas_lembrete: 24,
  msg_confirmacao: '',
  msg_lembrete: '',
  msg_cancelamento: '',
  msg_remarcacao: '',
  msg_pastor: '',
}

const pastorVazio: Partial<Pastor> = { nome: '', telefone: '', endereco: '', imagem: '' }

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes>(configVazia)
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  // Modal de pastor
  const [modalPastor, setModalPastor] = useState(false)
  const [pastorEditando, setPastorEditando] = useState<Partial<Pastor>>(pastorVazio)
  const [isNovoPastor, setIsNovoPastor] = useState(false)
  const [submittingPastor, setSubmittingPastor] = useState(false)
  const [erroPastor, setErroPastor] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const [resConfig, resPast] = await Promise.all([
        fetch('/api/configuracoes'),
        fetch('/api/pastores'),
      ])
      const cfg = await resConfig.json()
      const pasts = await resPast.json()
      if (cfg && cfg.id) setConfig(cfg)
      setPastores(Array.isArray(pasts) ? pasts : [])
    } catch {
      setErro('Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setSucesso('')
    setErro('')
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSucesso('Configurações salvas com sucesso!')
    } catch {
      setErro('Erro ao salvar configurações.')
    } finally {
      setSalvando(false)
    }
  }

  const abrirNovoPastor = () => {
    setPastorEditando({ ...pastorVazio })
    setIsNovoPastor(true)
    setModalPastor(true)
    setErroPastor('')
  }

  const abrirEditarPastor = (p: Pastor) => {
    setPastorEditando({ ...p })
    setIsNovoPastor(false)
    setModalPastor(true)
    setErroPastor('')
  }

  const fecharModalPastor = () => {
    setModalPastor(false)
    setPastorEditando({ ...pastorVazio })
    setErroPastor('')
  }

  const handleSalvarPastor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pastorEditando.nome?.trim()) {
      setErroPastor('Nome é obrigatório.')
      return
    }
    setSubmittingPastor(true)
    setErroPastor('')
    try {
      if (isNovoPastor) {
        await fetch('/api/pastores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pastorEditando),
        })
      } else {
        await fetch(`/api/pastores/${pastorEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pastorEditando),
        })
      }
      fecharModalPastor()
      await carregar()
    } catch {
      setErroPastor('Erro ao salvar pastor.')
    } finally {
      setSubmittingPastor(false)
    }
  }

  const handleExcluirPastor = async (id: number) => {
    if (!confirm('Excluir este pastor? Só é possível se não houver agendamentos ativos.')) return
    try {
      const res = await fetch(`/api/pastores/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Não foi possível excluir.')
        return
      }
      await carregar()
    } catch {
      alert('Erro ao excluir pastor.')
    }
  }

  if (loading) return <LoadingSpinner />

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
  const inputStyle = { borderColor: '#e5e7eb' }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = '#C5A059' }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { e.target.style.borderColor = '#e5e7eb' }

  return (
    <div>
      <PageHeader icon="⚙️" title="Configurações" subtitle="Pastores, mensagens e preferências" />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>
      )}
      {sucesso && (
        <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{sucesso}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pastores */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#002347' }} className="font-bold text-base">Pastores</h2>
            <button
              onClick={abrirNovoPastor}
              style={{ backgroundColor: '#002347', color: '#fff' }}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold"
              onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#C5A059'; (e.target as HTMLButtonElement).style.color = '#002347' }}
              onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#002347'; (e.target as HTMLButtonElement).style.color = '#ffffff' }}
            >
              ➕ Novo
            </button>
          </div>

          {pastores.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum pastor cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {pastores.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}
                >
                  {p.imagem ? (
                    <img
                      src={p.imagem}
                      alt={p.nome}
                      className="w-9 h-9 rounded-full object-cover border-2"
                      style={{ borderColor: '#C5A059' }}
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: '#C5A059', color: '#002347' }}
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    >
                      {p.nome.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{p.nome}</p>
                    {p.telefone && <p className="text-xs text-gray-500">{p.telefone}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => abrirEditarPastor(p)}
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleExcluirPastor(p.id)}
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configurações gerais */}
        <form onSubmit={handleSalvarConfig} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 style={{ color: '#002347' }} className="font-bold text-base mb-4">Configurações de Lembretes</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Horas de antecedência para lembrete
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={config.horas_lembrete}
              onChange={(e) => setConfig((c) => ({ ...c, horas_lembrete: Number(e.target.value) }))}
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <p className="text-xs text-gray-400 mt-1">Padrão: 24 horas antes do agendamento.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem de Confirmação</label>
            <p className="text-xs text-gray-400 mb-1">Variáveis: {'{nome}'}, {'{pastor}'}, {'{data}'}, {'{hora}'}, {'{assunto}'}</p>
            <textarea
              value={config.msg_confirmacao}
              onChange={(e) => setConfig((c) => ({ ...c, msg_confirmacao: e.target.value }))}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem de Lembrete</label>
            <textarea
              value={config.msg_lembrete}
              onChange={(e) => setConfig((c) => ({ ...c, msg_lembrete: e.target.value }))}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem de Cancelamento</label>
            <textarea
              value={config.msg_cancelamento}
              onChange={(e) => setConfig((c) => ({ ...c, msg_cancelamento: e.target.value }))}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem de Remarcação</label>
            <textarea
              value={config.msg_remarcacao}
              onChange={(e) => setConfig((c) => ({ ...c, msg_remarcacao: e.target.value }))}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Mensagem para o Pastor</label>
            <p className="text-xs text-gray-400 mb-1">Variáveis: {'{nome_fiel}'}, {'{telefone}'}, {'{assunto}'}, {'{data}'}, {'{hora}'}</p>
            <textarea
              value={config.msg_pastor}
              onChange={(e) => setConfig((c) => ({ ...c, msg_pastor: e.target.value }))}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <button
            type="submit"
            disabled={salvando}
            style={{ backgroundColor: '#002347', color: '#fff' }}
            className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#C5A059'; (e.target as HTMLButtonElement).style.color = '#002347' }}
            onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#002347'; (e.target as HTMLButtonElement).style.color = '#ffffff' }}
          >
            {salvando ? 'Salvando...' : '💾 Salvar Configurações'}
          </button>
        </form>
      </div>

      {/* Modal Pastor */}
      <Modal
        isOpen={modalPastor}
        onClose={fecharModalPastor}
        title={isNovoPastor ? 'Novo Pastor' : 'Editar Pastor'}
      >
        <form onSubmit={handleSalvarPastor} className="space-y-4">
          {erroPastor && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm">{erroPastor}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={pastorEditando.nome ?? ''}
              onChange={(e) => setPastorEditando((p) => ({ ...p, nome: e.target.value }))}
              required
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label>
            <input
              type="tel"
              value={pastorEditando.telefone ?? ''}
              onChange={(e) => setPastorEditando((p) => ({ ...p, telefone: e.target.value }))}
              placeholder="(11) 99999-9999"
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Endereço</label>
            <input
              type="text"
              value={pastorEditando.endereco ?? ''}
              onChange={(e) => setPastorEditando((p) => ({ ...p, endereco: e.target.value }))}
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">URL da Imagem</label>
            <input
              type="url"
              value={pastorEditando.imagem ?? ''}
              onChange={(e) => setPastorEditando((p) => ({ ...p, imagem: e.target.value }))}
              placeholder="https://..."
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submittingPastor}
              style={{ backgroundColor: '#002347', color: '#fff' }}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#C5A059'; (e.target as HTMLButtonElement).style.color = '#002347' }}
              onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#002347'; (e.target as HTMLButtonElement).style.color = '#ffffff' }}
            >
              {submittingPastor ? 'Salvando...' : '💾 Salvar'}
            </button>
            <button
              type="button"
              onClick={fecharModalPastor}
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
