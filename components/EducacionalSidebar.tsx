'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface NavItem { href: string; icon: string; label: string }
interface NavGroup { icon: string; label: string; children: NavItem[] }
type NavEntry = NavItem | NavGroup

const navEntries: NavEntry[] = [
  { href: '/educacional', icon: '🏠', label: 'Dashboard' },
  { href: '/educacional/agenda', icon: '📅', label: 'Agenda' },
  {
    icon: '📁',
    label: 'Cadastros',
    children: [
      { href: '/educacional/cadastros/alunos', icon: '🎒', label: 'Alunos' },
      { href: '/educacional/cadastros/turmas', icon: '🏫', label: 'Turmas' },
      { href: '/educacional/cadastros/professores', icon: '👨‍🏫', label: 'Professores' },
    ],
  },
]

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

export default function EducacionalSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const [now, setNow] = useState<Date | null>(null)
  const [logoError, setLogoError] = useState(false)
  const [cadastrosOpen, setCadastrosOpen] = useState(pathname.startsWith('/educacional/cadastros'))

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (pathname.startsWith('/educacional/cadastros')) setCadastrosOpen(true)
  }, [pathname])

  const dd = now ? String(now.getDate()).padStart(2, '0') : '--'
  const mm = now ? String(now.getMonth() + 1).padStart(2, '0') : '--'
  const yyyy = now ? now.getFullYear() : '----'
  const diaSemana = now ? DIAS_SEMANA[now.getDay()] : ''
  const hh = now ? String(now.getHours()).padStart(2, '0') : '--'
  const min = now ? String(now.getMinutes()).padStart(2, '0') : '--'

  const sidebar = (
    <aside style={{ backgroundColor: '#1F2937', borderRight: '2px solid #E07535' }} className="flex flex-col h-full w-64">
      <div className="flex items-center justify-center py-5 px-4">
        {!logoError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt="Jeito de Viver" width={160} style={{ maxHeight: 72, objectFit: 'contain' }} onError={() => setLogoError(true)} />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span style={{ color: '#E07535' }} className="text-lg font-bold tracking-wide text-center leading-tight">Jeito de Viver</span>
            <span className="text-xs text-gray-400">Centro Educacional</span>
          </div>
        )}
      </div>

      <div style={{ borderColor: '#E07535' }} className="border-t mx-4 opacity-40" />

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navEntries.map((entry) => {
          if (isGroup(entry)) {
            const childActive = entry.children.some((c) => pathname.startsWith(c.href))
            return (
              <div key={entry.label}>
                <button
                  onClick={() => setCadastrosOpen((v) => !v)}
                  style={childActive ? { color: '#E07535' } : { color: '#a0aec0' }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-150 hover:text-orange-400"
                >
                  <span className="text-base leading-none">{entry.icon}</span>
                  <span className="flex-1 text-left">{entry.label}</span>
                  <span className="text-xs opacity-60">{cadastrosOpen ? '▲' : '▼'}</span>
                </button>
                {cadastrosOpen && (
                  <div className="pl-4 mb-1">
                    {entry.children.map((child) => {
                      const active = pathname.startsWith(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          style={active ? { color: '#E07535', backgroundColor: 'rgba(224,117,53,0.15)' } : { color: '#a0aec0' }}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 hover:text-orange-400"
                        >
                          <span className="text-sm leading-none">{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = entry.href === '/educacional' ? pathname === '/educacional' : pathname.startsWith(entry.href)
          return (
            <Link
              key={entry.href}
              href={entry.href}
              onClick={onClose}
              style={isActive ? { color: '#E07535', backgroundColor: 'rgba(224,117,53,0.15)' } : { color: '#a0aec0' }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-all duration-150 hover:text-orange-400"
            >
              <span className="text-base leading-none">{entry.icon}</span>
              <span>{entry.label}</span>
            </Link>
          )
        })}
      </nav>

      <div style={{ borderColor: '#E07535' }} className="border-t mx-4 opacity-40" />

      <div className="px-4 py-4 text-center">
        <p style={{ color: '#E07535' }} className="text-xs font-semibold">{diaSemana}, {dd}/{mm}/{yyyy}</p>
        <p style={{ color: '#6b7a8d' }} className="text-xs mt-1">{hh}:{min}</p>
        <div className="flex gap-3 justify-center mt-3">
          <Link href="/" style={{ color: '#E07535' }} className="text-xs hover:underline">← Workspace</Link>
          <button
            onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
            style={{ color: '#6b7a8d' }}
            className="text-xs hover:text-red-400 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden md:block fixed top-0 left-0 h-full w-64 z-50">{sidebar}</div>
      {open && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={onClose} />
          <div className="fixed top-0 left-0 h-full w-64 z-50 md:hidden">{sidebar}</div>
        </>
      )}
    </>
  )
}
