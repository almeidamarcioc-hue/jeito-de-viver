'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

const navLinks = [
  { href: '/', icon: '🏠', label: 'Dashboard' },
  { href: '/agendamentos/novo', icon: '➕', label: 'Novo Agendamento' },
  { href: '/agenda/pastores', icon: '📅', label: 'Agenda dos Pastores' },
  { href: '/atendidos', icon: '🙍', label: 'Atendidos' },
  { href: '/configuracoes', icon: '⚙️', label: 'Configurações' },
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Sidebar() {
  const pathname = usePathname()
  const [now, setNow] = useState(new Date())
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = now.getFullYear()
  const diaSemana = DIAS_SEMANA[now.getDay()]
  const mesNome = MESES[now.getMonth()]
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')

  return (
    <aside
      style={{ backgroundColor: '#002347', borderRight: '2px solid #C5A059' }}
      className="fixed top-0 left-0 h-full w-64 flex flex-col z-50"
    >
      {/* Logo */}
      <div className="flex items-center justify-center py-6 px-4">
        {!logoError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo.png"
            alt="IBTM Logo"
            width={120}
            style={{ maxHeight: 64, objectFit: 'contain' }}
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl">⛪</span>
            <span style={{ color: '#C5A059' }} className="text-xl font-bold tracking-widest">
              IBTM
            </span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div style={{ borderColor: '#C5A059' }} className="border-t mx-4 opacity-40" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navLinks.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              style={
                isActive
                  ? { color: '#C5A059', backgroundColor: 'rgba(197,160,89,0.15)' }
                  : { color: '#a0aec0' }
              }
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-150 hover:text-yellow-400"
            >
              <span className="text-base leading-none">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Separator */}
      <div style={{ borderColor: '#C5A059' }} className="border-t mx-4 opacity-40" />

      {/* Footer */}
      <div className="px-4 py-4 text-center">
        <p style={{ color: '#C5A059' }} className="text-xs font-semibold">
          {diaSemana}, {dd}/{mm}/{yyyy}
        </p>
        <p style={{ color: '#6b7a8d' }} className="text-xs mt-1">
          {hh}:{min}
        </p>
      </div>
    </aside>
  )
}
