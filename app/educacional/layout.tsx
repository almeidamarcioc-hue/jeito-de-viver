'use client'

import { useState } from 'react'
import EducacionalSidebar from '@/components/EducacionalSidebar'

export default function EducacionalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <EducacionalSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
        <span style={{ color: '#E07535' }} className="text-base font-bold tracking-wide">Jeito de Viver</span>
      </div>

      <main className="md:pl-64 min-h-screen" style={{ backgroundColor: '#f0f2f5' }}>
        <div className="pt-14 md:pt-0 p-4 md:p-6">{children}</div>
      </main>
    </>
  )
}
