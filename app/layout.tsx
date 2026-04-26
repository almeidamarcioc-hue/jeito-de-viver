import type { Metadata } from 'next'
import './globals.css'
import ShellClient from './ShellClient'
import InitDb from './InitDb'

export const metadata: Metadata = {
  title: 'Igreja Batista Transformação',
  description: 'Sistema Integrado — Secretaria e Centro Educacional',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IBTM',
  },
  icons: { apple: '/logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body style={{ backgroundColor: '#f0f2f5' }}>
        <InitDb />
        <ShellClient>{children}</ShellClient>
      </body>
    </html>
  )
}
