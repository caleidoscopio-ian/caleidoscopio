export interface BlocoGrade {
  id?: string
  diaSemana: number       // 0=Dom, 1=Seg ... 6=Sáb
  hora_inicio: string     // "08:00"
  hora_fim: string        // "18:00"
  filialId?: string | null
  ativo?: boolean
}

export interface OcupacaoProfissional {
  id: string
  nome: string
  especialidade: string | null
  minutos_disponiveis: number
  minutos_agendados: number
  total_agendamentos: number
  taxa_ocupacao: number     // 0..1+ (pode passar de 1 = overbooking)
  faltas: number
  cancelamentos: number
  atendendo_agora: boolean
  tem_grade: boolean
}

export interface OcupacaoResumo {
  taxa_media: number
  total_agendamentos: number
  horas_disponiveis: number
  horas_agendadas: number
  atendendo_agora: number
  profissionais_sem_grade: number
}

export interface OcupacaoResponse {
  success: boolean
  periodo: { inicio: string; fim: string }
  profissionais: OcupacaoProfissional[]
  resumo: OcupacaoResumo
}
