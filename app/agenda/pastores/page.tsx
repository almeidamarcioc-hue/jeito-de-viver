'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import Badge from '@/components/Badge'
import { Pastor, Slot, Configuracoes } from '@/types'
import { preencherTemplate, abrirWhatsApp as waOpen } from '@/lib/whatsapp'

const DIAS_SEMANA_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const HORAS_DIA = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00']

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function startOfWeek(d: Date): Date {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function formatDateLabel(d: Date, view: string): string {
  if (view === 'mensal') return `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`
  if (view === 'semanal') {
    const ini = startOfWeek(d)
    const fim = addDays(ini, 6)
    return `${String(ini.getDate()).padStart(2, '0')}/${String(ini.getMonth() + 1).padStart(2, '0')} – ${String(fim.getDate()).padStart(2, '0')}/${String(fim.getMonth() + 1).padStart(2, '0')}/${fim.getFullYear()}`
  }
  return `${DIAS_SEMANA_PT[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function navigate(current: Date, view: string, dir: number): Date {
  const d = new Date(current)
  if (view === 'mensal') d.setMonth(d.getMonth() + dir)
  else if (view === 'semanal') d.setDate(d.getDate() + dir * 7)
  else d.setDate(d.getDate() + dir)
  return d
}

function slotColor(tipo: string): { bg: string; border: string; text: string } {
  if (tipo === 'confirmado') return { bg: '#dcfce7', border: '#22c55e', text: '#166534' }
  if (tipo === 'pendente') return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
  if (tipo === 'bloqueado') return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' }
  return { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280' }
}

export default function AgendaPastoresPage() {
  const router = useRouter()
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [pastorId, setPastorId] = useState<number | null>(null)
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [view, setView] = useState<'mensal' | 'semanal' | 'diaria'>('mensal')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [slots, setSlots] = useState<Record<string, Record<string, Slot>>>({})
  const [loading, setLoading] = useState(false)
  const [painel, setPainel] = useState<{ data: string; hora: string; slot: Slot | null } | null>(null)
  const [painelDia, setPainelDia] = useState<string | null>(null)
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [bloqueando, setBloqueando] = useState(false)
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/pastores').then((r) => r.json()),
      fetch('/api/configuracoes').then((r) => r.json()),
    ]).then(([pasts, cfg]) => {
      setPastores(Array.isArray(pasts) ? pasts : [])
      if (cfg?.id) setConfig(cfg)
    })
  }, [])

  const fetchSlots = useCallback(async () => {
    if (!pastorId) return
    setLoading(true)
    try {
      let dataInicio: string, dataFim: string
      if (view === 'mensal') {
        const ini = startOfMonth(currentDate)
        const fim = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        dataInicio = toDateStr(ini)
        dataFim = toDateStr(fim)
      } else if (view === 'semanal') {
        const ini = startOfWeek(currentDate)
        dataInicio = toDateStr(ini)
        dataFim = toDateStr(addDays(ini, 6))
      } else {
        dataInicio = toDateStr(currentDate)
        dataFim = dataInicio
      }
      const res = await fetch(`/api/slots?pastorId=${pastorId}&dataInicio=${dataInicio}&dataFim=${dataFim}&_t=${Date.now()}`)
      const data = await res.json()
      setSlots(data || {})
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [pastorId, view, currentDate])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  // Atualiza ao voltar para a aba
  useEffect(() => {
    const onFocus = () => fetchSlots()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [fetchSlots])

  const getSlot = (data: string, hora: string): Slot | null => slots?.[data]?.[hora] ?? null

  const abrirPainel = (data: string, hora: string) => {
    setPainel({ data, hora, slot: getSlot(data, hora) })
    setMotivoBloqueio('')
    setPainelDia(null)
  }

  const abrirPainelDia = (ds: string) => {
    setPainelDia(ds)
    setPainel(null)
  }

  const handleBloquear = async () => {
    if (!painel || !pastorId) return
    setBloqueando(true)
    try {
      await fetch('/api/bloqueios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastor_id: pastorId, data: painel.data, hora: painel.hora, motivo: motivoBloqueio }),
      })
      await fetchSlots()
      setPainel(null)
    } catch { /* silencioso */ }
    finally { setBloqueando(false) }
  }

  const handleDesbloquear = async () => {
    if (!painel?.slot || painel.slot.tipo !== 'bloqueado') return
    try {
      await fetch(`/api/bloqueios/${painel.slot.dados.id}`, { method: 'DELETE' })
      await fetchSlots()
      setPainel(null)
    } catch { /* silencioso */ }
  }

  const handleAlterarStatus = async (novoStatus: string) => {
    if (!painel?.slot) return
    setAtualizandoStatus(true)
    try {
      await fetch(`/api/agendamentos/${painel.slot.dados.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      await fetchSlots()
      setPainel(null)
    } catch { /* silencioso */ }
    finally { setAtualizandoStatus(false) }
  }

  const daysInMonth = (): (Date | null)[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []
    for (let i = 0; i < first.getDay(); i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }

  const weekDays = (): Date[] => {
    const ini = startOfWeek(currentDate)
    return Array.from({ length: 7 }, (_, i) => addDays(ini, i))
  }

  const pastor = pastores.find((p) => p.id === pastorId)
  const hoje = toDateStr(new Date())

  // Agendamentos do dia para o painel lateral de dia
  const slotsDia = painelDia ? Object.entries(slots[painelDia] || {}).sort(([a], [b]) => a.localeCompare(b)) : []

  return (
    <div>
      <PageHeader icon="📅" title="Agenda dos Pastores" subtitle="Visualização mensal, semanal e diária" />

      {/* Controles */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Pastor(a)</label>
          <select
            value={pastorId ?? ''}
            onChange={(e) => setPastorId(e.target.value ? Number(e.target.value) : null)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none"
            style={{ borderColor: '#e5e7eb', color: '#1a202c' }}
          >
            <option value="">— Selecione um pastor —</option>
            {pastores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['mensal', 'semanal', 'diaria'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={view === v ? { backgroundColor: '#002347', color: '#fff' } : { color: '#374151' }}
              className="px-3 py-1.5 rounded-md text-sm font-semibold capitalize transition-colors"
            >
              {v === 'diaria' ? 'Diária' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button onClick={() => setCurrentDate(navigate(currentDate, view, -1))} style={{ backgroundColor: '#002347', color: '#fff' }} className="w-8 h-8 rounded-lg font-bold text-sm">◀</button>
          <span style={{ color: '#002347' }} className="font-semibold text-sm min-w-[160px] text-center">{formatDateLabel(currentDate, view)}</span>
          <button onClick={() => setCurrentDate(navigate(currentDate, view, 1))} style={{ backgroundColor: '#002347', color: '#fff' }} className="w-8 h-8 rounded-lg font-bold text-sm">▶</button>
          <button onClick={() => setCurrentDate(new Date())} style={{ backgroundColor: '#C5A059', color: '#002347' }} className="px-3 py-1.5 rounded-lg text-sm font-semibold">Hoje</button>
          <button onClick={fetchSlots} style={{ backgroundColor: '#f3f4f6', color: '#374151' }} className="px-3 py-1.5 rounded-lg text-sm font-semibold">↻ Atualizar</button>
        </div>
      </div>

      {!pastorId && !loading && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <img src="/logo.png" alt="IBTM" className="mx-auto mb-3" style={{ height: 56, opacity: 0.35 }} />
          <p className="font-semibold text-gray-500">Selecione um pastor para visualizar a agenda</p>
        </div>
      )}

      {loading && pastorId && <LoadingSpinner />}

      {!loading && pastorId && (
        <div className="bg-white rounded-xl shadow-sm p-4">

          {/* ── MENSAL ── */}
          {view === 'mensal' && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DIAS_SEMANA_PT.map((d) => (
                  <div key={d} className="text-center text-xs font-bold text-gray-500 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth().map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />
                  const ds = toDateStr(day)
                  const daySlots = slots[ds] || {}
                  const agendamentos = Object.entries(daySlots)
                    .filter(([, s]) => s.tipo !== 'bloqueado')
                    .sort(([a], [b]) => a.localeCompare(b))
                  const bloqueios = Object.entries(daySlots).filter(([, s]) => s.tipo === 'bloqueado')
                  const isToday = ds === hoje
                  const total = agendamentos.length + bloqueios.length

                  return (
                    <div
                      key={ds}
                      onClick={() => abrirPainelDia(ds)}
                      style={{
                        border: isToday ? '2px solid #C5A059' : '1px solid #e5e7eb',
                        backgroundColor: isToday ? '#fffbf0' : '#fff',
                        cursor: 'pointer',
                        minHeight: 80,
                      }}
                      className="rounded-lg p-1.5 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-xs font-bold"
                          style={{ color: isToday ? '#C5A059' : '#374151' }}
                        >
                          {day.getDate()}
                        </span>
                        {total > 0 && (
                          <span className="text-xs font-semibold rounded-full px-1" style={{ backgroundColor: '#002347', color: '#C5A059', fontSize: 10 }}>
                            {total}
                          </span>
                        )}
                      </div>

                      {/* Chips de agendamento */}
                      <div className="space-y-0.5">
                        {agendamentos.slice(0, 3).map(([hora, slot]) => (
                          <div
                            key={hora}
                            className="rounded px-1 py-0.5 text-xs truncate leading-tight"
                            style={{
                              backgroundColor: slot.tipo === 'confirmado' ? '#dcfce7' : '#fef3c7',
                              color: slot.tipo === 'confirmado' ? '#166534' : '#92400e',
                            }}
                          >
                            <span className="font-semibold">{hora}</span> {String(slot.dados.nome_fiel || '').split(' ')[0]}
                          </div>
                        ))}
                        {bloqueios.length > 0 && agendamentos.length < 3 && (
                          <div className="rounded px-1 py-0.5 text-xs truncate leading-tight" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                            🔒 {bloqueios.length} bloqueio{bloqueios.length > 1 ? 's' : ''}
                          </div>
                        )}
                        {agendamentos.length > 3 && (
                          <div className="text-xs text-gray-400 pl-1">+{agendamentos.length - 3} mais</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legenda */}
              <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#dcfce7', border: '1px solid #22c55e' }} />Confirmado</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b' }} />Pendente</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ backgroundColor: '#f3f4f6', border: '1px solid #9ca3af' }} />Bloqueado</span>
              </div>
            </div>
          )}

          {/* ── SEMANAL ── */}
          {view === 'semanal' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="w-16 py-2 text-gray-500 font-semibold border-b">Hora</th>
                    {weekDays().map((day) => {
                      const ds = toDateStr(day)
                      const isToday = ds === hoje
                      return (
                        <th key={ds} className="py-2 font-semibold border-b text-center" style={{ color: isToday ? '#C5A059' : '#374151' }}>
                          {DIAS_SEMANA_PT[day.getDay()]}<br />
                          <span className="font-normal">{String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}</span>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HORAS_DIA.map((hora) => (
                    <tr key={hora} className="border-b last:border-b-0">
                      <td className="py-1 px-2 text-gray-500 font-semibold">{hora}</td>
                      {weekDays().map((day) => {
                        const ds = toDateStr(day)
                        const slot = getSlot(ds, hora)
                        const cor = slot ? slotColor(slot.tipo) : { bg: '#f9fafb', border: '#e5e7eb', text: '#9ca3af' }
                        return (
                          <td key={ds} className="py-1 px-1">
                            <button
                              onClick={() => abrirPainel(ds, hora)}
                              style={{ backgroundColor: cor.bg, color: cor.text, border: `1px solid ${cor.border}` }}
                              className="w-full rounded px-1 py-1 text-xs truncate text-left"
                            >
                              {slot
                                ? slot.tipo === 'bloqueado' ? '🔒' : String(slot.dados.nome_fiel || '').split(' ')[0] || '✓'
                                : <span className="opacity-30">—</span>}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── DIÁRIA ── */}
          {view === 'diaria' && (
            <div className="space-y-2">
              <p style={{ color: '#002347' }} className="font-bold text-sm mb-3">
                {String(currentDate.getDate()).padStart(2, '0')}/{String(currentDate.getMonth() + 1).padStart(2, '0')}/{currentDate.getFullYear()}
              </p>
              {HORAS_DIA.map((hora) => {
                const ds = toDateStr(currentDate)
                const slot = getSlot(ds, hora)
                const cor = slot ? slotColor(slot.tipo) : { bg: '#f9fafb', border: '#e5e7eb', text: '#9ca3af' }
                return (
                  <div key={hora} className="flex items-center gap-3">
                    <span className="w-14 text-sm font-semibold text-gray-600">{hora}</span>
                    <button
                      onClick={() => abrirPainel(ds, hora)}
                      style={{ backgroundColor: cor.bg, borderColor: cor.border, color: cor.text }}
                      className="flex-1 text-left px-4 py-2 rounded-lg border text-sm font-medium"
                    >
                      {slot
                        ? slot.tipo === 'bloqueado' ? `🔒 Bloqueado: ${slot.dados.motivo || ''}` : `${slot.dados.nome_fiel} — ${slot.dados.assunto}`
                        : 'Livre'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PAINEL DIA (mensal → click no dia) ── */}
      {painelDia && (
        <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={(e) => { if (e.target === e.currentTarget) setPainelDia(null) }}>
          <div className="ml-auto w-96 bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div style={{ backgroundColor: '#002347', borderBottom: '2px solid #C5A059' }} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-white font-bold">{painelDia.split('-').reverse().join('/')}</p>
                <p style={{ color: '#C5A059' }} className="text-xs">{pastor?.nome}</p>
              </div>
              <button onClick={() => setPainelDia(null)} className="text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-5 py-5 flex-1">
              {slotsDia.length === 0 ? (
                <p className="text-green-600 font-semibold text-sm">✓ Nenhum agendamento neste dia</p>
              ) : (
                <div className="space-y-3">
                  {slotsDia.map(([hora, slot]) => {
                    const cor = slotColor(slot.tipo)
                    return (
                      <div
                        key={hora}
                        className="rounded-xl p-3 cursor-pointer hover:opacity-90"
                        style={{ backgroundColor: cor.bg, border: `1px solid ${cor.border}` }}
                        onClick={() => { abrirPainel(painelDia, hora) }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm" style={{ color: cor.text }}>{hora}</span>
                          <Badge status={slot.tipo as 'confirmado' | 'pendente' | 'bloqueado'} />
                        </div>
                        {slot.tipo === 'bloqueado' ? (
                          <p className="text-xs text-gray-500">🔒 {String(slot.dados.motivo || 'Bloqueado')}</p>
                        ) : (
                          <>
                            <p className="font-semibold text-sm" style={{ color: cor.text }}>{String(slot.dados.nome_fiel || '')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{String(slot.dados.assunto || '')}</p>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => { router.push('/agendamentos/novo') }}
                style={{ backgroundColor: '#002347', color: '#fff' }}
                className="w-full mt-5 py-2.5 rounded-lg text-sm font-semibold"
              >
                ➕ Novo Agendamento Neste Dia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAINEL SLOT (hora específica) ── */}
      {painel && (
        <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={(e) => { if (e.target === e.currentTarget) setPainel(null) }}>
          <div className="ml-auto w-96 bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div style={{ backgroundColor: '#002347', borderBottom: '2px solid #C5A059' }} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-white font-bold">{painel.hora} — {painel.data.split('-').reverse().join('/')}</p>
                <p style={{ color: '#C5A059' }} className="text-xs">{pastor?.nome}</p>
              </div>
              <button onClick={() => setPainel(null)} className="text-white text-2xl leading-none">×</button>
            </div>
            <div className="px-5 py-5 flex-1">
              {!painel.slot && (
                <div>
                  <p className="text-green-600 font-semibold mb-4">✓ Horário Livre</p>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo do bloqueio</label>
                  <input
                    type="text"
                    value={motivoBloqueio}
                    onChange={(e) => setMotivoBloqueio(e.target.value)}
                    placeholder="Ex: Reunião interna"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none mb-3"
                    style={{ borderColor: '#e5e7eb' }}
                  />
                  <button onClick={handleBloquear} disabled={bloqueando} style={{ backgroundColor: '#002347', color: '#fff' }} className="w-full py-2 rounded-lg font-semibold text-sm">
                    {bloqueando ? 'Bloqueando...' : '🔒 Bloquear Horário'}
                  </button>
                </div>
              )}

              {painel.slot?.tipo === 'bloqueado' && (
                <div>
                  <p className="text-gray-600 font-semibold mb-2">🔒 Horário Bloqueado</p>
                  <p className="text-sm text-gray-500 mb-4">Motivo: {String(painel.slot.dados.motivo || '—')}</p>
                  <button onClick={handleDesbloquear} style={{ backgroundColor: '#ef4444', color: '#fff' }} className="w-full py-2 rounded-lg font-semibold text-sm">
                    🔓 Desbloquear
                  </button>
                </div>
              )}

              {(painel.slot?.tipo === 'confirmado' || painel.slot?.tipo === 'pendente') && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge status={painel.slot.tipo} />
                  </div>
                  <div className="space-y-2 text-sm">
                    <Row label="Fiel" value={String(painel.slot.dados.nome_fiel || '')} />
                    <Row label="Telefone" value={String(painel.slot.dados.telefone || '')} />
                    <Row label="Assunto" value={String(painel.slot.dados.assunto || '')} />
                    <Row label="Duração" value={
                      Number(painel.slot.dados.duracao_min) >= 60
                        ? `${Number(painel.slot.dados.duracao_min) / 60}h${Number(painel.slot.dados.duracao_min) % 60 > 0 ? `${Number(painel.slot.dados.duracao_min) % 60}min` : ''}`
                        : `${painel.slot.dados.duracao_min || 30} min`
                    } />
                    {painel.slot.dados.observacoes && <Row label="Obs" value={String(painel.slot.dados.observacoes)} />}
                  </div>

                  {/* Ações de status */}
                  <div className="mt-5 space-y-2">
                    {painel.slot.tipo === 'pendente' && (
                      <button
                        onClick={() => handleAlterarStatus('confirmado')}
                        disabled={atualizandoStatus}
                        style={{ backgroundColor: '#166534', color: '#fff' }}
                        className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                      >
                        {atualizandoStatus ? 'Atualizando...' : '✓ Confirmar Agendamento'}
                      </button>
                    )}
                    {painel.slot.tipo === 'confirmado' && (
                      <button
                        onClick={() => handleAlterarStatus('pendente')}
                        disabled={atualizandoStatus}
                        style={{ backgroundColor: '#92400e', color: '#fff' }}
                        className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                      >
                        {atualizandoStatus ? 'Atualizando...' : '↩ Voltar para Pendente'}
                      </button>
                    )}
                    <button
                      onClick={() => handleAlterarStatus('cancelado')}
                      disabled={atualizandoStatus}
                      style={{ backgroundColor: '#ef4444', color: '#fff' }}
                      className="w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                      {atualizandoStatus ? 'Atualizando...' : '🗑 Cancelar e Liberar Horário'}
                    </button>
                  </div>

                  {/* WhatsApp */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        const d = painel.slot!.dados
                        const templateData = {
                          nome: String(d.nome_fiel || ''), nome_fiel: String(d.nome_fiel || ''),
                          pastor: pastor?.nome || '', pastor_nome: pastor?.nome || '',
                          data: String(painel.data.split('-').reverse().join('/')),
                          hora: painel.hora,
                          assunto: String(d.assunto || ''),
                          telefone: String(d.telefone || ''),
                        }
                        const msg = config?.msg_lembrete
                          ? preencherTemplate(config.msg_lembrete, templateData)
                          : `Olá ${d.nome_fiel}, lembrando do seu atendimento com ${pastor?.nome || 'o(a) pastor(a)'} no dia ${templateData.data} às ${painel.hora}.`
                        waOpen(String(d.telefone || ''), msg)
                      }}
                      style={{ backgroundColor: '#25D366', color: '#fff' }}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold"
                    >📱 WA Fiel</button>
                    {pastor?.telefone && (
                      <button
                        onClick={() => {
                          const d = painel.slot!.dados
                          const templateData = {
                            nome: String(d.nome_fiel || ''), nome_fiel: String(d.nome_fiel || ''),
                            pastor: pastor.nome, pastor_nome: pastor.nome,
                            data: String(painel.data.split('-').reverse().join('/')),
                            hora: painel.hora,
                            assunto: String(d.assunto || ''),
                            telefone: String(d.telefone || ''),
                          }
                          const msg = config?.msg_pastor
                            ? preencherTemplate(config.msg_pastor, templateData)
                            : `Pastor(a) ${pastor.nome}, lembrete: atendimento com ${d.nome_fiel} no dia ${templateData.data} às ${painel.hora}.`
                          waOpen(pastor.telefone, msg)
                        }}
                        style={{ backgroundColor: '#128C7E', color: '#fff' }}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold"
                      >📱 WA Pastor</button>
                    )}
                  </div>
                  <button onClick={() => setPainel(null)} className="w-full mt-2 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700">Fechar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-semibold text-gray-600 w-24 flex-shrink-0">{label}:</span>
      <span className="text-gray-800">{value}</span>
    </div>
  )
}
