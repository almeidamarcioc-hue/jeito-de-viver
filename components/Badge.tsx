interface BadgeProps {
  status: string
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pendente:   { bg: '#fef3c7', text: '#92400e', label: 'Pendente' },
  confirmado: { bg: '#dcfce7', text: '#166534', label: 'Confirmado' },
  cancelado:  { bg: '#fee2e2', text: '#991b1b', label: 'Cancelado' },
  remarcado:  { bg: '#dbeafe', text: '#1e40af', label: 'Remarcado' },
  bloqueado:  { bg: '#f3f4f6', text: '#374151', label: 'Bloqueado' },
}

export default function Badge({ status }: BadgeProps) {
  const config = statusConfig[status] ?? { bg: '#f3f4f6', text: '#374151', label: status }
  return (
    <span
      style={{ backgroundColor: config.bg, color: config.text }}
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
    >
      {config.label}
    </span>
  )
}
