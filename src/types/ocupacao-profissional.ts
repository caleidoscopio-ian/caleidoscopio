export interface BlocoGrade {
  id?: string
  diaSemana: number       // 0=Dom, 1=Seg ... 6=Sáb
  hora_inicio: string     // "08:00"
  hora_fim: string        // "18:00"
  filialId?: string | null
  ativo?: boolean
}

/**
 * Filial que pode ser escolhida num bloco da grade: o vínculo do profissional
 * interseccionado com o escopo de quem está configurando.
 * Servida por `GET /api/terapeutas/[id]/grade`.
 */
export interface FilialDaGrade {
  id: string
  nome: string
  /** fora do vínculo do profissional, mas já usada por um bloco existente */
  foraDoVinculo: boolean
}

export interface RespostaGrade {
  success: boolean
  data: BlocoGrade[]
  filiais: FilialDaGrade[]
  /** false = profissional sem filial vinculada; a lista veio inteira */
  profissionalRestrito: boolean
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
  /** médias e somas SOBRE AS LINHAS DA TABELA, não sobre todo o cadastro */
  taxa_media: number
  total_agendamentos: number
  horas_disponiveis: number
  horas_agendadas: number
  atendendo_agora: number
  /** quantos profissionais ficaram fora por não ter grade no período */
  profissionais_sem_grade: number
  /** agendamentos desses profissionais, que portanto não entram nos KPIs */
  agendamentos_fora: number
}

export interface OcupacaoResponse {
  success: boolean
  periodo: { inicio: string; fim: string }
  profissionais: OcupacaoProfissional[]
  resumo: OcupacaoResumo
}
