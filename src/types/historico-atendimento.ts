import type { StatusAgendamento } from "./agendamento";

export interface AtendimentoHistorico {
  id: string;
  data_hora: string;
  horario_fim: string;
  duracao_minutos: number;
  status: StatusAgendamento;
  paciente: { id: string; nome: string };
  profissional: { id: string; nome: string; especialidade: string | null };
  procedimento: { id: string; nome: string; codigo: string | null } | null;
  convenio: { id: string; nome: string } | null;
  valor: number | null;
  origem_valor: "convenio" | "particular" | "padrao" | null;
  sala: string | null;
  filial: string | null;
  hora_chegada: string | null;
  hora_inicio_real: string | null;
  hora_fim_real: string | null;
  tempo_espera_min: number | null; // hora_chegada → hora_inicio_real
  duracao_real_min: number | null; // hora_inicio_real → hora_fim_real
  motivo_falta: string | null;
  observacoes: string | null;
}

export interface HistoricoResumo {
  total_atendimentos: number;   // realizados (ATENDIDO)
  valor_total: number;          // soma dos ATENDIDO com valor
  ticket_medio: number;
  faltas: number;
  cancelamentos: number;
  total_registros: number;      // todos os status exibidos
}

export interface HistoricoResponse {
  success: boolean;
  data: AtendimentoHistorico[];
  total: number;
  page: number;
  pageSize: number;
  resumo: HistoricoResumo;
  periodo: { inicio: string; fim: string };
}

export interface HistoricoFiltros {
  dataInicio: Date;
  dataFim: Date;
  status: string[];
  profissionalId: string | null;
  pacienteBusca: string;
  convenioId: string | null;
  procedimentoId: string | null;
  filialId: string | null;
}
