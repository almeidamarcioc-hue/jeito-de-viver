'use client'

import { useEffect, useState, useRef } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Pastor, Fiel, Configuracoes } from '@/types'
import { preencherTemplate, abrirWhatsApp as waOpen } from '@/lib/whatsapp'

const TODOS_HORARIOS = Array.from({ length: 22 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0')
  const m = String(totalMin % 60).padStart(2, '0')
  return `${h}:${m}`
})

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function horariosDisponiveis(dataSelecionada: string): string[] {
  if (dataSelecionada !== hoje()) return TODOS_HORARIOS
  const agora = new Date()
  const horaAtual = agora.getHours() * 60 + agora.getMinutes()
  return TODOS_HORARIOS.filter(h => {
    const [hh, mm] = h.split(':').map(Number)
    return hh * 60 + mm > horaAtual
  })
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n * 7); return d.toISOString().slice(0, 10)
}
function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10)
}

export default function NovoAgendamentoPage() {
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [notifWA, setNotifWA] = useState<{ label: string; telefone: string; mensagem: string; aviso?: string; enviado: boolean }[]>([])

  const [termoBusca, setTermoBusca] = useState('')
  const [fieisBusca, setFieisBusca] = useState<Fiel[]>([])
  const [buscando, setBuscando] = useState(false)
  const buscaRef = useRef<NodeJS.Timeout | null>(null)

  const [nomeFiel, setNomeFiel] = useState('')
  const [telefone, setTelefone] = useState('')
  const [assunto, setAssunto] = useState('')
  const [pastorId, setPastorId] = useState('')
  const [data, setData] = useState(hoje())
  const [hora, setHora] = useState(() => horariosDisponiveis(hoje())[0] ?? '08:00')
  const [duracao, setDuracao] = useState(30)
  const [status, setStatus] = useState('pendente')
  const [recorrencia, setRecorrencia] = useState('nenhuma')
  const [observacoes, setObservacoes] = useState('')
  const [enviarConfirmacao, setEnviarConfirmacao] = useState(false)
  const [avisarPastor, setAvisarPastor] = useState(false)
  const [salvarFiel, setSalvarFiel] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/secretaria/pastores').then(r => r.json()),
      fetch('/api/secretaria/configuracoes').then(r => r.json()),
    ]).then(([pasts, cfg]) => {
      setPastores(Array.isArray(pasts) ? pasts : [])
      setConfig(cfg?.id ? cfg : null)
    }).finally(() => setLoading(false))
  }, [])

  const buscarFieis = (termo: string) => {
    if (buscaRef.current) clearTimeout(buscaRef.current)
    if (!termo.trim()) { setFieisBusca([]); return }
    buscaRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/secretaria/fieis?termo=${encodeURIComponent(termo)}`)
        const data = await res.json()
        setFieisBusca(Array.isArray(data) ? data : [])
      } catch { setFieisBusca([]) }
      finally { setBuscando(false) }
    }, 400)
  }

  const selecionarFiel = (fiel: Fiel) => {
    setNomeFiel(fiel.nome)
    setTelefone(fiel.telefone)
    setTermoBusca('')
    setFieisBusca([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeFiel || !telefone || !assunto || !pastorId || !data || !hora) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }
    if (new Date(`${data}T${hora}:00`) <= new Date()) {
      setErro('Não é possível agendar em data ou horário que já passou.')
      return
    }
    setErro('')
    setSubmitting(true)
    try {
      if (status === 'confirmado') {
        const resConflito = await fetch(`/api/secretaria/agendamentos/conflito?pastorId=${pastorId}&data=${data}&hora=${hora}&duracao=${duracao}`)
        const conflito = await resConflito.json()
        if (conflito.conflito) {
          setErro('Conflito de horário: já existe um agendamento confirmado neste horário.')
          setSubmitting(false)
          return
        }
      }

      const payload = { nome_fiel: nomeFiel, telefone, assunto, pastor_id: Number(pastorId), data, hora, duracao_min: duracao, status, recorrencia, observacoes }
      const res = await fetch('/api/secretaria/agendamentos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const raw: string = body?.error ?? 'Erro ao criar agendamento'
        throw new Error(raw.includes('BLOQUEADO') ? 'Este horário está bloqueado. Escolha outro.' : raw)
      }

      if (recorrencia !== 'nenhuma') {
        for (let i = 1; i <= 11; i++) {
          const novaData = recorrencia === 'semanal' ? addWeeks(data, i) : addMonths(data, i)
          await fetch('/api/secretaria/agendamentos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, data: novaData }),
          })
        }
      }

      if (salvarFiel) {
        await fetch('/api/secretaria/fieis', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nomeFiel, telefone, email: '', endereco: '', observacoes: '' }),
        })
      }

      setSucesso('Agendamento criado com sucesso!')
      const pastorSelecionado = pastores.find(p => p.id === Number(pastorId))
      const filaWA: typeof notifWA = []

      const [y, m, d] = data.split('-')
      const dataFmt = `${d}/${m}/${y}`

      if (enviarConfirmacao) {
        const template = config?.msg_confirmacao || 'Olá {nome}! Seu agendamento com o(a) pastor(a) {pastor} foi confirmado para {data} às {hora}. 🙏'
        const msg = preencherTemplate(template, { nome: nomeFiel, nome_fiel: nomeFiel, pastor: pastorSelecionado?.nome || '', pastor_nome: pastorSelecionado?.nome || '', data: dataFmt, hora })
        filaWA.push({ label: `Confirmação → ${nomeFiel}`, telefone, mensagem: msg, enviado: false })
      }
      if (avisarPastor) {
        if (pastorSelecionado?.telefone) {
          const template = config?.msg_pastor || 'Pastor(a), novo agendamento: {nome_fiel} - Assunto: {assunto} - {data} às {hora}. Tel: {telefone}.'
          const msg = preencherTemplate(template, { nome_fiel: nomeFiel, nome: nomeFiel, telefone, assunto, data: dataFmt, hora })
          filaWA.push({ label: `Aviso → Pastor(a) ${pastorSelecionado.nome}`, telefone: pastorSelecionado.telefone, mensagem: msg, enviado: false })
        } else {
          filaWA.push({ label: `Aviso → Pastor(a) ${pastorSelecionado?.nome || ''}`, telefone: '', mensagem: '', aviso: 'Sem telefone cadastrado', enviado: false })
        }
      }
      setNotifWA(filaWA)

      setNomeFiel(''); setTelefone(''); setAssunto(''); setPastorId('')
      setData(hoje()); setHora(horariosDisponiveis(hoje())[0] ?? '08:00')
      setDuracao(30); setStatus('pendente'); setRecorrencia('nenhuma'); setObservacoes('')
      setEnviarConfirmacao(false); setAvisarPastor(false); setSalvarFiel(false)
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar')
    } finally { setSubmitting(false) }
  }

  if (loading) return <LoadingSpinner />

  const isFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#C5A059' }
  const isBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#e5e7eb' }
  const fieldCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none'
  const fieldStyle = { borderColor: '#e5e7eb' }

  return (
    <div>
      <PageHeader icon="➕" title="Novo Agendamento" subtitle="Agendar atendimento pastoral" />

      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Busca de fiel */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar Fiel Cadastrado</label>
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={termoBusca}
                onChange={e => { setTermoBusca(e.target.value); buscarFieis(e.target.value) }}
                placeholder="Digite nome ou telefone..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={fieldStyle}
                onFocus={isFocus}
                onBlur={isBlur}
              />
              {buscando && <span className="self-center text-xs text-gray-400">Buscando...</span>}
            </div>
            {fieisBusca.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {fieisBusca.map(fiel => (
                  <button key={fiel.id} type="button" onClick={() => selecionarFiel(fiel)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0">
                    <span className="font-semibold" style={{ color: '#002347' }}>{fiel.nome}</span>
                    <span className="ml-2 text-gray-500">{fiel.telefone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Fiel *</label>
                  <input type="text" value={nomeFiel} onChange={e => setNomeFiel(e.target.value)} required className={fieldCls} style={fieldStyle} onFocus={isFocus} onBlur={isBlur} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone *</label>
                  <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} required placeholder="(11) 99999-9999" className={fieldCls} style={fieldStyle} onFocus={isFocus} onBlur={isBlur} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assunto *</label>
                <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} required className={fieldCls} style={fieldStyle} onFocus={isFocus} onBlur={isBlur} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pastor(a) *</label>
                  <select value={pastorId} onChange={e => setPastorId(e.target.value)} required className={fieldCls + ' bg-white'} style={fieldStyle} onFocus={isFocus} onBlur={isBlur}>
                    <option value="">Selecionar...</option>
                    {pastores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Data *</label>
                  <input type="date" value={data} min={hoje()} onChange={e => { const nd = e.target.value; setData(nd); const hs = horariosDisponiveis(nd); if (!hs.includes(hora)) setHora(hs[0] ?? '08:00') }} required className={fieldCls} style={fieldStyle} onFocus={isFocus} onBlur={isBlur} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Horário *</label>
                  <select value={hora} onChange={e => setHora(e.target.value)} required className={fieldCls + ' bg-white'} style={fieldStyle} onFocus={isFocus} onBlur={isBlur}>
                    {horariosDisponiveis(data).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duração *</label>
                  <select value={duracao} onChange={e => setDuracao(Number(e.target.value))} required className={fieldCls + ' bg-white'} style={fieldStyle} onFocus={isFocus} onBlur={isBlur}>
                    <option value={30}>30 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1h30</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 mt-4 lg:mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className={fieldCls + ' bg-white'} style={fieldStyle} onFocus={isFocus} onBlur={isBlur}>
                    <option value="pendente">Pendente</option>
                    <option value="confirmado">Confirmado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Recorrência</label>
                  <select value={recorrencia} onChange={e => setRecorrencia(e.target.value)} className={fieldCls + ' bg-white'} style={fieldStyle} onFocus={isFocus} onBlur={isBlur}>
                    <option value="nenhuma">Nenhuma</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={fieldStyle} onFocus={isFocus} onBlur={isBlur} />
              </div>
              <div className="space-y-2 bg-gray-50 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Opções adicionais</p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enviarConfirmacao} onChange={e => setEnviarConfirmacao(e.target.checked)} className="w-4 h-4 accent-yellow-600" />
                  <span className="text-sm text-gray-700">Enviar confirmação via WhatsApp ao fiel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={avisarPastor} onChange={e => setAvisarPastor(e.target.checked)} className="w-4 h-4 accent-yellow-600" />
                  <span className="text-sm text-gray-700">Avisar pastor(a) via WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={salvarFiel} onChange={e => setSalvarFiel(e.target.checked)} className="w-4 h-4 accent-yellow-600" />
                  <span className="text-sm text-gray-700">Salvar cadastro do fiel</span>
                </label>
              </div>

              {erro && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-2 text-sm">{erro}</div>}
              {sucesso && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-2 text-sm">✓ {sucesso}</div>}

              {notifWA.length > 0 && (
                <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#25D366' }}>
                  <div className="px-4 py-2 text-sm font-semibold" style={{ backgroundColor: '#25D366', color: '#fff' }}>📱 Enviar Notificações WhatsApp</div>
                  <div className="divide-y">
                    {notifWA.map((n, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 bg-white gap-3">
                        <span className="text-sm text-gray-700 flex-1">{n.label}</span>
                        {n.aviso ? (
                          <span className="text-xs text-amber-600 font-medium">⚠ {n.aviso}</span>
                        ) : n.enviado ? (
                          <span className="text-sm font-semibold" style={{ color: '#25D366' }}>✓ Enviado</span>
                        ) : (
                          <button type="button" onClick={() => { waOpen(n.telefone, n.mensagem); setNotifWA(prev => prev.map((x, j) => j === i ? { ...x, enviado: true } : x)) }}
                            className="text-sm font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap" style={{ backgroundColor: '#25D366', color: '#fff' }}>
                            📱 Enviar →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={submitting} style={{ backgroundColor: '#002347', color: '#ffffff' }} className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50">
                {submitting ? 'Salvando...' : '💾 Salvar Agendamento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
