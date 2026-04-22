'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Configuracoes, HorarioAtendimento } from '@/types'

const configVazia: Configuracoes = {
  id: 1,
  horas_lembrete: 24,
  msg_confirmacao: '',
  msg_lembrete: '',
  msg_cancelamento: '',
  msg_remarcacao: '',
  msg_pastor: '',
}

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const horariosDefault: HorarioAtendimento[] = Array.from({ length: 7 }, (_, i) => ({
  dia_semana: i,
  ativo: i >= 1 && i <= 5,
  inicio: '08:00',
  intervalo_inicio: '12:00',
  intervalo_fim: '13:00',
  fim: '18:00',
}))

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes>(configVazia)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  // Horários de atendimento
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>(horariosDefault)
  const [salvandoHorarios, setSalvandoHorarios] = useState(false)
  const [sucessoHorarios, setSucessoHorarios] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const [cfgRes, horRes] = await Promise.all([
        fetch('/api/configuracoes'),
        fetch('/api/horarios'),
      ])
      const cfg = await cfgRes.json()
      const hor = await horRes.json()
      if (cfg && cfg.id) setConfig(cfg)
      if (Array.isArray(hor) && hor.length === 7) setHorarios(hor)
    } catch {
      setErro('Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  const handleSalvarHorarios = async () => {
    setSalvandoHorarios(true)
    setSucessoHorarios('')
    try {
      const res = await fetch('/api/horarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(horarios),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSucessoHorarios('Horários salvos com sucesso!')
      setTimeout(() => setSucessoHorarios(''), 3000)
    } catch {
      setErro('Erro ao salvar horários.')
    } finally {
      setSalvandoHorarios(false)
    }
  }

  const setHorario = (dia: number, campo: keyof HorarioAtendimento, valor: string | boolean | null) => {
    setHorarios(prev => prev.map(h => h.dia_semana === dia ? { ...h, [campo]: valor } : h))
  }

  useEffect(() => { carregar() }, [])

  const handleSalvar = async (e: React.FormEvent) => {
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

  if (loading) return <LoadingSpinner />

  const inputStyle = { borderColor: '#e5e7eb' }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#C5A059' }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#e5e7eb' }

  return (
    <div>
      <PageHeader icon="⚙️" title="Configurações" subtitle="Lembretes e mensagens do sistema" />

      {erro && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>}
      {sucesso && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{sucesso}</div>}

      {/* Horários de Atendimento */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-5">
        <div className="mb-4">
          <h2 style={{ color: '#002347' }} className="font-bold text-base">Horários de Atendimento</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {horarios.map((h) => (
            <div key={h.dia_semana} className="rounded-xl border p-3" style={{ borderColor: h.ativo ? '#C5A059' : '#e5e7eb', backgroundColor: h.ativo ? '#fffbf0' : '#f9fafb' }}>
              {/* Cabeçalho do dia */}
              <div className="flex items-center gap-4 mb-2">
                <button
                  type="button"
                  onClick={() => setHorario(h.dia_semana, 'ativo', !h.ativo)}
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: h.ativo ? '#002347' : '#d1d5db',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    left: h.ativo ? 22 : 2,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    transition: 'left 0.2s',
                  }} />
                </button>
                <span className="font-bold text-sm" style={{ color: h.ativo ? '#002347' : '#9ca3af' }}>
                  {DIAS_SEMANA[h.dia_semana]}
                </span>
                {!h.ativo && <span className="text-xs text-gray-400">Sem atendimento</span>}
              </div>

              {h.ativo && (
                <div className="space-y-2 pl-14">
                  {/* Turno da manhã */}
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-gray-500 w-10">Início</label>
                    <input
                      type="time"
                      value={h.inicio}
                      onChange={(e) => setHorario(h.dia_semana, 'inicio', e.target.value)}
                      className="border rounded-lg px-2 py-1 text-sm focus:outline-none"
                      style={{ borderColor: '#e5e7eb', color: '#1a202c' }}
                    />
                    <span className="text-gray-400 text-xs">até</span>
                    <input
                      type="time"
                      value={h.intervalo_inicio ?? h.fim}
                      onChange={(e) => setHorario(h.dia_semana, h.intervalo_inicio !== null ? 'intervalo_inicio' : 'fim', e.target.value)}
                      className="border rounded-lg px-2 py-1 text-sm focus:outline-none"
                      style={{ borderColor: '#e5e7eb', color: '#1a202c' }}
                    />
                  </div>

                  {/* Checkbox intervalo */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`intervalo-${h.dia_semana}`}
                      checked={h.intervalo_inicio !== null}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setHorario(h.dia_semana, 'intervalo_inicio', '12:00')
                          setHorario(h.dia_semana, 'intervalo_fim', '13:00')
                        } else {
                          setHorario(h.dia_semana, 'intervalo_inicio', null)
                          setHorario(h.dia_semana, 'intervalo_fim', null)
                        }
                      }}
                      className="rounded"
                      style={{ accentColor: '#002347' }}
                    />
                    <label htmlFor={`intervalo-${h.dia_semana}`} className="text-xs text-gray-600 cursor-pointer">
                      Intervalo / Almoço
                    </label>
                  </div>

                  {/* Turno da tarde */}
                  {h.intervalo_inicio !== null && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-gray-500 w-10">Retorno</label>
                      <input
                        type="time"
                        value={h.intervalo_fim ?? '13:00'}
                        onChange={(e) => setHorario(h.dia_semana, 'intervalo_fim', e.target.value)}
                        className="border rounded-lg px-2 py-1 text-sm focus:outline-none"
                        style={{ borderColor: '#e5e7eb', color: '#1a202c' }}
                      />
                      <span className="text-gray-400 text-xs">até</span>
                      <input
                        type="time"
                        value={h.fim}
                        onChange={(e) => setHorario(h.dia_semana, 'fim', e.target.value)}
                        className="border rounded-lg px-2 py-1 text-sm focus:outline-none"
                        style={{ borderColor: '#e5e7eb', color: '#1a202c' }}
                      />
                    </div>
                  )}

                  {/* Sem intervalo: campo fim */}
                  {h.intervalo_inicio === null && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-gray-500 w-10">Fim</label>
                      <input
                        type="time"
                        value={h.fim}
                        onChange={(e) => setHorario(h.dia_semana, 'fim', e.target.value)}
                        className="border rounded-lg px-2 py-1 text-sm focus:outline-none"
                        style={{ borderColor: '#e5e7eb', color: '#1a202c' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Botão Salvar Horários — sticky na base */}
      <div className="sticky bottom-0 z-10 bg-white border-t px-5 py-3 mb-5 rounded-b-xl shadow-md" style={{ borderColor: '#e5e7eb', marginTop: -1 }}>
        <button
          type="button"
          onClick={handleSalvarHorarios}
          disabled={salvandoHorarios}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {salvandoHorarios ? 'Salvando...' : '💾 Salvar Horários'}
        </button>
        {sucessoHorarios && <p className="text-center text-green-600 text-xs font-semibold mt-2">{sucessoHorarios}</p>}
      </div>

      {/* Mensagens — full width, 2 colunas em desktop */}
      <form onSubmit={handleSalvar} className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 style={{ color: '#002347' }} className="font-bold text-base">Configurações de Lembretes</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Horas de antecedência:</label>
            <input
              type="number"
              min={1}
              max={168}
              value={config.horas_lembrete}
              onChange={(e) => setConfig((c) => ({ ...c, horas_lembrete: Number(e.target.value) }))}
              className="w-24 border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <span className="text-xs text-gray-400">horas antes</span>
          </div>
        </div>

        <div style={{ borderColor: '#f3f4f6' }} className="border-t pt-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 style={{ color: '#002347' }} className="font-semibold text-sm">Mensagens WhatsApp</h3>
            <p className="text-xs text-gray-400">Variáveis: {'{nome}'}, {'{pastor}'}, {'{data}'}, {'{hora}'}, {'{assunto}'}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
            {/* Coluna 1 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmação de Agendamento</label>
                <textarea value={config.msg_confirmacao} onChange={(e) => setConfig((c) => ({ ...c, msg_confirmacao: e.target.value }))} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Lembrete</label>
                <textarea value={config.msg_lembrete} onChange={(e) => setConfig((c) => ({ ...c, msg_lembrete: e.target.value }))} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cancelamento</label>
                <textarea value={config.msg_cancelamento} onChange={(e) => setConfig((c) => ({ ...c, msg_cancelamento: e.target.value }))} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>

            {/* Coluna 2 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarcação</label>
                <textarea value={config.msg_remarcacao} onChange={(e) => setConfig((c) => ({ ...c, msg_remarcacao: e.target.value }))} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notificação para o Pastor</label>
                <p className="text-xs text-gray-400 mb-1">Variáveis: {'{nome_fiel}'}, {'{telefone}'}, {'{assunto}'}, {'{data}'}, {'{hora}'}</p>
                <textarea value={config.msg_pastor} onChange={(e) => setConfig((c) => ({ ...c, msg_pastor: e.target.value }))} rows={4} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="w-full mt-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </form>
    </div>
  )
}

