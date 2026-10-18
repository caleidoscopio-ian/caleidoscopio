// Helpers de cálculo de ocupação de profissionais

import { diasDoPeriodo } from '@/lib/datas-fuso'

export interface BlocoGradeSimples {
  diaSemana: number
  hora_inicio: string
  hora_fim: string
  filialId?: string | null
  ativo?: boolean
}

/** Converte "HH:MM" para minutos desde meia-noite */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** Minutos de um bloco de grade */
export function minutosBlocoGrade(bloco: BlocoGradeSimples): number {
  return horaParaMinutos(bloco.hora_fim) - horaParaMinutos(bloco.hora_inicio)
}

/**
 * Soma os minutos disponíveis de uma grade num intervalo de datas.
 *
 * Itera cada dia do intervalo **no fuso da clínica** (`diasDoPeriodo`) e soma
 * os blocos daquele dia da semana. Usar `getDay()` sobre o instante usaria o
 * fuso do processo: em produção (UTC) o fim do período — 23:59:59.999 em
 * Brasília — já é o dia seguinte, e o laço contava um dia a mais. Numa semana
 * de grade seg–sex isso virava 6 dias úteis em vez de 5: 20% de erro no
 * denominador da taxa.
 */
export function calcularMinutosDisponiveis(
  grade: BlocoGradeSimples[],
  dataInicio: Date,
  dataFim: Date,
  /**
   * Unidades a considerar. Lista porque, desde o Módulo 26, o usuário pode
   * operar em mais de uma filial — e aí os minutos disponíveis são a soma dos
   * blocos das unidades que ele vê, não de uma só.
   * Bloco com `filialId` nulo vale em qualquer unidade.
   */
  filialFiltro?: string | string[] | null,
): number {
  const filiais = filialFiltro
    ? (Array.isArray(filialFiltro) ? filialFiltro : [filialFiltro]).filter(Boolean)
    : []
  const blocosAtivos = grade.filter(
    (b) =>
      b.ativo !== false &&
      (filiais.length === 0 || b.filialId == null || filiais.includes(b.filialId)),
  )
  if (blocosAtivos.length === 0) return 0

  let total = 0
  for (const { diaSemana } of diasDoPeriodo(dataInicio, dataFim)) {
    for (const bloco of blocosAtivos) {
      if (bloco.diaSemana === diaSemana) {
        const mins = minutosBlocoGrade(bloco)
        if (mins > 0) total += mins
      }
    }
  }
  return total
}

/** Minutos de um agendamento */
export function minutosAgendamento(dataHora: Date | string, horarioFim: Date | string): number {
  const ini = new Date(dataHora).getTime()
  const fim = new Date(horarioFim).getTime()
  return Math.max(0, Math.round((fim - ini) / 60000))
}

/** Formata minutos como "Xh Ymin" */
export function formatarMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

/** Cor da barra de taxa de ocupação */
export function corTaxaOcupacao(taxa: number): string {
  if (taxa >= 1) return 'bg-red-500'
  if (taxa >= 0.8) return 'bg-amber-500'
  if (taxa >= 0.5) return 'bg-green-500'
  return 'bg-blue-400'
}

/** Texto da taxa formatado */
export function formatarTaxa(taxa: number): string {
  return `${Math.round(taxa * 100)}%`
}
