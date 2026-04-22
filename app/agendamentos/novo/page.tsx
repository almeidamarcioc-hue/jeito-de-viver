'use client'

import { useEffect, useState, useRef } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Pastor, Fiel, Configuracoes } from '@/types'

const TODOS_HORARIOS = Array.from({ length: 22 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0')
  const m = String(totalMin % 60).padStart(2, '0')
  return `${h}:${m}`
})

function horariosDisponiveis(dataSelecionada: string): string[] {
  const isHoje = dataSelecionada === hoje()
  if (!isHoje) return TODOS_HORARIOS
  const agora = new Date()
  const horaAtual = agora.getHours() * 60 + agora.getMinutes()
  return TODOS_HORARIOS.filter((h) => {
    const [hh, mm] = h.split(':').map(Number)
    return hh * 60 + mm > horaAtual
  })
}

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function abrirWhatsApp(telefone: string, mensagem: string) {
  const num = telefone.replace(/\D/g, '')
  const url = `https://wa.me/${num.startsWith('55') ? num : '55' + num}?text=${encodeURIComponent(mensagem)}`
  window.open(url, '_blank')
}

function buildMensagemConfirmacao(cfg: Configuracoes | null, nome: string, pastor: string, data: string, hora: string): string {
  const template = cfg?.msg_confirmacao || 'Olá {nome_fiel}, seu atendimento com {pastor_nome} está confirmado para {data} às {hora}.'
  const [y, m, d] = data.split('-')
  const dataFmt = `${d}/${m}/${y}`
  return template
    .replace('{nome_fiel}', nome)
    .replace('{pastor_nome}', pastor)
    .replace('{data}', dataFmt)
    .replace('{hora}', hora)
}

function buildMensagemPastor(cfg: Configuracoes | null, nome: string, telefone: string, assunto: string, data: string, hora: string): string {
  const template = cfg?.msg_pastor || 'Pastor(a), você tem um atendimento com {nome_fiel} ({telefone}) sobre {assunto} em {data} às {hora}.'
  const [y, m, d] = data.split('-')
  const dataFmt = `${d}/${m}/${y}`
  return template
    .replace('{nome_fiel}', nome)
    .replace('{telefone}', telefone)
    .replace('{assunto}', assunto)
    .replace('{data}', dataFmt)
    .replace('{hora}', hora)
}

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function addWeeks(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n * 7)
  return d.toISOString().slice(0, 10)
}

export default function NovoAgendamentoPage() {
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  // Busca de fiel
  const [termoBusca, setTermoBusca] = useState('')
  const [fieisBusca, setFieisBusca] = useState<Fiel[]>([])
  const [buscando, setBuscando] = useState(false)
  const buscaRef = useRef<NodeJS.Timeout | null>(null)

  // Form fields
  const [nomeFiel, setNomeFiel] = useState('')
  const [telefone, setTelefone] = useState('')
  const [assunto, setAssunto] = useState('')
  const [pastorId, setPastorId] = useState('')
  const [data, setData] = useState(hoje())
  const [hora, setHora] = useState(() => horariosDisponiveis(hoje())[0] ?? '08:00')
  const [status, setStatus] = useState('pendente')
  const [recorrencia, setRecorrencia] = useState('nenhuma')
  const [observacoes, setObservacoes] = useState('')
  const [enviarConfirmacao, setEnviarConfirmacao] = useState(false)
  const [avisarPastor, setAvisarPastor] = useState(false)
  const [salvarFiel, setSalvarFiel] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/pastores').then((r) => r.json()),
      fetch('/api/configuracoes').then((r) => r.json()),
    ]).then(([pasts, cfg]) => {
      setPastores(Array.isArray(pasts) ? pasts : [])
      setConfig(cfg && cfg.id ? cfg : null)
    }).finally(() => setLoading(false))
  }, [])

  const buscarFieis = (termo: string) => {
    if (buscaRef.current) clearTimeout(buscaRef.current)
    if (!termo.trim()) { setFieisBusca([]); return }
    buscaRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/fieis?termo=${encodeURIComponent(termo)}`)
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
    // Impede agendamento em data/hora passada
    const agendamentoTs = new Date(`${data}T${hora}:00`)
    if (agendamentoTs <= new Date()) {
      setErro('Não é possível agendar em uma data ou horário que já passou.')
      return
    }
    setErro('')
    setSubmitting(true)

    try {
      // Verificar conflito se confirmado
      if (status === 'confirmado') {
        const resConflito = await fetch(`/api/agendamentos/conflito?pastorId=${pastorId}&data=${data}&hora=${hora}`)
        const conflito = await resConflito.json()
        if (conflito.conflito) {
          setErro(`Conflito de horário: já existe um agendamento confirmado para este pastor neste horário.`)
          setSubmitting(false)
          return
        }
      }

      // Criar agendamento principal
      const payload = { nome_fiel: nomeFiel, telefone, assunto, pastor_id: Number(pastorId), data, hora, status, recorrencia, observacoes }
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Erro ao criar agendamento')

      // Recorrência: criar 11 cópias adicionais
      if (recorrencia !== 'nenhuma') {
        for (let i = 1; i <= 11; i++) {
          const novaData = recorrencia === 'semanal' ? addWeeks(data, i) : addMonths(data, i)
          await fetch('/api/agendamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, data: novaData }),
          })
        }
      }

      // Salvar cadastro fiel
      if (salvarFiel) {
        await fetch('/api/fieis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nomeFiel, telefone, email: '', endereco: '', observacoes: '' }),
        })
      }

      setSucesso('Agendamento criado com sucesso!')

      // WhatsApp fiel
      if (enviarConfirmacao) {
        const pastorNome = pastores.find((p) => p.id === Number(pastorId))?.nome || ''
        const msg = buildMensagemConfirmacao(config, nomeFiel, pastorNome, data, hora)
        abrirWhatsApp(telefone, msg)
      }

      // WhatsApp pastor
      if (avisarPastor) {
        const pastor = pastores.find((p) => p.id === Number(pastorId))
        if (pastor?.telefone) {
          const msg = buildMensagemPastor(config, nomeFiel, telefone, assunto, data, hora)
          abrirWhatsApp(pastor.telefone, msg)
        }
      }

      // Reset form
      setNomeFiel('')
      setTelefone('')
      setAssunto('')
      setPastorId('')
      setData(hoje())
      setHora('08:00')
      setStatus('pendente')
      setRecorrencia('nenhuma')
      setObservacoes('')
      setEnviarConfirmacao(false)
      setAvisarPastor(false)
      setSalvarFiel(false)
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar agendamento')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader icon="➕" title="Novo Agendamento" subtitle="Agendar atendimento pastoral" />

      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Busca de fiel */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar Fiel Cadastrado</label>
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => { setTermoBusca(e.target.value); buscarFieis(e.target.value) }}
                placeholder="Digite nome ou telefone..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
              {buscando && <span className="self-center text-xs text-gray-400">Buscando...</span>}
            </div>
            {fieisBusca.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {fieisBusca.map((fiel) => (
                  <button
                    key={fiel.id}
                    type="button"
                    onClick={() => selecionarFiel(fiel)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                  >
                    <span className="font-semibold">{fiel.nome}</span>
                    <span className="text-gray-500 ml-2">{fiel.telefone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome e Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Fiel *</label>
              <input
                type="text"
                value={nomeFiel}
                onChange={(e) => setNomeFiel(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Telefone *</label>
              <input
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
                placeholder="(11) 99999-9999"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
          </div>

          {/* Assunto */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Assunto *</label>
            <input
              type="text"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          {/* Pastor, Data, Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Pastor(a) *</label>
              <select
                value={pastorId}
                onChange={(e) => setPastorId(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              >
                <option value="">Selecionar...</option>
                {pastores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Data *</label>
              <input
                type="date"
                value={data}
                min={hoje()}
                onChange={(e) => {
                  const novaData = e.target.value
                  setData(novaData)
                  const horarios = horariosDisponiveis(novaData)
                  if (!horarios.includes(hora)) setHora(horarios[0] ?? '08:00')
                }}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Horário *</label>
              <select
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              >
                {horariosDisponiveis(data).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status e Recorrência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              >
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Recorrência</label>
              <select
                value={recorrencia}
                onChange={(e) => setRecorrencia(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
                style={{ borderColor: '#e5e7eb' }}
                onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              >
                <option value="nenhuma">Nenhuma</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{ borderColor: '#e5e7eb' }}
              onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Opções adicionais</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enviarConfirmacao}
                onChange={(e) => setEnviarConfirmacao(e.target.checked)}
                className="w-4 h-4 accent-yellow-600"
              />
              <span className="text-sm text-gray-700">Enviar confirmação via WhatsApp ao fiel</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={avisarPastor}
                onChange={(e) => setAvisarPastor(e.target.checked)}
                className="w-4 h-4 accent-yellow-600"
              />
              <span className="text-sm text-gray-700">Avisar pastor(a) via WhatsApp</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={salvarFiel}
                onChange={(e) => setSalvarFiel(e.target.checked)}
                className="w-4 h-4 accent-yellow-600"
              />
              <span className="text-sm text-gray-700">Salvar cadastro do fiel</span>
            </label>
          </div>

          {/* Feedback */}
          {erro && (
            <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-2 text-sm">
              {erro}
            </div>
          )}
          {sucesso && (
            <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-2 text-sm">
              {sucesso}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: '#002347', color: '#ffffff' }}
            className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:bg-yellow-600 disabled:opacity-50"
            onMouseOver={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#C5A059'; (e.target as HTMLButtonElement).style.color = '#002347' }}
            onMouseOut={(e) => { (e.target as HTMLButtonElement).style.backgroundColor = '#002347'; (e.target as HTMLButtonElement).style.color = '#ffffff' }}
          >
            {submitting ? 'Salvando...' : '💾 Salvar Agendamento'}
          </button>
        </form>
      </div>
    </div>
  )
}
