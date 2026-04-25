'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Pastor, Slot, Configuracoes } from '@/types'
import { preencherTemplate, abrirWhatsApp as waOpen } from '@/lib/whatsapp'

const HORAS_DIA = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','13:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function toStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate()-r.getDay()); return r }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1) }

function slotColor(tipo: string) {
  if (tipo === 'confirmado') return { bg: '#dcfce7', border: '#22c55e', text: '#166534' }
  if (tipo === 'pendente') return { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' }
  if (tipo === 'bloqueado') return { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' }
  return { bg: '#f9fafb', border: '#e5e7eb', text: '#9ca3af' }
}

type View = 'diaria' | 'semanal' | 'mensal'

export default function PastorAgendaPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const pastorId = Number(id)

  const [pastor, setPastor] = useState<Pastor | null>(null)
  const [config, setConfig] = useState<Configuracoes | null>(null)
  const [view, setView] = useState<View>('diaria')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [slots, setSlots] = useState<Record<string, Record<string, Slot>>>({})
  const [loading, setLoading] = useState(false)
  const [painel, setPainel] = useState<{ data: string; hora: string; slot: Slot | null } | null>(null)
  const [painelDia, setPainelDia] = useState<string | null>(null)
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [bloqueando, setBloqueando] = useState(false)
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)
  const [bloqueandoDia, setBloqueandoDia] = useState(false)

  // Novo agendamento pelo app do pastor
  const [novoAg, setNovoAg] = useState(false)
  const [novoAgForm, setNovoAgForm] = useState({ nome_fiel: '', telefone: '', assunto: '', status: 'pendente', duracao_min: 30, observacoes: '' })
  const [salvandoAg, setSalvandoAg] = useState(false)
  const [erroAg, setErroAg] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/pastores').then(r => r.json()),
      fetch('/api/configuracoes').then(r => r.json()),
    ]).then(([pasts, cfg]) => {
      const p = Array.isArray(pasts) ? pasts.find((x: Pastor) => x.id === pastorId) : null
      setPastor(p ?? null)
      if (cfg?.id) setConfig(cfg)
    })
  }, [pastorId])

  const fetchSlots = useCallback(async () => {
    if (!pastorId) return
    setLoading(true)
    try {
      let dataInicio: string, dataFim: string
      if (view === 'mensal') {
        const ini = startOfMonth(currentDate)
        const fim = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 0)
        dataInicio = toStr(ini); dataFim = toStr(fim)
      } else if (view === 'semanal') {
        const ini = startOfWeek(currentDate)
        dataInicio = toStr(ini); dataFim = toStr(addDays(ini, 6))
      } else {
        dataInicio = toStr(currentDate); dataFim = dataInicio
      }
      const res = await fetch(`/api/slots?pastorId=${pastorId}&dataInicio=${dataInicio}&dataFim=${dataFim}&_t=${Date.now()}`)
      setSlots(await res.json() || {})
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [pastorId, view, currentDate])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  const getSlot = (data: string, hora: string): Slot | null => slots?.[data]?.[hora] ?? null
  const hoje = toStr(new Date())

  const navigate = (dir: number) => {
    const d = new Date(currentDate)
    if (view === 'mensal') d.setMonth(d.getMonth()+dir)
    else if (view === 'semanal') d.setDate(d.getDate()+dir*7)
    else d.setDate(d.getDate()+dir)
    setCurrentDate(d)
  }

  const dateLabel = () => {
    if (view === 'mensal') return `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    if (view === 'semanal') {
      const ini = startOfWeek(currentDate)
      const fim = addDays(ini, 6)
      return `${ini.getDate()}/${ini.getMonth()+1} – ${fim.getDate()}/${fim.getMonth()+1}`
    }
    return `${DIAS[currentDate.getDay()]}, ${String(currentDate.getDate()).padStart(2,'0')}/${String(currentDate.getMonth()+1).padStart(2,'0')}`
  }

  const handleBloquear = async () => {
    if (!painel) return
    setBloqueando(true)
    try {
      await fetch('/api/bloqueios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastorId, data: painel.data, hora: painel.hora, motivo: motivoBloqueio }),
      })
      await fetchSlots(); setPainel(null)
    } finally { setBloqueando(false) }
  }

  const handleBloquearDia = async (data: string) => {
    setBloqueandoDia(true)
    try {
      await fetch('/api/bloqueios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pastorId, data, hora: 'dia', motivo: motivoBloqueio || 'Dia bloqueado' }),
      })
      await fetchSlots(); setPainelDia(null)
    } finally { setBloqueandoDia(false) }
  }

  const handleDesbloquearDia = async (data: string) => {
    setBloqueandoDia(true)
    try {
      await fetch(`/api/bloqueios?pastorId=${pastorId}&data=${data}`, { method: 'DELETE' })
      await fetchSlots(); setPainelDia(null)
    } finally { setBloqueandoDia(false) }
  }

  const handleDesbloquear = async () => {
    if (!painel?.slot) return
    await fetch(`/api/bloqueios/${painel.slot.dados.id}`, { method: 'DELETE' })
    await fetchSlots(); setPainel(null)
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
      await fetchSlots(); setPainel(null)
    } finally { setAtualizandoStatus(false) }
  }

  const handleSalvarAg = async () => {
    if (!novoAgForm.nome_fiel || !novoAgForm.telefone || !novoAgForm.assunto) {
      setErroAg('Preencha nome, telefone e assunto.')
      return
    }
    setSalvandoAg(true)
    setErroAg('')
    try {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...novoAgForm, pastor_id: pastorId, data: painel!.data, hora: painel!.hora }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const raw: string = body?.error ?? 'Erro ao salvar'
        throw new Error(raw.includes('BLOQUEADO') ? 'Este horário está bloqueado.' : raw)
      }
      await fetchSlots()
      setPainel(null)
      setNovoAg(false)
      setNovoAgForm({ nome_fiel: '', telefone: '', assunto: '', status: 'pendente', duracao_min: 30, observacoes: '' })
    } catch (e: any) {
      setErroAg(e.message || 'Erro ao salvar agendamento')
    } finally {
      setSalvandoAg(false)
    }
  }

  const templateData = (d: Record<string, unknown>) => ({
    nome: String(d.nome_fiel||''), nome_fiel: String(d.nome_fiel||''),
    pastor: pastor?.nome||'', pastor_nome: pastor?.nome||'',
    data: painel ? painel.data.split('-').reverse().join('/') : '',
    hora: painel?.hora||'',
    assunto: String(d.assunto||''),
    telefone: String(d.telefone||''),
  })

  // ── Vistas ──
  const daysInMonth = () => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth()
    const first = new Date(year, month, 1)
    const last = new Date(year, month+1, 0)
    const days: (Date|null)[] = []
    for (let i = 0; i < first.getDay(); i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }

  const weekDays = () => {
    const ini = startOfWeek(currentDate)
    return Array.from({length:7}, (_,i) => addDays(ini,i))
  }

  const slotsDia = painelDia
    ? Object.entries(slots[painelDia] || {}).sort(([a],[b]) => a.localeCompare(b))
    : []

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f0f2f5' }}>

      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ backgroundColor: '#002347', borderBottom: '3px solid #C5A059' }}
      >
        <button onClick={() => router.push('/pastor')} className="text-white text-2xl leading-none pr-1">‹</button>
        {pastor?.imagem ? (
          <img src={pastor.imagem} alt={pastor.nome} className="w-9 h-9 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid #C5A059' }} />
        ) : (
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ backgroundColor: '#C5A059', color: '#002347' }}>
            {pastor?.nome?.charAt(0) || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p style={{ color: '#C5A059' }} className="font-bold text-sm leading-tight truncate">{pastor?.nome || 'Carregando...'}</p>
          <p className="text-white text-xs opacity-60">Agenda</p>
        </div>
        <button
          onClick={fetchSlots}
          className="text-white opacity-70 active:opacity-100 text-lg leading-none p-1"
        >↻</button>
      </div>

      {/* View switcher */}
      <div className="flex gap-1 p-3 pb-0">
        {(['diaria','semanal','mensal'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={view === v ? { backgroundColor: '#002347', color: '#fff' } : { backgroundColor: '#fff', color: '#374151' }}
            className="flex-1 py-2 rounded-lg text-xs font-bold shadow-sm"
          >
            {v === 'diaria' ? 'Diária' : v === 'semanal' ? 'Semanal' : 'Mensal'}
          </button>
        ))}
      </div>

      {/* Date nav */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => navigate(-1)} style={{ backgroundColor: '#002347', color: '#fff' }} className="w-9 h-9 rounded-lg font-bold text-sm flex-shrink-0">◀</button>
        <span style={{ color: '#002347' }} className="flex-1 text-center text-sm font-bold">{dateLabel()}</span>
        <button onClick={() => navigate(1)} style={{ backgroundColor: '#002347', color: '#fff' }} className="w-9 h-9 rounded-lg font-bold text-sm flex-shrink-0">▶</button>
        <button onClick={() => setCurrentDate(new Date())} style={{ backgroundColor: '#C5A059', color: '#002347' }} className="px-3 h-9 rounded-lg text-xs font-bold flex-shrink-0">Hoje</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#002347', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <>
            {/* ── DIÁRIA ── */}
            {view === 'diaria' && (
              <div className="space-y-2 mt-1">
                {/* Botões bloquear/desbloquear dia */}
                <div className="flex gap-2 pb-1">
                  <button
                    onClick={() => handleBloquearDia(toStr(currentDate))}
                    disabled={bloqueandoDia}
                    style={{ backgroundColor: '#002347', color: '#fff' }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                  >
                    {bloqueandoDia ? '...' : '🔒 Bloquear Dia'}
                  </button>
                  {Object.values(slots[toStr(currentDate)] || {}).some(s => s.tipo === 'bloqueado') && (
                    <button
                      onClick={() => handleDesbloquearDia(toStr(currentDate))}
                      disabled={bloqueandoDia}
                      style={{ backgroundColor: '#ef4444', color: '#fff' }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      🔓 Desbloquear
                    </button>
                  )}
                </div>
                {HORAS_DIA.map(hora => {
                  const ds = toStr(currentDate)
                  const slot = getSlot(ds, hora)
                  const cor = slot ? slotColor(slot.tipo) : { bg: '#fff', border: '#e5e7eb', text: '#9ca3af' }
                  return (
                    <button
                      key={hora}
                      onClick={() => { setPainel({ data: ds, hora, slot }); setMotivoBloqueio('') }}
                      style={{ backgroundColor: cor.bg, borderColor: cor.border, color: cor.text }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left active:scale-95 transition-transform"
                    >
                      <span className="text-sm font-bold w-12 flex-shrink-0" style={{ color: '#002347' }}>{hora}</span>
                      <span className="flex-1 text-sm font-medium truncate">
                        {slot
                          ? slot.tipo === 'bloqueado'
                            ? `🔒 ${String(slot.dados.motivo || 'Bloqueado')}`
                            : `${String(slot.dados.nome_fiel||'')} — ${String(slot.dados.assunto||'')}`
                          : 'Livre'}
                      </span>
                      {slot && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: cor.border, color: '#fff' }}>
                          {slot.tipo}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── SEMANAL ── */}
            {view === 'semanal' && (
              <div className="mt-1 bg-white rounded-xl overflow-hidden shadow-sm">
                {/* Header dias */}
                <div className="grid grid-cols-8 border-b">
                  <div className="py-2 text-center text-xs text-gray-400 font-semibold border-r">H</div>
                  {weekDays().map(day => {
                    const ds = toStr(day)
                    const isToday = ds === hoje
                    return (
                      <div key={ds} className="py-2 text-center border-r last:border-r-0" style={{ backgroundColor: isToday ? '#fffbf0' : undefined }}>
                        <p className="text-xs font-bold" style={{ color: isToday ? '#C5A059' : '#374151' }}>{DIAS[day.getDay()]}</p>
                        <p className="text-xs" style={{ color: isToday ? '#C5A059' : '#9ca3af' }}>{day.getDate()}</p>
                      </div>
                    )
                  })}
                </div>
                {/* Rows */}
                {HORAS_DIA.map(hora => (
                  <div key={hora} className="grid grid-cols-8 border-b last:border-b-0">
                    <div className="py-2 px-1 text-center text-xs text-gray-400 font-semibold border-r flex items-center justify-center">{hora}</div>
                    {weekDays().map(day => {
                      const ds = toStr(day)
                      const slot = getSlot(ds, hora)
                      const cor = slot ? slotColor(slot.tipo) : { bg: '#fff', border: 'transparent', text: '#e5e7eb' }
                      return (
                        <button
                          key={ds}
                          onClick={() => { setPainel({ data: ds, hora, slot }); setMotivoBloqueio('') }}
                          style={{ backgroundColor: cor.bg }}
                          className="border-r last:border-r-0 py-1 px-0.5 min-h-[36px] flex items-center justify-center"
                        >
                          {slot ? (
                            <span className="text-xs font-semibold leading-tight text-center" style={{ color: cor.text }}>
                              {slot.tipo === 'bloqueado' ? '🔒' : String(slot.dados.nome_fiel||'').split(' ')[0]}
                            </span>
                          ) : (
                            <span style={{ color: '#e5e7eb', fontSize: 10 }}>·</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* ── MENSAL ── */}
            {view === 'mensal' && (
              <div className="mt-1">
                <div className="grid grid-cols-7 mb-1">
                  {DIAS.map(d => <div key={d} className="text-center text-xs font-bold text-gray-500 py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysInMonth().map((day, i) => {
                    if (!day) return <div key={`e${i}`} />
                    const ds = toStr(day)
                    const daySlots = slots[ds] || {}
                    const ags = Object.entries(daySlots).filter(([,s]) => s.tipo !== 'bloqueado')
                    const blk = Object.entries(daySlots).filter(([,s]) => s.tipo === 'bloqueado')
                    const isToday = ds === hoje
                    const total = ags.length + blk.length
                    return (
                      <button
                        key={ds}
                        onClick={() => { setPainelDia(ds); setPainel(null) }}
                        style={{
                          border: isToday ? '2px solid #C5A059' : '1px solid #e5e7eb',
                          backgroundColor: isToday ? '#fffbf0' : '#fff',
                          minHeight: 64,
                        }}
                        className="rounded-xl p-1.5 text-left active:scale-95 transition-transform"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold" style={{ color: isToday ? '#C5A059' : '#374151' }}>
                            {day.getDate()}
                          </span>
                          {total > 0 && (
                            <span className="text-xs font-bold rounded-full px-1 leading-tight" style={{ backgroundColor: '#002347', color: '#C5A059', fontSize: 9 }}>
                              {total}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {ags.slice(0,2).map(([h,s]) => (
                            <div key={h} className="rounded px-1 text-xs truncate leading-tight" style={{ backgroundColor: s.tipo==='confirmado'?'#dcfce7':'#fef3c7', color: s.tipo==='confirmado'?'#166534':'#92400e' }}>
                              {h.slice(0,5)} {String(s.dados.nome_fiel||'').split(' ')[0]}
                            </div>
                          ))}
                          {blk.length > 0 && ags.length < 2 && (
                            <div className="rounded px-1 text-xs truncate leading-tight" style={{ backgroundColor:'#f3f4f6', color:'#6b7280' }}>🔒</div>
                          )}
                          {ags.length > 2 && <div className="text-xs text-gray-400 pl-0.5">+{ags.length-2}</div>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── PAINEL DIA (mensal → toque no dia) ── */}
      {painelDia && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={(e) => { if (e.target === e.currentTarget) setPainelDia(null) }}>
          <div className="bg-white rounded-t-3xl max-h-[80vh] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '2px solid #C5A059' }}>
              <div>
                <p style={{ color: '#002347' }} className="font-bold text-base">{painelDia.split('-').reverse().join('/')}</p>
                <p className="text-xs text-gray-500">{pastor?.nome}</p>
              </div>
              <button onClick={() => setPainelDia(null)} style={{ color: '#002347' }} className="text-2xl leading-none font-bold">×</button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex-1">
              {slotsDia.length === 0 ? (
                <p className="text-green-600 font-semibold text-sm text-center py-4">✓ Nenhum agendamento neste dia</p>
              ) : (
                <div className="space-y-3">
                  {slotsDia.map(([hora, slot]) => {
                    const cor = slotColor(slot.tipo)
                    return (
                      <button
                        key={hora}
                        className="w-full rounded-xl p-3 text-left active:opacity-80"
                        style={{ backgroundColor: cor.bg, border: `1px solid ${cor.border}` }}
                        onClick={() => { setPainel({ data: painelDia, hora, slot }); setPainelDia(null); setMotivoBloqueio('') }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm" style={{ color: cor.text }}>{hora}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: cor.border, color: '#fff' }}>{slot.tipo}</span>
                        </div>
                        {slot.tipo === 'bloqueado' ? (
                          <p className="text-xs text-gray-500">🔒 {String(slot.dados.motivo || 'Bloqueado')}</p>
                        ) : (
                          <>
                            <p className="font-semibold text-sm" style={{ color: cor.text }}>{String(slot.dados.nome_fiel||'')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{String(slot.dados.assunto||'')}</p>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Bloquear / Desbloquear dia inteiro */}
              <div className="mt-4 space-y-2">
                <input
                  type="text"
                  value={motivoBloqueio}
                  onChange={(e) => setMotivoBloqueio(e.target.value)}
                  placeholder="Motivo do bloqueio (opcional)"
                  className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
                  style={{ borderColor: '#e5e7eb' }}
                />
                <button
                  onClick={() => handleBloquearDia(painelDia!)}
                  disabled={bloqueandoDia}
                  style={{ backgroundColor: '#002347', color: '#fff' }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {bloqueandoDia ? 'Bloqueando...' : '🔒 Bloquear Dia Inteiro'}
                </button>
                {Object.values(slots[painelDia!] || {}).some(s => s.tipo === 'bloqueado') && (
                  <button
                    onClick={() => handleDesbloquearDia(painelDia!)}
                    disabled={bloqueandoDia}
                    style={{ backgroundColor: '#ef4444', color: '#fff' }}
                    className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    {bloqueandoDia ? '...' : '🔓 Desbloquear Dia Inteiro'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAINEL SLOT ── */}
      {painel && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={(e) => { if (e.target === e.currentTarget) { setPainel(null); setNovoAg(false); setErroAg('') } }}>
          <div className="bg-white rounded-t-3xl max-h-[90vh] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <p style={{ color: '#002347' }} className="font-bold text-base">{painel.hora} — {painel.data.split('-').reverse().join('/')}</p>
                <p className="text-xs text-gray-500">{pastor?.nome}</p>
              </div>
              <button onClick={() => { setPainel(null); setNovoAg(false); setErroAg('') }} style={{ color: '#002347' }} className="text-2xl leading-none font-bold">×</button>
            </div>

            <div className="overflow-y-auto px-5 py-4 flex-1">
              {/* Horário livre */}
              {!painel.slot && (
                <div className="space-y-3">
                  <p className="text-green-600 font-bold text-sm">✓ Horário Livre — {painel.hora} · {painel.data.split('-').reverse().join('/')}</p>

                  {!novoAg ? (
                    <>
                      <button
                        onClick={() => { setNovoAg(true); setErroAg('') }}
                        style={{ backgroundColor: '#C5A059', color: '#002347' }}
                        className="w-full py-3.5 rounded-xl font-bold text-sm"
                      >
                        📅 Novo Agendamento
                      </button>
                      <div className="border-t pt-3" style={{ borderColor: '#f3f4f6' }}>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Motivo do bloqueio (opcional)</label>
                        <input
                          type="text"
                          value={motivoBloqueio}
                          onChange={(e) => setMotivoBloqueio(e.target.value)}
                          placeholder="Ex: Reunião interna"
                          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
                          style={{ borderColor: '#e5e7eb' }}
                        />
                        <button
                          onClick={handleBloquear}
                          disabled={bloqueando}
                          style={{ backgroundColor: '#374151', color: '#fff' }}
                          className="w-full mt-2 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                        >
                          {bloqueando ? 'Bloqueando...' : '🔒 Bloquear Horário'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setNovoAg(false); setErroAg('') }}
                        className="text-sm text-gray-500 font-semibold flex items-center gap-1"
                      >
                        ‹ Voltar
                      </button>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Nome do fiel *"
                          value={novoAgForm.nome_fiel}
                          onChange={(e) => setNovoAgForm(f => ({ ...f, nome_fiel: e.target.value }))}
                          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
                          style={{ borderColor: '#e5e7eb' }}
                        />
                        <input
                          type="tel"
                          placeholder="Telefone (WhatsApp) *"
                          value={novoAgForm.telefone}
                          onChange={(e) => setNovoAgForm(f => ({ ...f, telefone: e.target.value }))}
                          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
                          style={{ borderColor: '#e5e7eb' }}
                        />
                        <input
                          type="text"
                          placeholder="Assunto *"
                          value={novoAgForm.assunto}
                          onChange={(e) => setNovoAgForm(f => ({ ...f, assunto: e.target.value }))}
                          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none"
                          style={{ borderColor: '#e5e7eb' }}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={novoAgForm.status}
                            onChange={(e) => setNovoAgForm(f => ({ ...f, status: e.target.value }))}
                            className="border rounded-xl px-3 py-3 text-sm focus:outline-none"
                            style={{ borderColor: '#e5e7eb' }}
                          >
                            <option value="pendente">Pendente</option>
                            <option value="confirmado">Confirmado</option>
                          </select>
                          <select
                            value={novoAgForm.duracao_min}
                            onChange={(e) => setNovoAgForm(f => ({ ...f, duracao_min: Number(e.target.value) }))}
                            className="border rounded-xl px-3 py-3 text-sm focus:outline-none"
                            style={{ borderColor: '#e5e7eb' }}
                          >
                            <option value={30}>30 min</option>
                            <option value={60}>1 hora</option>
                            <option value={90}>1h30</option>
                            <option value={120}>2 horas</option>
                          </select>
                        </div>
                        <textarea
                          placeholder="Observações (opcional)"
                          value={novoAgForm.observacoes}
                          onChange={(e) => setNovoAgForm(f => ({ ...f, observacoes: e.target.value }))}
                          rows={2}
                          className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                          style={{ borderColor: '#e5e7eb' }}
                        />
                      </div>

                      {erroAg && <p className="text-red-500 text-sm font-semibold">{erroAg}</p>}

                      <button
                        onClick={handleSalvarAg}
                        disabled={salvandoAg}
                        style={{ backgroundColor: '#002347', color: '#fff' }}
                        className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
                      >
                        {salvandoAg ? 'Salvando...' : '💾 Salvar Agendamento'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Bloqueado */}
              {painel.slot?.tipo === 'bloqueado' && (
                <div className="space-y-3">
                  <div className="bg-gray-100 rounded-xl p-4">
                    <p className="font-bold text-gray-700 mb-1">🔒 Horário Bloqueado</p>
                    <p className="text-sm text-gray-500">Motivo: {String(painel.slot.dados.motivo || '—')}</p>
                  </div>
                  <button
                    onClick={handleDesbloquear}
                    style={{ backgroundColor: '#ef4444', color: '#fff' }}
                    className="w-full py-3.5 rounded-xl font-bold text-sm"
                  >
                    🔓 Desbloquear
                  </button>
                </div>
              )}

              {/* Agendamento */}
              {(painel.slot?.tipo === 'confirmado' || painel.slot?.tipo === 'pendente') && (() => {
                const d = painel.slot!.dados
                const cor = slotColor(painel.slot!.tipo)
                return (
                  <div className="space-y-4">
                    {/* Status badge */}
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: cor.border, color: '#fff' }}>
                        {painel.slot!.tipo.toUpperCase()}
                      </span>
                    </div>

                    {/* Dados */}
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                      <InfoRow label="Fiel" value={String(d.nome_fiel||'')} />
                      <InfoRow label="Telefone" value={String(d.telefone||'')} />
                      <InfoRow label="Assunto" value={String(d.assunto||'')} />
                      <InfoRow label="Duração" value={
                        Number(d.duracao_min) >= 60
                          ? `${Math.floor(Number(d.duracao_min)/60)}h${Number(d.duracao_min)%60>0?`${Number(d.duracao_min)%60}min`:''}`
                          : `${d.duracao_min||30} min`
                      } />
                      {d.observacoes && <InfoRow label="Obs" value={String(d.observacoes)} />}
                    </div>

                    {/* Ações de status */}
                    <div className="space-y-2">
                      {painel.slot!.tipo === 'pendente' && (
                        <button
                          onClick={() => handleAlterarStatus('confirmado')}
                          disabled={atualizandoStatus}
                          style={{ backgroundColor: '#166534', color: '#fff' }}
                          className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
                        >
                          {atualizandoStatus ? 'Atualizando...' : '✓ Confirmar Agendamento'}
                        </button>
                      )}
                      {painel.slot!.tipo === 'confirmado' && (
                        <button
                          onClick={() => handleAlterarStatus('pendente')}
                          disabled={atualizandoStatus}
                          style={{ backgroundColor: '#92400e', color: '#fff' }}
                          className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
                        >
                          {atualizandoStatus ? 'Atualizando...' : '↩ Voltar para Pendente'}
                        </button>
                      )}
                      <button
                        onClick={() => handleAlterarStatus('cancelado')}
                        disabled={atualizandoStatus}
                        style={{ backgroundColor: '#ef4444', color: '#fff' }}
                        className="w-full py-3.5 rounded-xl font-bold text-sm disabled:opacity-50"
                      >
                        {atualizandoStatus ? 'Atualizando...' : '🗑 Cancelar e Liberar Horário'}
                      </button>
                    </div>

                    {/* WhatsApp */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const td = templateData(d)
                          const msg = config?.msg_lembrete
                            ? preencherTemplate(config.msg_lembrete, td)
                            : `Olá ${d.nome_fiel}, lembrando do atendimento com ${pastor?.nome||'o pastor'} no dia ${td.data} às ${painel.hora}.`
                          waOpen(String(d.telefone||''), msg)
                        }}
                        style={{ backgroundColor: '#25D366', color: '#fff' }}
                        className="flex-1 py-3 rounded-xl font-bold text-sm"
                      >📱 WA Fiel</button>
                      {pastor?.telefone && (
                        <button
                          onClick={() => {
                            const td = templateData(d)
                            const msg = config?.msg_pastor
                              ? preencherTemplate(config.msg_pastor, td)
                              : `Lembrete: atendimento com ${d.nome_fiel} no dia ${td.data} às ${painel.hora}.`
                            waOpen(pastor.telefone, msg)
                          }}
                          style={{ backgroundColor: '#128C7E', color: '#fff' }}
                          className="flex-1 py-3 rounded-xl font-bold text-sm"
                        >📱 WA Pastor</button>
                      )}
                    </div>

                    <button onClick={() => setPainel(null)} className="w-full py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-600">
                      Fechar
                    </button>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">{label}:</span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  )
}
