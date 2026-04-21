'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import Badge from '@/components/Badge'
import { Agendamento, Pastor } from '@/types'

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dayOfWeek = d.getDay() // 0 = Sunday
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

const DIAS_SEMANA_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function abrirWhatsApp(telefone: string, mensagem: string) {
  const num = telefone.replace(/\D/g, '')
  const url = `https://wa.me/${num.startsWith('55') ? num : '55' + num}?text=${encodeURIComponent(mensagem)}`
  window.open(url, '_blank')
}

export default function AgendaSemanaPage() {
  const [semanaInicio, setSemanaInicio] = useState(getMondayOfWeek(hoje()))
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroP, setFiltroP] = useState('')
  const [erro, setErro] = useState('')

  const diasSemana = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i))
  const semanaFim = diasSemana[6]

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      let url = `/api/agendamentos?dataInicio=${semanaInicio}&dataFim=${semanaFim}`
      if (filtroP) url += `&pastorId=${filtroP}`
      const [resAg, resPast] = await Promise.all([
        fetch(url),
        fetch('/api/pastores'),
      ])
      const ags = await resAg.json()
      const pasts = await resPast.json()
      setAgendamentos(Array.isArray(ags) ? ags.filter((a: Agendamento) => a.status !== 'cancelado') : [])
      setPastores(Array.isArray(pasts) ? pasts : [])
    } catch {
      setErro('Erro ao carregar agenda da semana')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [semanaInicio, filtroP])

  const agsDia = (data: string) =>
    agendamentos.filter((a) => a.data === data).sort((a, b) => a.hora.localeCompare(b.hora))

  const totalSemana = agendamentos.length
  const confirmadosSemana = agendamentos.filter((a) => a.status === 'confirmado').length

  return (
    <div>
      <PageHeader
        icon="📊"
        title="Agenda da Semana"
        subtitle={`${semanaInicio.split('-').reverse().join('/')} a ${semanaFim.split('-').reverse().join('/')}`}
      />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>
      )}

      {/* Controles */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setSemanaInicio(addDays(semanaInicio, -7))}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
        >
          ← Semana Anterior
        </button>
        <button
          onClick={() => setSemanaInicio(getMondayOfWeek(hoje()))}
          style={{ backgroundColor: '#C5A059', color: '#002347' }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Semana Atual
        </button>
        <button
          onClick={() => setSemanaInicio(addDays(semanaInicio, 7))}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Próxima Semana →
        </button>

        <select
          value={filtroP}
          onChange={(e) => setFiltroP(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
          style={{ borderColor: '#e5e7eb' }}
        >
          <option value="">Todos os pastores</option>
          {pastores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>

        <div className="ml-auto flex gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-full font-semibold" style={{ backgroundColor: '#eff6ff', color: '#002347' }}>
            Total: {totalSemana}
          </span>
          <span className="px-3 py-1.5 rounded-full font-semibold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
            Confirmados: {confirmadosSemana}
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {diasSemana.map((dia) => {
            const ags = agsDia(dia)
            const d = new Date(dia + 'T12:00:00')
            const isHoje = dia === hoje()
            return (
              <div
                key={dia}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
                style={{ borderTop: isHoje ? '3px solid #C5A059' : '3px solid transparent' }}
              >
                {/* Header do dia */}
                <div
                  className="px-3 py-2 text-center"
                  style={{ backgroundColor: isHoje ? '#002347' : '#f9fafb' }}
                >
                  <p
                    className="text-xs font-semibold"
                    style={{ color: isHoje ? '#C5A059' : '#6b7280' }}
                  >
                    {DIAS_SEMANA_PT[d.getDay()]}
                  </p>
                  <p
                    className="text-lg font-bold leading-tight"
                    style={{ color: isHoje ? '#ffffff' : '#002347' }}
                  >
                    {String(d.getDate()).padStart(2, '0')}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: isHoje ? '#a0aec0' : '#9ca3af' }}
                  >
                    {MESES_PT[d.getMonth()]}
                  </p>
                </div>

                {/* Agendamentos do dia */}
                <div className="px-2 py-2 space-y-1.5 min-h-[80px]">
                  {ags.length === 0 ? (
                    <p className="text-center text-xs text-gray-300 py-2">—</p>
                  ) : (
                    ags.map((ag) => (
                      <div
                        key={ag.id}
                        className="rounded-lg px-2 py-1.5 text-xs"
                        style={{
                          backgroundColor: ag.status === 'confirmado' ? '#f0fdf4' : '#fffbea',
                          borderLeft: `2px solid ${ag.status === 'confirmado' ? '#22c55e' : '#f59e0b'}`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-gray-700">{ag.hora.slice(0, 5)}</span>
                          <Badge status={ag.status} />
                        </div>
                        <p className="font-semibold text-gray-800 truncate">{ag.nome_fiel}</p>
                        <p className="text-gray-500 truncate">{ag.assunto}</p>
                        {ag.pastor_nome && (
                          <p className="text-gray-400 truncate mt-0.5">{ag.pastor_nome}</p>
                        )}
                        {ag.telefone && (
                          <button
                            onClick={() =>
                              abrirWhatsApp(
                                ag.telefone,
                                `Olá ${ag.nome_fiel}, lembramos do seu atendimento no dia ${dia.split('-').reverse().join('/')} às ${ag.hora.slice(0, 5)}.`
                              )
                            }
                            className="mt-1 font-semibold"
                            style={{ color: '#166534' }}
                          >
                            📱
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {ags.length > 0 && (
                  <div className="px-2 pb-2 text-center">
                    <span className="text-xs text-gray-400">
                      {ags.length} agend.
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
