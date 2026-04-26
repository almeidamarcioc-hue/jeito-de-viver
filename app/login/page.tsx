'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import './login.css'

// ── Icons ────────────────────────────────────────────────────────────────────

const base = {
  width: 18, height: 18, viewBox: '0 0 24 24',
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

const UserIcon = () => (
  <svg {...base}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
)

const LockIcon = () => (
  <svg {...base}>
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

const EyeIcon = () => (
  <svg {...base}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg {...base}>
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/>
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
    <path d="M1 1l22 22"/>
  </svg>
)

const ArrowRightIcon = () => (
  <svg {...base} width={16} height={16} strokeWidth={2}>
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const ChevronLeftIcon = () => (
  <svg {...base} strokeWidth={1.8}><path d="M15 18l-6-6 6-6"/></svg>
)

const ChevronRightIcon = () => (
  <svg {...base} strokeWidth={1.8}><path d="M9 18l6-6-6-6"/></svg>
)

const CheckIcon = () => (
  <svg {...base} width={16} height={16} strokeWidth={2.4}>
    <path d="M20 6L9 17l-5-5"/>
  </svg>
)

const SpinnerIcon = () => (
  <svg {...base} width={16} height={16} strokeWidth={2.5} style={{ animation: 'ibtm-spin 0.8s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.2-8.55"/>
  </svg>
)

// ── Deco shapes ──────────────────────────────────────────────────────────────

function DecoShapes({ variant }: { variant: number }) {
  if (variant === 0) return (
    <>
      <svg className="deco-shape" style={{ top: '15%', right: '12%', opacity: 0.25 }} width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="85" fill="none" stroke="#F8D800" strokeWidth="1.5" />
        <circle cx="90" cy="90" r="55" fill="none" stroke="#F07848" strokeWidth="1.5" />
        <circle cx="90" cy="90" r="25" fill="#30C0A8" opacity="0.5" />
      </svg>
      <svg className="deco-shape" style={{ bottom: '40%', left: '8%', opacity: 0.35 }} width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="35" fill="#F07848" />
      </svg>
    </>
  )
  if (variant === 1) return (
    <>
      <svg className="deco-shape" style={{ top: '20%', left: '10%', opacity: 0.35 }} width="160" height="160" viewBox="0 0 160 160">
        <rect x="20" y="20" width="120" height="120" rx="60" fill="none" stroke="#30C0A8" strokeWidth="2" />
      </svg>
      <svg className="deco-shape" style={{ top: '12%', right: '18%', opacity: 0.5 }} width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="30" fill="#F8D800" />
      </svg>
    </>
  )
  if (variant === 2) return (
    <>
      <svg className="deco-shape" style={{ top: '18%', right: '14%', opacity: 0.4 }} width="200" height="200" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="60" fill="#F07848" opacity="0.7" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="#F07848" strokeWidth="1" />
      </svg>
      <svg className="deco-shape" style={{ top: '50%', left: '12%', opacity: 0.3 }} width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#F8D800" strokeWidth="2" />
      </svg>
    </>
  )
  return (
    <>
      <svg className="deco-shape" style={{ top: '15%', right: '10%', opacity: 0.35 }} width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="50" fill="#30C0A8" />
      </svg>
      <svg className="deco-shape" style={{ bottom: '35%', right: '20%', opacity: 0.3 }} width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#0090D8" strokeWidth="2" />
      </svg>
    </>
  )
}

// ── Slides ───────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    cls: 'slide-1',
    eyebrow: 'Bem-vindo',
    title: <>Toda boa <em>dádiva</em><br/>vem do alto.</>,
    meta: 'Tiago 1:17 — A força da nossa comunidade está em servir uns aos outros com alegria.',
  },
  {
    cls: 'slide-2',
    eyebrow: 'Quartas, 19h30',
    title: <>Estudo <em>bíblico</em><br/>de quarta-feira.</>,
    meta: 'Encontros semanais para aprofundar a Palavra, com momentos de oração e comunhão entre irmãos.',
  },
  {
    cls: 'slide-3',
    eyebrow: 'Acampadentro 2026',
    title: <>Três dias para <em>respirar</em><br/>na presença d&rsquo;Ele.</>,
    meta: 'Inscrições abertas para o retiro anual da família IBTM. Programação completa em breve.',
  },
  {
    cls: 'slide-4',
    eyebrow: 'Domingo · Culto da Família',
    title: <>Um lugar onde <em>cabe</em><br/>a sua história.</>,
    meta: 'Cultos às 9h, 11h e 19h. Ministério infantil, jovens e família — para todas as idades.',
  },
]

// ── Carousel ─────────────────────────────────────────────────────────────────

function MediaCarousel() {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = SLIDES.length

  const next = useCallback(() => setIdx(v => (v + 1) % total), [total])
  const prev = useCallback(() => setIdx(v => (v - 1 + total) % total), [total])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, 5500)
    return () => clearInterval(id)
  }, [next, paused])

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })

  return (
    <div
      className="ibtm-media-side"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((s, i) => (
        <div key={i} className={`ibtm-slide ${s.cls} ${i === idx ? 'is-active' : ''}`}>
          <DecoShapes variant={i} />
          <div className="ibtm-slide-content">
            <div className="ibtm-slide-eyebrow">{s.eyebrow}</div>
            <h2 className="ibtm-slide-title">{s.title}</h2>
            <p className="ibtm-slide-meta">{s.meta}</p>
          </div>
        </div>
      ))}

      <div className="ibtm-media-top">
        <div style={{ textTransform: 'capitalize' }}>{today}</div>
        <div className="ibtm-live">
          <span className="ibtm-live-dot" />
          <span>IBTM · Transformação</span>
        </div>
      </div>

      <div className="ibtm-carousel-chrome">
        <div className="ibtm-carousel-dots">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`ibtm-dot ${i === idx ? 'is-active' : ''}`}
              type="button"
            />
          ))}
        </div>
        <button className="ibtm-nav-btn" aria-label="Anterior" onClick={prev} type="button">
          <ChevronLeftIcon />
        </button>
        <button className="ibtm-nav-btn" aria-label="Próximo" onClick={next} type="button">
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  )
}

// ── Login form ───────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter()
  const [user, setUser] = useState('')
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'warn' } | null>(null)

  function flashToast(msg: string, kind: 'ok' | 'warn' = 'ok') {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 2400)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !pwd) {
      flashToast('Preencha usuário e senha', 'warn')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: user, senha: pwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao entrar')
      flashToast(`Bem-vindo, ${data.nome}.`, 'ok')
      setTimeout(() => router.push('/'), 600)
    } catch (err: any) {
      flashToast(err?.message || 'Falha ao entrar', 'warn')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ibtm-form-side">
      <div className="ibtm-form-inner">
        <div className="ibtm-logo-stack">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ibtm-logo.png" alt="IBTM" className="ibtm-logo-img" />
          <div className="ibtm-brand-line">Igreja Batista Transformação</div>
        </div>

        <div style={{ marginTop: 28 }}>
          <h1 className="ibtm-heading">
            Acesse sua <em>conta</em>.
          </h1>
          <p className="ibtm-subheading">
            Bem-vindo de volta. Entre com suas credenciais para acessar os recursos da sua área ministerial.
          </p>
        </div>

        <form onSubmit={submit} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="ibtm-field-label">Usuário</label>
            <div className="ibtm-input-wrap">
              <span className="ibtm-input-icon-left"><UserIcon /></span>
              <input
                type="text"
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="ex. admin"
                className="ibtm-field"
                style={{ paddingLeft: 46 }}
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label className="ibtm-field-label">Senha</label>
            </div>
            <div className="ibtm-input-wrap">
              <span className="ibtm-input-icon-left"><LockIcon /></span>
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="••••••••"
                className="ibtm-field"
                style={{ paddingLeft: 46, paddingRight: 46 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="ibtm-eye-btn"
                onClick={() => setShowPwd(v => !v)}
                aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPwd ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button type="submit" className="ibtm-btn-primary" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <><SpinnerIcon /> Entrando...</> : <>Entrar <ArrowRightIcon /></>}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: 13, color: 'var(--ibtm-ink-mute)' }}>
          Ainda não tem acesso?{' '}
          <a href="#" style={{ color: 'var(--ibtm-primary)', textDecoration: 'none', fontWeight: 500 }}>
            Fale com a secretaria
          </a>
        </div>
      </div>

      <div className="ibtm-verse-corner">
        <em>&ldquo;O Senhor é o meu pastor, nada me faltará.&rdquo;</em>{' '}
        <span style={{ opacity: 0.7 }}>· Salmo 23:1</span>
      </div>

      {toast && (
        <div className="ibtm-toast is-show">
          {toast.kind === 'ok' && <CheckIcon />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div className="ibtm-login-grid">
      <LoginForm />
      <MediaCarousel />
    </div>
  )
}
