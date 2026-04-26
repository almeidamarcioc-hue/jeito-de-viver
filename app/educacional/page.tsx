'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_PT = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']

function formatDatePT(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS_PT[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} de ${MESES_PT[d.getMonth()]}`
}

interface Stats { alunos: number; turmas: number; professores: number }
interface AgItem { id: number; hora: string; assunto: string; aluno_nome: string; turma_nome: string; status: string }

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  confirmado: { bg: '#f0fdf4', text: '#166534', border: '#22c55e' },
  cancelado:  { bg: '#fef2f2', text: '#991b1b', border: '#ef4444' },
  remarcado:  { bg: '#eff6ff', text: '#1e40af', border: '#3b82f6' },
}

export default function EducacionalDashboard() {
  const [stats, setStats] = useState<Stats>({ alunos: 0, turmas: 0, professores: 0 })
  const [agenda, setAgenda] = useState<AgItem[]>([])
  const [loading, setLoading] = useState(true)
  const hoje = toDateStr(new Date())

  useEffect(() => {
    async function load() {
      try {
        const [resAlunos, resTurmas, resProf, resAg] = await Promise.all([
          fetch('/api/educacional/alunos'),
          fetch('/api/educacional/turmas'),
          fetch('/api/educacional/professores'),
          fetch(`/api/educacional/agendamentos?data=${hoje}`),
        ])
        const [alunos, turmas, professores, agendamentos] = await Promise.all([
          resAlunos.json(), resTurmas.json(), resProf.json(), resAg.json(),
        ])
        setStats({
          alunos: Array.isArray(alunos) ? alunos.filter((a: any) => a.ativo !== false).length : 0,
          turmas: Array.isArray(turmas) ? turmas.filter((t: any) => t.ativo !== false).length : 0,
          professores: Array.isArray(professores) ? professores.length : 0,
        })
        setAgenda(Array.isArray(agendamentos) ? agendamentos : [])
      } catch { /* silently ignore */ }
      finally { setLoading(false) }
    }
    load()
  }, [hoje])

  if (loading) return <LoadingSpinner />

  const cards = [
    { label: 'Alunos Ativos', value: stats.alunos, icon: '🎒', color: '#E07535', href: '/educacional/cadastros/alunos' },
    { label: 'Turmas Ativas', value: stats.turmas, icon: '🏫', color: '#1F2937', href: '/educacional/cadastros/turmas' },
    { label: 'Professores', value: stats.professores, icon: '👨‍🏫', color: '#4B5563', href: '/educacional/cadastros/professores' },
    { label: 'Agenda de Hoje', value: agenda.length, icon: '📅', color: '#7C3AED', href: '/educacional/agenda' },
  ]

  return (
    <div>
      <PageHeader icon="🏫" title="Centro Educacional" subtitle="Jeito de Viver" />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map(c => (
          <a key={c.label} href={c.href} className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-1 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl">{c.icon}</span>
              <span className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</span>
            </div>
            <p className="text-xs font-semibold text-gray-500">{c.label}</p>
          </a>
        ))}
      </div>

      {/* Today's agenda */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base" style={{ color: '#1F2937' }}>Agenda de Hoje</h2>
          <span className="text-sm text-gray-500">{formatDatePT(hoje)}</span>
        </div>

        {agenda.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">📅</p>
            <p className="font-semibold text-sm">Nenhum agendamento para hoje.</p>
            <a href="/educacional/agenda" style={{ color: '#E07535' }} className="text-sm underline mt-1 inline-block">Ir para a agenda</a>
          </div>
        ) : (
          <div className="space-y-2">
            {agenda.sort((a, b) => a.hora.localeCompare(b.hora)).map(ag => {
              const cfg = STATUS_COLORS[ag.status] ?? STATUS_COLORS.confirmado
              return (
                <div key={ag.id} style={{ backgroundColor: cfg.bg, borderLeft: `3px solid ${cfg.border}` }} className="rounded-lg px-3 py-2.5 flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700 w-12 flex-shrink-0">{ag.hora.substring(0,5)}</span>
                  <div className="flex-1 min-w-0">
                    {ag.aluno_nome && <p className="text-sm font-semibold text-gray-800 truncate">🎒 {ag.aluno_nome}</p>}
                    {ag.turma_nome && <p className="text-xs text-gray-500 truncate">🏫 {ag.turma_nome}</p>}
                    {ag.assunto && <p className="text-xs text-gray-400 truncate">{ag.assunto}</p>}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ color: cfg.text, backgroundColor: cfg.border + '22' }}>
                    {ag.status}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
