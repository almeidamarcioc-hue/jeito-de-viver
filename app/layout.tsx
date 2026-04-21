import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import InitDb from './InitDb'

export const metadata: Metadata = {
  title: 'Secretaria IBTM',
  description: 'Sistema de Agenda Eclesiástica',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body style={{ backgroundColor: '#f0f2f5' }}>
        <InitDb />
        <Sidebar />
        <main className="pl-64 min-h-screen">
          <div className="p-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
