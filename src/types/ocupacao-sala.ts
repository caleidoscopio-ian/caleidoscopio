export type StatusAgendamento =
  | "AGENDADO"
  | "CONFIRMADO"
  | "EM_ATENDIMENTO"
  | "ATENDIDO"
  | "FALTOU"
  | "CANCELADO";

export const STATUS_LABEL: Record<StatusAgendamento, string> = {
  AGENDADO: "Agendado",
  CONFIRMADO: "Confirmado",
  EM_ATENDIMENTO: "Em atendimento",
  ATENDIDO: "Atendido",
  FALTOU: "Faltou",
  CANCELADO: "Cancelado",
};

export const STATUS_COR: Record<StatusAgendamento, string> = {
  AGENDADO: "#3b82f6",
  CONFIRMADO: "#10b981",
  EM_ATENDIMENTO: "#f59e0b",
  ATENDIDO: "#6b7280",
  FALTOU: "#ef4444",
  CANCELADO: "#9ca3af",
};

/** Status que indicam uso real da sala */
export const STATUS_OCUPADOS: StatusAgendamento[] = [
  "AGENDADO",
  "CONFIRMADO",
  "EM_ATENDIMENTO",
  "ATENDIDO",
];

export interface AgendamentoOcupacao {
  id: string;
  data_hora: string;
  horario_fim: string;
  status: StatusAgendamento;
  paciente: { id: string; nome: string } | null;
  profissional: {
    id: string;
    nome: string;
    especialidade: string | null;
  } | null;
  procedimento: { id: string; nome: string; cor: string | null } | null;
}

export interface SalaOcupacao {
  id: string;
  nome: string;
  cor: string | null;
  capacidade: number | null;
  filial: { id: string; nome: string; cor: string | null } | null;
  agendamentos: AgendamentoOcupacao[];
}

export interface OcupacaoResponse {
  success: boolean;
  data: SalaOcupacao[];
  total_salas: number;
  total_agendamentos: number;
  periodo: { inicio: string; fim: string };
}

// ─── Grade de funcionamento da sala (Módulo 27) ──────────────────────────────

export interface BlocoGradeSala {
  id?: string;
  diaSemana: number; // 0=Dom … 6=Sáb
  hora_inicio: string; // "08:00"
  hora_fim: string; // "18:00"
  ativo?: boolean;
}

export interface RespostaGradeSala {
  success: boolean;
  data: BlocoGradeSala[];
  sala: { id: string; nome: string; filial: string | null };
}

// ─── Capacidade: sala x profissional x agendado ──────────────────────────────

/**
 * Decomposição da capacidade de uma sala no período. Os três últimos somam
 * `minutos_capacidade`:
 *
 *   capacidade = agendado + livre com profissional + livre sem profissional
 *
 * "Livre sem profissional" é o número de gestão: sala aberta, ninguém
 * escalado. É aí que cabe contratar.
 */
export interface CapacidadeSala {
  id: string;
  nome: string;
  cor: string | null;
  filial: { id: string; nome: string } | null;
  /** minutos em que a sala está aberta no período (grade da sala) */
  minutos_capacidade: number;
  /** desses, quantos têm pelo menos um profissional com grade na filial */
  minutos_com_profissional: number;
  /** uso dentro do horário da sala */
  minutos_agendados: number;
  /** uso em horário de sala fechada — grade errada ou marcação errada */
  minutos_agendados_fora: number;
  minutos_livres_com_profissional: number;
  minutos_livres_sem_profissional: number;
  atendimentos: number;
  /** taxa sobre a capacidade da sala (0..1+) */
  taxa_ocupacao: number;
  /** taxa sobre o que é de fato atendível (sala aberta E profissional escalado) */
  taxa_sobre_atendivel: number;
}

/**
 * Teto vendável de uma unidade: `min(salas abertas, profissionais escalados)`
 * minuto a minuto.
 *
 * Mora no agregado por filial e não na sala porque não é atribuível a uma sala
 * — o `min` é da unidade. Grade de profissional não aponta para sala, então sem
 * esse corte a sobra "livre com profissional" é contada em todas as salas
 * abertas ao mesmo tempo.
 */
export interface TetoVendavel {
  minutos_profissional: number;
  minutos_efetivos: number;
  minutos_agendados_efetivos: number;
  minutos_livres_efetivos: number;
  /** sala aberta sem ninguém para ocupar, cabe contratar */
  minutos_limitados_por_pessoa: number;
  /** profissional escalado sem sala livre,cabe abrir sala */
  minutos_limitados_por_sala: number;
}

export interface CapacidadeFilial extends TetoVendavel {
  id: string | null;
  nome: string;
  salas: number;
  minutos_capacidade: number;
  minutos_com_profissional: number;
  minutos_agendados: number;
  minutos_agendados_fora: number;
  minutos_livres_com_profissional: number;
  minutos_livres_sem_profissional: number;
  atendimentos: number;
  taxa_ocupacao: number;
}

export interface CapacidadeResposta {
  success: boolean;
  periodo: { inicio: string; fim: string };
  /** por sala: capacidade física, sem o corte de simultaneidade */
  salas: CapacidadeSala[];
  filiais: CapacidadeFilial[];
  total: Omit<CapacidadeFilial, "id" | "nome">;
  /** salas sem grade cadastrada — ficam FORA de todos os números acima */
  salas_sem_grade: { id: string; nome: string; filial: string | null }[];
  /** salas com grade que não abrem em nenhum dos dias do período escolhido */
  salas_fechadas_no_periodo: number;
  error?: string;
}
