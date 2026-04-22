'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import AgItem from '@/components/AgItem'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Agendamento, Pastor } from '@/types'

const DIAS_SEMANA_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function hoje(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dia = DIAS_SEMANA_PT[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mes = MESES_PT[d.getMonth()]
  return `${dia}, ${dd} de ${mes} de ${yyyy}`
}

export default function DashboardPage() {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [proximosLivres, setProximosLivres] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const dataHoje = hoje()

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [resAg, resPast] = await Promise.all([
          fetch(`/api/agendamentos?dataInicio=${dataHoje}&dataFim=${dataHoje}`),
          fetch('/api/pastores'),
        ])
        if (!resAg.ok || !resPast.ok) throw new Error('Erro ao carregar dados')
        const ags = await resAg.json()
        const pasts = await resPast.json()
        setAgendamentos(Array.isArray(ags) ? ags : [])
        setPastores(Array.isArray(pasts) ? pasts : [])
      } catch (e: any) {
        setErro(e.message || 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [dataHoje])

  useEffect(() => {
    if (pastores.length === 0) return
    pastores.forEach(async (p) => {
      try {
        const res = await fetch(`/api/agendamentos/proximo-livre?pastorId=${p.id}`)
        if (res.ok) {
          const json = await res.json()
          const proximo = json.proximo as { data: string; hora: string } | null
          if (proximo) {
            const [y, m, d] = proximo.data.split('-')
            const label = proximo.data === dataHoje
              ? `Hoje às ${proximo.hora}`
              : `${d}/${m}/${y} às ${proximo.hora}`
            setProximosLivres((prev) => ({ ...prev, [p.id]: label }))
          } else {
            setProximosLivres((prev) => ({ ...prev, [p.id]: 'Sem horário livre' }))
          }
        } else {
          setProximosLivres((prev) => ({ ...prev, [p.id]: 'Indisponível' }))
        }
      } catch {
        setProximosLivres((prev) => ({ ...prev, [p.id]: 'Indisponível' }))
      }
    })
  }, [pastores, dataHoje])

  const confirmados = agendamentos.filter((a) => a.status === 'confirmado').length
  const pendentes = agendamentos.filter((a) => a.status === 'pendente').length
  const pastoresOcupados = new Set(
    agendamentos.filter((a) => a.status !== 'cancelado').map((a) => a.pastor_id)
  ).size

  const agsPorPastor = (pastorId: number) =>
    agendamentos
      .filter((a) => a.pastor_id === pastorId)
      .sort((a, b) => a.hora.localeCompare(b.hora))

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader
        logo
        title="Secretaria IBTM"
        subtitle={formatDatePT(dataHoje)}
      />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-6">
          {erro}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Hoje" value={agendamentos.length} color="#C5A059" bg="#fffbea" />
        <MetricCard label="Confirmados" value={confirmados} color="#166534" bg="#f0fdf4" />
        <MetricCard label="Pendentes" value={pendentes} color="#92400e" bg="#fffbea" />
        <MetricCard label="Pastores Ocupados" value={pastoresOcupados} color="#002347" bg="#eff6ff" />
      </div>

      {/* Pastor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {pastores.map((pastor) => {
          const ags = agsPorPastor(pastor.id)
          return (
            <div key={pastor.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Pastor Header */}
              <div
                style={{ backgroundColor: '#002347', borderBottom: '2px solid #C5A059' }}
                className="flex items-center gap-3 px-4 py-3"
              >
                {pastor.imagem ? (
                  <img
                    src={pastor.imagem}
                    alt={pastor.nome}
                    className="w-10 h-10 rounded-full object-cover border-2"
                    style={{ borderColor: '#C5A059' }}
                  />
                ) : (
                  <div
                    style={{ backgroundColor: '#C5A059', color: '#002347' }}
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                  >
                    {pastor.nome.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{pastor.nome}</p>
                  <p style={{ color: '#C5A059' }} className="text-xs">
                    {ags.length} agendamento{ags.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Agendamentos */}
              <div className="px-4 py-3 max-h-64 overflow-y-auto">
                {ags.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">Nenhum agendamento</p>
                ) : (
                  ags.map((ag) => <AgItem key={ag.id} ag={ag} />)
                )}
              </div>

              {/* Próximo Livre */}
              <div
                style={{ borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
                className="px-4 py-2"
              >
                <p className="text-xs text-gray-500">
                  Próximo livre:{' '}
                  <span style={{ color: '#002347' }} className="font-semibold">
                    {proximosLivres[pastor.id] ?? 'Carregando...'}
                  </span>
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {pastores.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <img src="/logo.png" alt="IBTM" className="mx-auto mb-3" style={{ height: 64, opacity: 0.4 }} />
          <p className="font-semibold">Nenhum pastor cadastrado.</p>
          <p className="text-sm mt-1">
            Acesse{' '}
            <a href="/cadastros/pastores" style={{ color: '#C5A059' }} className="underline">
              Cadastros → Pastores
            </a>{' '}
            para adicionar pastores.
          </p>
        </div>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  color,
  bg,
}: {
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div
      style={{ backgroundColor: bg, borderTop: `4px solid ${color}` }}
      className="bg-white rounded-xl shadow-sm px-5 py-4"
    >
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-sm text-gray-600 mt-1 font-medium">{label}</p>
    </div>
  )
}
