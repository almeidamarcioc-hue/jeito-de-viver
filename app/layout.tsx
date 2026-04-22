import type { Metadata } from 'next'
import './globals.css'
import ShellClient from './ShellClient'
import InitDb from './InitDb'

export const metadata: Metadata = {
  title: 'Secretaria IBTM',
  description: 'Sistema de Agenda Eclesiástica',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ backgroundColor: '#f0f2f5' }}>
        <InitDb />
        <ShellClient>{children}</ShellClient>
      </body>
    </html>
  )
}
