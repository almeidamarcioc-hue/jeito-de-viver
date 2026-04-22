'use client'

import { useEffect, useState, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Configuracoes } from '@/types'

type WAStatus = 'nao_configurado' | 'open' | 'close' | 'connecting' | 'error' | 'carregando'

const configVazia: Configuracoes = {
  id: 1,
  horas_lembrete: 24,
  msg_confirmacao: '',
  msg_lembrete: '',
  msg_cancelamento: '',
  msg_remarcacao: '',
  msg_pastor: '',
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes>(configVazia)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  // WhatsApp connection
  const [waStatus, setWaStatus] = useState<WAStatus>('carregando')
  const [waQR, setWaQR] = useState<string | null>(null)
  const [waCarregandoQR, setWaCarregandoQR] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/configuracoes')
      const cfg = await res.json()
      if (cfg && cfg.id) setConfig(cfg)
    } catch {
      setErro('Erro ao carregar configurações.')
    } finally {
      setLoading(false)
    }
  }

  const verificarStatusWA = useCallback(async () => {
    const res = await fetch('/api/whatsapp/status')
    const data = await res.json()
    setWaStatus(data.status as WAStatus)
    if (data.status === 'open') setWaQR(null)
  }, [])

  const conectarWA = async () => {
    setWaCarregandoQR(true)
    setWaQR(null)
    try {
      const res = await fetch('/api/whatsapp/qrcode')
      const data = await res.json()
      setWaQR(data.qrcode ?? null)
      setWaStatus('connecting')
    } finally {
      setWaCarregandoQR(false)
    }
  }

  // Polling de status quando conectando
  useEffect(() => {
    verificarStatusWA()
  }, [verificarStatusWA])

  useEffect(() => {
    if (waStatus !== 'connecting' && waStatus !== 'carregando') return
    const interval = setInterval(verificarStatusWA, 4000)
    return () => clearInterval(interval)
  }, [waStatus, verificarStatusWA])

  useEffect(() => { carregar() }, [])

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    setSucesso('')
    setErro('')
    try {
      const res = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setSucesso('Configurações salvas com sucesso!')
    } catch {
      setErro('Erro ao salvar configurações.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const inputStyle = { borderColor: '#e5e7eb' }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#C5A059' }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = '#e5e7eb' }

  return (
    <div>
      <PageHeader icon="⚙️" title="Configurações" subtitle="Lembretes e mensagens do sistema" />

      {erro && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>}
      {sucesso && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{sucesso}</div>}

      {/* Conexão WhatsApp */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-5 max-w-2xl">
        <h2 style={{ color: '#002347' }} className="font-bold text-base mb-3">Conexão WhatsApp</h2>

        {waStatus === 'nao_configurado' && (
          <div className="space-y-4">
            <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#fef9c3', border: '1px solid #f59e0b' }}>
              <p className="font-bold text-amber-900 mb-3">Siga os passos abaixo para ativar o envio automático:</p>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor: '#002347' }}>1</span>
                  <div>
                    <p className="font-semibold text-amber-900">Crie uma conta gratuita no Railway</p>
                    <a href="https://railway.app" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Abrir railway.app →</a>
                    <p className="text-amber-700 text-xs mt-1">Login com Google ou GitHub (gratuito)</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor: '#002347' }}>2</span>
                  <div>
                    <p className="font-semibold text-amber-900">Crie um projeto com a imagem Docker abaixo</p>
                    <p className="text-xs text-amber-700 mt-1">New Project → Deploy from Docker Image</p>
                    <CopyBox text="atendai/evolution-api:latest" label="Imagem:" />
                    <p className="text-xs text-amber-700 mt-2">Adicione esta variável de ambiente:</p>
                    <CopyBox text="AUTHENTICATION_API_KEY = secretaria2024ibtm" label="Variável:" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor: '#002347' }}>3</span>
                  <div>
                    <p className="font-semibold text-amber-900">Copie a URL pública gerada pelo Railway</p>
                    <p className="text-xs text-amber-700">Ex: <code className="bg-amber-100 px-1 rounded">https://evolution-api-xxx.up.railway.app</code></p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor: '#002347' }}>4</span>
                  <div>
                    <p className="font-semibold text-amber-900">Adicione as 3 variáveis no Vercel</p>
                    <p className="text-xs text-amber-700 mb-1">Vercel → seu projeto → Settings → Environment Variables</p>
                    <div className="space-y-1">
                      <CopyBox text="EVOLUTION_API_URL" label="Nome:" />
                      <CopyBox text="(URL do Railway copiada acima)" label="Valor:" />
                      <CopyBox text="EVOLUTION_API_KEY = secretaria2024ibtm" label="" />
                      <CopyBox text="EVOLUTION_INSTANCE = secretaria-ibtm" label="" />
                    </div>
                    <p className="text-xs text-amber-700 mt-1">Depois clique em <strong>Redeploy</strong> no Vercel.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor: '#25D366' }}>5</span>
                  <div>
                    <p className="font-semibold text-amber-900">Volte aqui e escaneie o QR Code com o WhatsApp</p>
                    <p className="text-xs text-amber-700">Após o redeploy, esta tela mostrará um botão para conectar.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {waStatus !== 'nao_configurado' && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${waStatus === 'open' ? 'bg-green-500' : waStatus === 'connecting' || waStatus === 'carregando' ? 'bg-yellow-400' : 'bg-red-500'}`} />
              <span className="text-sm font-semibold text-gray-700">
                {waStatus === 'open' ? 'Conectado — mensagens serão enviadas automaticamente' : waStatus === 'connecting' ? 'Conectando... (escaneie o QR Code abaixo)' : waStatus === 'carregando' ? 'Verificando...' : 'Desconectado'}
              </span>
            </div>

            {waStatus !== 'open' && (
              <button
                type="button"
                onClick={conectarWA}
                disabled={waCarregandoQR}
                className="text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ backgroundColor: '#25D366', color: '#fff' }}
              >
                {waCarregandoQR ? 'Gerando QR Code...' : '📱 Conectar WhatsApp'}
              </button>
            )}

            {waStatus === 'open' && (
              <button
                type="button"
                onClick={verificarStatusWA}
                className="text-sm text-gray-500 underline"
              >
                ↻ Verificar
              </button>
            )}
          </div>
        )}

        {waQR && waStatus !== 'open' && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Escaneie o QR Code com o WhatsApp do celular:</p>
            <img src={waQR} alt="QR Code WhatsApp" className="rounded-lg border" style={{ width: 220, height: 220 }} />
            <p className="text-xs text-gray-400 mt-2">Aguardando conexão... O status atualiza automaticamente.</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSalvar} className="bg-white rounded-xl shadow-sm p-5 space-y-5 max-w-2xl">
        <h2 style={{ color: '#002347' }} className="font-bold text-base">Configurações de Lembretes</h2>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Horas de antecedência para lembrete
          </label>
          <input
            type="number"
            min={1}
            max={168}
            value={config.horas_lembrete}
            onChange={(e) => setConfig((c) => ({ ...c, horas_lembrete: Number(e.target.value) }))}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
          <p className="text-xs text-gray-400 mt-1">Padrão: 24 horas antes do agendamento.</p>
        </div>

        <div style={{ borderColor: '#f3f4f6' }} className="border-t pt-4">
          <h3 style={{ color: '#002347' }} className="font-semibold text-sm mb-3">Mensagens WhatsApp</h3>
          <p className="text-xs text-gray-400 mb-4">Variáveis disponíveis: {'{nome}'}, {'{pastor}'}, {'{data}'}, {'{hora}'}, {'{assunto}'}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmação de Agendamento</label>
              <textarea value={config.msg_confirmacao} onChange={(e) => setConfig((c) => ({ ...c, msg_confirmacao: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Lembrete</label>
              <textarea value={config.msg_lembrete} onChange={(e) => setConfig((c) => ({ ...c, msg_lembrete: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Cancelamento</label>
              <textarea value={config.msg_cancelamento} onChange={(e) => setConfig((c) => ({ ...c, msg_cancelamento: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Remarcação</label>
              <textarea value={config.msg_remarcacao} onChange={(e) => setConfig((c) => ({ ...c, msg_remarcacao: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notificação para o Pastor</label>
              <p className="text-xs text-gray-400 mb-1">Variáveis: {'{nome_fiel}'}, {'{telefone}'}, {'{assunto}'}, {'{data}'}, {'{hora}'}</p>
              <textarea value={config.msg_pastor} onChange={(e) => setConfig((c) => ({ ...c, msg_pastor: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={salvando}
          style={{ backgroundColor: '#002347', color: '#fff' }}
          className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </form>
    </div>
  )
}

function CopyBox({ text, label }: { text: string; label: string }) {
  const [copiado, setCopiado] = useState(false)
  const copiar = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1500)
    })
  }
  return (
    <div className="flex items-center gap-2 mt-1">
      {label && <span className="text-xs text-amber-700 w-14 flex-shrink-0">{label}</span>}
      <div className="flex items-center gap-1 flex-1 bg-amber-50 border border-amber-200 rounded px-2 py-1">
        <code className="text-xs text-amber-900 flex-1 select-all">{text}</code>
        <button
          type="button"
          onClick={copiar}
          className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ backgroundColor: copiado ? '#25D366' : '#002347', color: '#fff' }}
        >
          {copiado ? '✓' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
