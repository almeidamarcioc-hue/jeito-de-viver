'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'

interface Me { id: number; usuario: string; nome: string; role: string; modulos: string }

export default function WorkspacePage() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) { router.push('/login'); return null }; return r.json() })
      .then(d => { if (d) { setMe(d); setLoading(false) } })
      .catch(() => router.push('/login'))
  }, [router])

  function hasModule(mod: string) {
    if (!me) return false
    return me.modulos === '*' || me.modulos.split(',').includes(mod)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) return <div style={{ minHeight: '100vh', backgroundColor: '#1F1F4D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1F1F4D 0%, #2E2E66 50%, #1a1a4d 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 16px',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/ibtm-logo.png" alt="IBTM" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 16 }} />

      <h1 style={{ color: '#fff', fontFamily: 'Fraunces, serif', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 400, marginBottom: 4, textAlign: 'center', lineHeight: 1.2 }}>
        Igreja Batista Transformação
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 48, textAlign: 'center' }}>
        Bem-vindo, <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{me?.nome}</strong>. Escolha o módulo.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', maxWidth: 700 }}>
        {hasModule('secretaria') && (
          <ModuleCard
            onClick={() => router.push('/secretaria')}
            icon="⛪"
            title="Secretaria"
            desc="Agenda pastoral, fiéis e agendamentos"
            accent="#C5A059"
            bg="#002347"
          />
        )}
        {hasModule('educacional') && (
          <ModuleCard
            onClick={() => router.push('/educacional')}
            icon="🏫"
            title="Centro Educacional"
            desc="Jeito de Viver — alunos, turmas e professores"
            accent="#E07535"
            bg="#1F2937"
          />
        )}
        {me?.role === 'admin' && (
          <ModuleCard
            onClick={() => router.push('/configuracoes')}
            icon="⚙️"
            title="Configurações"
            desc="Usuários e acesso ao sistema"
            accent="#4848A8"
            bg="#1a1a40"
          />
        )}
      </div>

      <button
        onClick={handleLogout}
        style={{ marginTop: 48, color: 'rgba(255,255,255,0.35)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        ⏏ Sair do sistema
      </button>
    </div>
  )
}

function ModuleCard({ onClick, icon, title, desc, accent, bg }: {
  onClick: () => void; icon: string; title: string; desc: string; accent: string; bg: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 260, background: bg, border: `2px solid ${accent}40`, borderRadius: 16,
        padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
        transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-4px)'
        el.style.borderColor = accent
        el.style.boxShadow = `0 20px 40px -10px ${accent}50`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.borderColor = `${accent}40`
        el.style.boxShadow = 'none'
      }}
    >
      <div style={{ fontSize: 44, marginBottom: 12 }}>{icon}</div>
      <p style={{ color: accent, fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{title}</p>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
    </button>
  )
}
