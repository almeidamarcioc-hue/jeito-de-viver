'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import Badge from '@/components/Badge'
import LoadingSpinner from '@/components/LoadingSpinner'
import { AgendamentoPastoral, Pastor, Configuracoes } from '@/types'

const HORARIOS = Array.from({ length: 22 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0')
  const m = String(totalMin % 60).padStart(2, '0')
  return `${h}:${m}`
})

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function abrirWhatsApp(telefone: string, mensagem: string) {
  const num = telefone.replace(/\D/g, '')
  window.open(`https://wa.me/${num.startsWith('55') ? num : '55' + num}?text=${encodeURIComponent(mensagem)}`, '_blank')
}

export default function GerenciarAgendaPage() {
  const [agendamentos, setAgendamentos] = useState<AgendamentoPastoral[]>([])
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [filtroP, setFiltroP] = useState('')
  const [filtroS, setFiltroS] = useState('')
  const [filtroA, setFiltroA] = useState('')
  const [filtroB, setFiltroB] = useState('')

  const [selecionado, setSelecionado] = useState<AgendamentoPastoral | null>(null)
  const [nomeFiel, setNomeFiel] = useState('')
  const [telefone, setTelefone] = useState('')
  const [assunto, setAssunto] = useState('')
  const [pastorId, setPastorId] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [status, setStatus] = useState('')
  const [recorrencia, setRecorrencia] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const carregarAgendamentos = async () => {
    setLoading(true)
    try {
      let url = '/api/secretaria/agendamentos?'
      if (filtroP) url += `pastorId=${filtroP}&`
      if (filtroS) url += `status=${filtroS}&`
      if (filtroA) url += `dataInicio=${filtroA}&`
      if (filtroB) url += `dataFim=${filtroB}&`
      const res = await fetch(url)
      const data = await res.json()
      setAgendamentos(Array.isArray(data) ? data : [])
    } catch { setErro('Erro ao carregar agendamentos') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/secretaria/pastores').then(r => r.json()),
      fetch('/api/secretaria/configuracoes').then(r => r.json()),
    ]).then(([pasts, cfg]) => {
      setPastores(Array.isArray(pasts) ? pasts : [])
      setConfig(cfg?.id ? cfg : null)
    })
    carregarAgendamentos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selecionar = (ag: AgendamentoPastoral) => {
    setSelecionado(ag)
    setNomeFiel(ag.nome_fiel)
    setTelefone(ag.telefone)
    setAssunto(ag.assunto)
    setPastorId(String(ag.pastor_id))
    setData(ag.data)
    setHora(ag.hora)
    setStatus(ag.status)
    setRecorrencia(ag.recorrencia || 'nenhuma')
    setObservacoes(ag.observacoes || '')
    setSucesso('')
    setErro('')
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selecionado) return
    setSubmitting(true)
    setErro('')
    setSucesso('')
    const oldStatus = selecionado.status
    const oldHora = selecionado.hora
    const oldData = selecionado.data
    try {
      const res = await fetch(`/api/secretaria/agendamentos/${selecionado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome_fiel: nomeFiel, telefone, assunto, pastor_id: Number(pastorId), data, hora, status, recorrencia, observacoes }),
      })
      if (!res.ok) throw new Error('Erro ao atualizar')
      setSucesso('Agendamento atualizado!')
      if (status === 'cancelado' && oldStatus !== 'cancelado') {
        const msg = (config?.msg_cancelamento || `Olá ${nomeFiel}, seu agendamento foi cancelado.`).replace('{nome_fiel}', nomeFiel).replace('{data}', data).replace('{hora}', hora)
        abrirWhatsApp(telefone, msg)
      }
      if ((data !== oldData || hora !== oldHora) && status !== 'cancelado') {
        const msg = (config?.msg_remarcacao || `Olá ${nomeFiel}, seu agendamento foi remarcado para ${data} às ${hora}.`).replace('{nome_fiel}', nomeFiel).replace('{data}', data).replace('{hora}', hora)
        abrirWhatsApp(telefone, msg)
      }
      await carregarAgendamentos()
      setSelecionado(null)
    } catch (e: any) {
      setErro(e.message)
    } finally { setSubmitting(false) }
  }

  const handleExcluir = async () => {
    if (!selecionado || !confirm('Excluir este agendamento?')) return
    try {
      await fetch(`/api/secretaria/agendamentos/${selecionado.id}`, { method: 'DELETE' })
      setSucesso('Agendamento excluído.')
      setSelecionado(null)
      await carregarAgendamentos()
    } catch (e: any) { setErro(e.message) }
  }

  return (
    <div>
      <PageHeader icon="📋" title="Gerenciar Agenda" subtitle="Editar e gerenciar agendamentos" />

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Pastor</label>
            <select value={filtroP} onChange={e => setFiltroP(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none" style={{ borderColor: '#e5e7eb' }}>
              <option value="">Todos</option>
              {pastores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select value={filtroS} onChange={e => setFiltroS(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none" style={{ borderColor: '#e5e7eb' }}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="confirmado">Confirmado</option>
              <option value="cancelado">Cancelado</option>
              <option value="remarcado">Remarcado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">De</label>
            <input type="date" value={filtroA} onChange={e => setFiltroA(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none" style={{ borderColor: '#e5e7eb' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Até</label>
            <input type="date" value={filtroB} onChange={e => setFiltroB(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none" style={{ borderColor: '#e5e7eb' }} />
          </div>
        </div>
        <button onClick={carregarAgendamentos} style={{ backgroundColor: '#002347', color: '#fff' }} className="mt-3 px-5 py-2 rounded-lg text-sm font-semibold">🔍 Filtrar</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 style={{ color: '#002347' }} className="font-bold mb-3 text-sm">{agendamentos.length} agendamento(s)</h2>
          {loading ? <LoadingSpinner /> : agendamentos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="overflow-y-auto max-h-[60vh] space-y-1">
              {agendamentos.map(ag => (
                <button key={ag.id} onClick={() => selecionar(ag)}
                  className="w-full text-left px-3 py-2 rounded-lg border hover:bg-gray-50 transition-colors text-sm"
                  style={{ borderColor: selecionado?.id === ag.id ? '#C5A059' : '#e5e7eb', backgroundColor: selecionado?.id === ag.id ? '#fffbea' : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{ag.nome_fiel}</span>
                    <Badge status={ag.status} />
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                    <span>{ag.data.split('-').reverse().join('/')}</span>
                    <span>{ag.hora}</span>
                    <span className="truncate">{ag.pastor_nome || ''}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          {!selecionado ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <span className="text-4xl mb-3">📝</span>
              <p className="text-sm">Selecione um agendamento para editar</p>
            </div>
          ) : (
            <form onSubmit={handleSalvar} className="space-y-3">
              <h2 style={{ color: '#002347' }} className="font-bold text-sm mb-2">Editando: {selecionado.nome_fiel}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Nome *</label>
                  <input type="text" value={nomeFiel} onChange={e => setNomeFiel(e.target.value)} required className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none" style={{ borderColor: '#e5e7eb' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Telefone *</label>
                  <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} required className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none" style={{ borderColor: '#e5e7eb' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Assunto *</label>
                <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} required className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none" style={{ borderColor: '#e5e7eb' }} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Pastor(a)</label>
                  <select value={pastorId} onChange={e => setPastorId(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none" style={{ borderColor: '#e5e7eb' }}>
                    {pastores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none" style={{ borderColor: '#e5e7eb' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hora</label>
                  <select value={hora} onChange={e => setHora(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none" style={{ borderColor: '#e5e7eb' }}>
                    {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none" style={{ borderColor: '#e5e7eb' }}>
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                    <option value="cancelado">Cancelado</option>
                    <option value="remarcado">Remarcado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Recorrência</label>
                  <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none" style={{ borderColor: '#e5e7eb' }}>
                    <option value="nenhuma">Nenhuma</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" style={{ borderColor: '#e5e7eb' }} />
              </div>
              {erro && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-xs">{erro}</div>}
              {sucesso && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-3 py-2 text-xs">{sucesso}</div>}
              <div className="flex gap-2">
                <button type="submit" disabled={submitting} style={{ backgroundColor: '#002347', color: '#fff' }} className="flex-1 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
                  {submitting ? 'Salvando...' : '💾 Salvar'}
                </button>
                <button type="button" onClick={handleExcluir} style={{ backgroundColor: '#ef4444', color: '#fff' }} className="px-4 py-2 rounded-lg text-sm font-semibold">🗑️</button>
                <button type="button" onClick={() => setSelecionado(null)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700">✕</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
