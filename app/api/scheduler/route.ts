import { NextResponse } from 'next/server'
import {
  getLembretesPendentes,
  marcarLembreteEnviado,
  getConfiguracoes,
  Agendamento,
} from '@/lib/db'
import { preencherTemplate, gerarUrl } from '@/lib/whatsapp'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * GET /api/scheduler
 *
 * Chamado periodicamente pelo Vercel Cron (a cada 30 min).
 * Verifica lembretes pendentes, gera as URLs do WhatsApp e marca como enviados.
 * Como o servidor não pode abrir o browser, retorna a lista com as URLs geradas
 * para que o cliente possa processá-las, e marca os registros como enviados.
 */
export async function GET() {
  try {
    const pendentes = await getLembretesPendentes()
    const config = await getConfiguracoes()

    const resultados: Array<{
      agendamento: Agendamento
      whatsappUrl: string | null
      whatsappUrlPastor: string | null
    }> = []

    for (const agendamento of pendentes) {
      // Formata a data para exibição amigável
      let dataFormatada = agendamento.data
      try {
        const dateObj = new Date(`${agendamento.data}T00:00:00`)
        dataFormatada = format(dateObj, "dd/MM/yyyy (EEEE)", { locale: ptBR })
      } catch {
        // mantém o formato original se a conversão falhar
      }

      const templateData: Record<string, string> = {
        nome: agendamento.nome_fiel,
        nome_fiel: agendamento.nome_fiel,
        pastor: agendamento.pastor_nome ?? '',
        data: dataFormatada,
        hora: agendamento.hora?.slice(0, 5) ?? '',
        assunto: agendamento.assunto,
        telefone: agendamento.telefone,
      }

      // Mensagem para o fiel
      const msgFiel = config.msg_lembrete
        ? preencherTemplate(config.msg_lembrete, templateData)
        : `Olá ${agendamento.nome_fiel}! Lembrete: você tem um agendamento com o(a) pastor(a) ${agendamento.pastor_nome ?? ''} no dia ${dataFormatada} às ${agendamento.hora?.slice(0, 5) ?? ''}.`

      // Mensagem para o pastor
      const msgPastor = config.msg_pastor
        ? preencherTemplate(config.msg_pastor, templateData)
        : `Lembrete de agendamento: ${agendamento.nome_fiel} - ${agendamento.assunto} - ${dataFormatada} às ${agendamento.hora?.slice(0, 5) ?? ''}.`

      const urlFiel = agendamento.telefone
        ? gerarUrl(agendamento.telefone, msgFiel)
        : null

      const urlPastor = agendamento.pastor_tel
        ? gerarUrl(agendamento.pastor_tel, msgPastor)
        : null

      resultados.push({
        agendamento,
        whatsappUrl: urlFiel,
        whatsappUrlPastor: urlPastor,
      })

      // Marca como enviado no banco
      await marcarLembreteEnviado(agendamento.id)
    }

    return NextResponse.json({
      success: true,
      processados: resultados.length,
      lembretes: resultados,
    })
  } catch (error) {
    console.error('Erro no scheduler:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
