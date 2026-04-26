'use client'

import { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import LoadingSpinner from '@/components/LoadingSpinner'
import Modal from '@/components/Modal'
import { Pastor, Ferias } from '@/types'

function LinkApp({ id }: { id: number }) {
  const [origem, setOrigem] = useState('')
  const [copiado, setCopiado] = useState(false)
  useEffect(() => { setOrigem(window.location.origin) }, [])
  const url = `${origem}/pastor/${id}`
  const copiar = () => { navigator.clipboard.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1500) }) }
  return (
    <div className="mt-2 flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
      <span className="text-xs text-blue-700 flex-1 truncate">{url || '...'}</span>
      <button type="button" onClick={copiar} className="text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0" style={{ backgroundColor: copiado ? '#22c55e' : '#002347', color: '#fff' }}>{copiado ? '✓' : '📋'}</button>
    </div>
  )
}

const pastorVazio: Partial<Pastor> = { nome: '', telefone: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', imagem: '' }
const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none'
const iStyle = { borderColor: '#e5e7eb' }
const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#C5A059' }
const onBlur = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e5e7eb' }

export default function CadastroPastoresPage() {
  const [pastores, setPastores] = useState<Pastor[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [modal, setModal] = useState(false)
  const [pastorEditando, setPastorEditando] = useState<Partial<Pastor>>(pastorVazio)
  const [isNovo, setIsNovo] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erroPastor, setErroPastor] = useState('')

  const [modalFerias, setModalFerias] = useState(false)
  const [pastorFerias, setPastorFerias] = useState<Pastor | null>(null)
  const [ferias, setFerias] = useState<Ferias[]>([])
  const [feriasForm, setFeriasForm] = useState({ dataInicio: '', dataFim: '', motivo: 'Férias' })
  const [salvandoFerias, setSalvandoFerias] = useState(false)
  const [erroFerias, setErroFerias] = useState('')

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/secretaria/pastores')
      const data = await res.json()
      setPastores(Array.isArray(data) ? data : [])
    } catch { setErro('Erro ao carregar pastores.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const res = await fetch('/api/secretaria/pastores')
        const data = await res.json()
        setPastores(Array.isArray(data) ? data : [])
      } finally { setLoading(false) }
    }
    init()
  }, [])

  const abrirNovo = () => { setPastorEditando({ ...pastorVazio }); setIsNovo(true); setModal(true); setErroPastor(''); setSucesso('') }
  const abrirEditar = (p: Pastor) => { setPastorEditando({ ...p }); setIsNovo(false); setModal(true); setErroPastor(''); setSucesso('') }
  const fecharModal = () => { setModal(false); setPastorEditando({ ...pastorVazio }); setErroPastor('') }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pastorEditando.nome?.trim()) { setErroPastor('Nome é obrigatório.'); return }
    setSubmitting(true); setErroPastor('')
    try {
      if (isNovo) {
        const res = await fetch('/api/secretaria/pastores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pastorEditando) })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Erro ${res.status}`) }
      } else {
        const res = await fetch(`/api/secretaria/pastores/${pastorEditando.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pastorEditando) })
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || `Erro ${res.status}`) }
      }
      fecharModal()
      const res2 = await fetch('/api/secretaria/pastores')
      setPastores(Array.isArray(await res2.json()) ? await res2.json() : [])
      setSucesso(isNovo ? 'Pastor cadastrado com sucesso!' : 'Pastor atualizado!')
    } catch (e: unknown) { setErroPastor(e instanceof Error ? e.message : 'Erro ao salvar.') }
    finally { setSubmitting(false) }
  }

  const carregarFerias = async (pastorId: number) => {
    const res = await fetch(`/api/secretaria/ferias?pastorId=${pastorId}`)
    setFerias(Array.isArray(await res.json()) ? await res.json() : [])
  }

  const abrirFerias = async (p: Pastor) => {
    setPastorFerias(p); setFeriasForm({ dataInicio: '', dataFim: '', motivo: 'Férias' }); setErroFerias(''); setFerias([])
    setModalFerias(true)
    await carregarFerias(p.id)
  }

  const handleSalvarFerias = async () => {
    if (!feriasForm.dataInicio || !feriasForm.dataFim) { setErroFerias('Informe data início e fim.'); return }
    setSalvandoFerias(true); setErroFerias('')
    try {
      const res = await fetch('/api/secretaria/ferias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pastorId: pastorFerias!.id, ...feriasForm }) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro') }
      setFeriasForm({ dataInicio: '', dataFim: '', motivo: 'Férias' })
      await carregarFerias(pastorFerias!.id)
    } catch (e: any) { setErroFerias(e.message || 'Erro ao salvar férias') }
    finally { setSalvandoFerias(false) }
  }

  const handleDeletarFerias = async (id: number) => {
    if (!confirm('Remover este período de férias?')) return
    await fetch(`/api/secretaria/ferias/${id}`, { method: 'DELETE' })
    await carregarFerias(pastorFerias!.id)
  }

  const handleExcluir = async (id: number) => {
    if (!confirm('Excluir este pastor?')) return
    const res = await fetch(`/api/secretaria/pastores/${id}`, { method: 'DELETE' })
    if (!res.ok) { const data = await res.json(); alert(data.error || 'Não foi possível excluir.'); return }
    setSucesso('Pastor excluído.')
    const res2 = await fetch('/api/secretaria/pastores')
    setPastores(Array.isArray(await res2.json()) ? await res2.json() : [])
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>
      <PageHeader icon="👤" title="Cadastro de Pastores" subtitle="Gerenciamento dos pastores da igreja" />

      {erro && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">{erro}</div>}
      {sucesso && <div className="bg-green-50 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{sucesso}</div>}

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: '#002347' }} className="font-bold text-base">Pastores ({pastores.length})</h2>
          <button onClick={abrirNovo} style={{ backgroundColor: '#002347', color: '#fff' }} className="px-4 py-2 rounded-lg text-sm font-semibold">➕ Novo Pastor</button>
        </div>

        {pastores.length === 0 ? <p className="text-gray-400 text-sm text-center py-8">Nenhum pastor cadastrado.</p> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastores.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                {p.imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagem} alt={p.nome} className="w-12 h-12 rounded-full object-cover border-2 flex-shrink-0" style={{ borderColor: '#C5A059' }} />
                ) : (
                  <div style={{ backgroundColor: '#C5A059', color: '#002347' }} className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">{p.nome.charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{p.nome}</p>
                  {p.telefone && <p className="text-xs text-gray-500 mt-0.5">{p.telefone}</p>}
                  <LinkApp id={p.id} />
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => abrirEditar(p)} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>✏️</button>
                  <button onClick={() => abrirFerias(p)} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>🏖️</button>
                  <button onClick={() => handleExcluir(p.id)} className="px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalFerias} onClose={() => setModalFerias(false)} title={`🏖️ Férias — ${pastorFerias?.nome || ''}`}>
        <div className="space-y-4">
          {ferias.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Períodos Cadastrados</p>
              <div className="space-y-2">
                {ferias.map(f => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107' }}>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{f.data_inicio.slice(0,10).split('-').reverse().join('/')} → {f.data_fim.slice(0,10).split('-').reverse().join('/')}</p>
                      <p className="text-xs text-gray-500">{f.motivo}</p>
                    </div>
                    <button onClick={() => handleDeletarFerias(f.id)} className="text-xs px-2 py-1 rounded font-semibold ml-2" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>Remover</button>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4" style={{ borderColor: '#f3f4f6' }} />
            </div>
          )}
          <p className="text-xs font-bold text-gray-500 uppercase">Novo Período</p>
          {erroFerias && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm">{erroFerias}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Data Início *</label><input type="date" value={feriasForm.dataInicio} onChange={e => setFeriasForm(f => ({ ...f, dataInicio: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Data Fim *</label><input type="date" value={feriasForm.dataFim} onChange={e => setFeriasForm(f => ({ ...f, dataFim: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          </div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Motivo</label><input type="text" value={feriasForm.motivo} onChange={e => setFeriasForm(f => ({ ...f, motivo: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <p className="text-xs text-gray-400">Todos os horários do período serão bloqueados automaticamente.</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleSalvarFerias} disabled={salvandoFerias} style={{ backgroundColor: '#002347', color: '#fff' }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">{salvandoFerias ? 'Salvando...' : '🏖️ Registrar Férias'}</button>
            <button type="button" onClick={() => setModalFerias(false)} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700">Fechar</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal} onClose={fecharModal} title={isNovo ? 'Novo Pastor' : 'Editar Pastor'}>
        <form onSubmit={handleSalvar} className="space-y-4">
          {erroPastor && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-3 py-2 text-sm">{erroPastor}</div>}
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Nome *</label><input type="text" value={pastorEditando.nome ?? ''} onChange={e => setPastorEditando(p => ({ ...p, nome: e.target.value }))} required className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Telefone</label><input type="tel" value={pastorEditando.telefone ?? ''} onChange={e => setPastorEditando(p => ({ ...p, telefone: e.target.value }))} placeholder="(11) 99999-9999" className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">Endereço</label><input type="text" value={pastorEditando.endereco ?? ''} onChange={e => setPastorEditando(p => ({ ...p, endereco: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Número</label><input type="text" value={pastorEditando.numero ?? ''} onChange={e => setPastorEditando(p => ({ ...p, numero: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Bairro</label><input type="text" value={pastorEditando.bairro ?? ''} onChange={e => setPastorEditando(p => ({ ...p, bairro: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Cidade</label><input type="text" value={pastorEditando.cidade ?? ''} onChange={e => setPastorEditando(p => ({ ...p, cidade: e.target.value }))} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label><input type="text" value={pastorEditando.estado ?? ''} onChange={e => setPastorEditando(p => ({ ...p, estado: e.target.value.toUpperCase().slice(0,2) }))} placeholder="SP" maxLength={2} className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          </div>
          <div><label className="block text-sm font-semibold text-gray-700 mb-1">URL da Foto</label><input type="url" value={pastorEditando.imagem ?? ''} onChange={e => setPastorEditando(p => ({ ...p, imagem: e.target.value }))} placeholder="https://..." className={inputCls} style={iStyle} onFocus={onFocus} onBlur={onBlur} /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting} style={{ backgroundColor: '#002347', color: '#fff' }} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50">{submitting ? 'Salvando...' : '💾 Salvar'}</button>
            <button type="button" onClick={fecharModal} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700">Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
