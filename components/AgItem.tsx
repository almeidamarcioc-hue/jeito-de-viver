import { AgendamentoPastoral } from '@/types'
import Badge from './Badge'

interface AgItemProps {
  ag: AgendamentoPastoral
}

const statusCardConfig: Record<string, { bg: string; border: string }> = {
  pendente:   { bg: '#fffbea', border: '#f59e0b' },
  confirmado: { bg: '#f0fdf4', border: '#22c55e' },
  cancelado:  { bg: '#fef2f2', border: '#ef4444' },
  remarcado:  { bg: '#eff6ff', border: '#3b82f6' },
}

export default function AgItem({ ag }: AgItemProps) {
  const config = statusCardConfig[ag.status] ?? { bg: '#f9fafb', border: '#d1d5db' }
  return (
    <div
      style={{ backgroundColor: config.bg, borderLeft: `3px solid ${config.border}` }}
      className="rounded-lg px-3 py-2 mb-2"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-gray-800">{ag.hora}</span>
        <Badge status={ag.status} />
      </div>
      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">{ag.nome_fiel}</p>
      <p className="text-xs text-gray-500 truncate">{ag.assunto}</p>
    </div>
  )
}
