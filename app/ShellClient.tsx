'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function ShellClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (pathname === '/login') return <>{children}</>


  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top bar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center px-4 h-14"
        style={{ backgroundColor: '#1F2937', borderBottom: '2px solid #E07535' }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ color: '#E07535' }}
          className="text-2xl leading-none mr-3"
          aria-label="Abrir menu"
        >
          ☰
        </button>
        <span style={{ color: '#E07535' }} className="text-base font-bold tracking-wide">
          Jeito de Viver
        </span>
      </div>

      <main className="md:pl-64 min-h-screen">
        <div className="pt-14 md:pt-0 p-4 md:p-6">
          {children}
        </div>
      </main>
    </>
  )
}
