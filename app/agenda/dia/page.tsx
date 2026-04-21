'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import Badge from '@/components/Badge'
import { Pastor, Agendamento } from '@/types'

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const DIAS_SEMANA_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS_SEMANA_PT[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`
}

function abrirWhatsApp(telefone: string, mensagem: string) {
  const num = telefone.replace(/\D/g, '')
  const url = `https://wa.me/${num.startsWith('55') ? num : '55' + num}?text=${encodeURIComponent(mensagem)}`
  window.open(url, '_blank')
}

export default function AgendaDiaPage() {
  const [dataSelecionada, setDataSelecionada] = useState(hoje())
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = async (data: string) => {
    setLoading(true)
    setErro('')
    try {
      const [resAg, resPast] = await Promise.all([
        fetch(`/api/agendamentos?dataInicio=${data}&dataFim=${data}`),
        fetch('/api/pastores'),
      ])
      const ags = await resAg.json()
      const pasts = await resPast.json()
      setAgendamentos(Array.isArray(ags) ? ags.filter((a: Agendamento) => a.status !== 'cancelado') : [])
      setPastores(Array.isArray(pasts) ? pasts : [])
    } catch {
      setErro('Erro ao carregar agenda do dia')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar(dataSelecionada)
  }, [dataSelecionada])

  const agsPorPastor = (pastorId: number) =>
    agendamentos.filter((a) => a.pastor_id === pastorId).sort((a, b) => a.hora.localeCompare(b.hora))

  return (
    <div>
      <PageHeader icon="📆" title="Agenda do Dia" subtitle={formatDatePT(dataSelecionada)} />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>
      )}

      {/* Controles de Data */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setDataSelecionada(addDays(dataSelecionada, -1))}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
        >
          ← Dia Anterior
        </button>
        <input
          type="date"
          value={dataSelecionada}
          onChange={(e) => setDataSelecionada(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: '#e5e7eb' }}
        />
        <button
          onClick={() => setDataSelecionada(hoje())}
          style={{ backgroundColor: '#C5A059', color: '#002347' }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Hoje
        </button>
        <button
          onClick={() => setDataSelecionada(addDays(dataSelecionada, 1))}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Próximo Dia →
        </button>

        <div className="ml-auto">
          <span
            className="text-sm font-semibold px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#eff6ff', color: '#002347' }}
          >
            {agendamentos.length} agendamento(s)
          </span>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : agendamentos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-5xl mb-3">📆</p>
          <p className="font-semibold">Nenhum agendamento para este dia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pastores.map((pastor) => {
            const ags = agsPorPastor(pastor.id)
            if (ags.length === 0) return null
            return (
              <div key={pastor.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Header do Pastor */}
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
                    <p className="text-white font-semibold text-sm">{pastor.nome}</p>
                    <p style={{ color: '#C5A059' }} className="text-xs">
                      {ags.length} agendamento{ags.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Lista de agendamentos */}
                <div className="divide-y">
                  {ags.map((ag) => (
                    <div key={ag.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-base font-bold"
                          style={{ color: '#002347' }}
                        >
                          {ag.hora.slice(0, 5)}
                        </span>
                        <Badge status={ag.status} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{ag.nome_fiel}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ag.assunto}</p>
                      {ag.observacoes && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{ag.observacoes}</p>
                      )}
                      {ag.telefone && (
                        <button
                          onClick={() =>
                            abrirWhatsApp(
                              ag.telefone,
                              `Olá ${ag.nome_fiel}, lembramos do seu atendimento hoje às ${ag.hora.slice(0, 5)}.`
                            )
                          }
                          className="mt-2 text-xs font-semibold px-2 py-1 rounded"
                          style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                        >
                          📱 WhatsApp
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
