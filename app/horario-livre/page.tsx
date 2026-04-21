'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Pastor } from '@/types'

function hoje(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DIAS_SEMANA_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function formatDatePT(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${DIAS_SEMANA_PT[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`
}

interface ProximoLivre {
  data: string
  hora: string
}

export default function ProximoHorarioLivrePage() {
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [aPartir, setAPartir] = useState(hoje())
  const [loading, setLoading] = useState(false)
  const [resultados, setResultados] = useState<Record<number, ProximoLivre | null>>({})
  const [carregouPastores, setCarregouPastores] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch('/api/pastores')
      .then((r) => r.json())
      .then((data) => {
        setPastores(Array.isArray(data) ? data : [])
        setCarregouPastores(true)
      })
      .catch(() => setErro('Erro ao carregar pastores'))
  }, [])

  const buscar = async () => {
    if (pastores.length === 0) return
    setLoading(true)
    setErro('')
    const novosResultados: Record<number, ProximoLivre | null> = {}
    await Promise.all(
      pastores.map(async (pastor) => {
        try {
          const res = await fetch(`/api/agendamentos/proximo-livre?pastorId=${pastor.id}&aPartir=${aPartir}`)
          const data = await res.json()
          novosResultados[pastor.id] = data.proximo ?? null
        } catch {
          novosResultados[pastor.id] = null
        }
      })
    )
    setResultados(novosResultados)
    setLoading(false)
  }

  useEffect(() => {
    if (carregouPastores && pastores.length > 0) {
      buscar()
    }
  }, [carregouPastores, aPartir])

  return (
    <div>
      <PageHeader icon="👥" title="Próximo Horário Livre" subtitle="Consultar disponibilidade dos pastores" />

      {erro && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>
      )}

      {/* Filtro */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">A partir de</label>
          <input
            type="date"
            value={aPartir}
            onChange={(e) => setAPartir(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: '#e5e7eb' }}
            onFocus={(e) => (e.target.style.borderColor = '#C5A059')}
            onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>
        <button
          onClick={buscar}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="px-5 py-2 rounded-lg text-sm font-semibold"
          onMouseOver={(e) => {
            ;(e.target as HTMLButtonElement).style.backgroundColor = '#C5A059'
            ;(e.target as HTMLButtonElement).style.color = '#002347'
          }}
          onMouseOut={(e) => {
            ;(e.target as HTMLButtonElement).style.backgroundColor = '#002347'
            ;(e.target as HTMLButtonElement).style.color = '#ffffff'
          }}
        >
          🔍 Consultar
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : pastores.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-10 text-center text-gray-400">
          <p className="text-5xl mb-3">⛪</p>
          <p className="font-semibold">Nenhum pastor cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pastores.map((pastor) => {
            const proximo = resultados[pastor.id]
            return (
              <div key={pastor.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Header */}
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
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                    >
                      {pastor.nome.charAt(0)}
                    </div>
                  )}
                  <p className="text-white font-semibold text-sm">{pastor.nome}</p>
                </div>

                {/* Resultado */}
                <div className="px-4 py-4">
                  {proximo ? (
                    <>
                      <p className="text-xs text-gray-500 mb-1">Próximo horário livre:</p>
                      <p
                        className="text-2xl font-bold"
                        style={{ color: '#C5A059' }}
                      >
                        {proximo.hora}
                      </p>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#002347' }}>
                        {formatDatePT(proximo.data)}
                      </p>
                      <a
                        href={`/agendamentos/novo`}
                        className="inline-block mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg"
                        style={{ backgroundColor: '#002347', color: '#fff' }}
                      >
                        ➕ Agendar
                      </a>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm">Nenhum horário livre nos próximos 30 dias.</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
