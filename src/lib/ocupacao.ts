// Helpers de cálculo de ocupação de profissionais

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
 * Itera cada dia do intervalo, calcula o dia da semana e soma os blocos ativos.
 */
export function calcularMinutosDisponiveis(
  grade: BlocoGradeSimples[],
  dataInicio: Date,
  dataFim: Date,
  filialFiltro?: string | null,
): number {
  const blocosAtivos = grade.filter(
    (b) =>
      b.ativo !== false &&
      (!filialFiltro || b.filialId == null || b.filialId === filialFiltro),
  )
  if (blocosAtivos.length === 0) return 0

  let total = 0
  const cur = new Date(dataInicio)
  cur.setHours(0, 0, 0, 0)
  const fim = new Date(dataFim)
  fim.setHours(23, 59, 59, 999)

  while (cur <= fim) {
    const dow = cur.getDay()
    for (const bloco of blocosAtivos) {
      if (bloco.diaSemana === dow) {
        const mins = minutosBlocoGrade(bloco)
        if (mins > 0) total += mins
      }
    }
    cur.setDate(cur.getDate() + 1)
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
