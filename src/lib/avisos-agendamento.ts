// Avisos de servidor na criação de agendamento — conferências que NÃO bloqueiam.
//
// Por que avisar e não bloquear:
//
// A grade de atendimento sempre foi validada apenas no cliente (o formulário
// recusa o envio). O servidor nunca conferiu, então uma chamada direta à API
// — script de importação, Postman, integração — grava um horário que a tela
// recusaria. Demonstrado: a Claudia tem grade seg–sex, e um POST direto criou
// um agendamento de domingo às 04:00 com status 201.
//
// Fechar isso bloqueando tem um custo imediato: a clínica ainda vai configurar
// a grade de vários profissionais, e uma importação que hoje funciona passaria
// a falhar. Decisão (11/10/2026): **avisar primeiro, observar, e aí decidir se
// bloqueia**. O aviso vai no corpo da resposta, não em log, para quem chamou
// saber na hora.
//
// Quando virar bloqueio, é só trocar o retorno de `avisosDoAgendamento` por um
// `return 400` na rota — a conferência já está pronta aqui, e usa exatamente as
// mesmas funções puras que o formulário usa (`@/lib/grade-agendamento`), então
// tela e API não podem divergir na regra.

import { prisma } from "@/lib/prisma";
import { relogioNoFuso } from "@/lib/datas-fuso";
import { foraDaGrade, gradeDaFilial, temGrade } from "@/lib/grade-agendamento";
import type { BlocoGrade } from "@/types/ocupacao-profissional";

export interface ContextoAviso {
  tenantId: string;
  profissionalId: string;
  /** unidade já resolvida e validada contra a sala */
  filialId: string | null;
  /** instantes completos, como chegaram do cliente */
  ocorrencias: { inicio: Date; fim: Date }[];
}

/**
 * Lista de avisos para o corpo da resposta. Vazia = nada a dizer.
 * Nunca lança: um aviso que falha não pode impedir o agendamento.
 */
export async function avisosDoAgendamento(ctx: ContextoAviso): Promise<string[]> {
  try {
    const grade: BlocoGrade[] = await prisma.gradeAtendimento.findMany({
      where: { tenantId: ctx.tenantId, profissionalId: ctx.profissionalId, ativo: true },
      select: { diaSemana: true, hora_inicio: true, hora_fim: true, filialId: true, ativo: true },
    });

    if (!temGrade(grade)) {
      return [
        "Este profissional não tem grade de atendimento configurada em nenhuma " +
          "unidade. O agendamento foi salvo, mas vale configurar a grade em " +
          "Agenda › Grade de Horários.",
      ];
    }

    const { blocos, semGradeNestaFilial } = gradeDaFilial(grade, ctx.filialId);

    if (semGradeNestaFilial) {
      return [
        "Este profissional tem grade configurada em outra unidade, mas não nesta. " +
          "O agendamento foi salvo, mas vale conferir a Grade de Horários desta filial.",
      ];
    }

    // Dia da semana e hora SEMPRE no fuso da clínica: `getDay()`/`getHours()`
    // usariam o fuso do processo, que em produção é UTC.
    const fora = ctx.ocorrencias.filter((o) => {
      const ini = relogioNoFuso(o.inicio);
      const fim = relogioNoFuso(o.fim);
      return foraDaGrade(blocos, ini.diaSemana, ini.hhmm, fim.hhmm);
    });

    if (fora.length === 0) return [];

    const primeira = relogioNoFuso(fora[0].inicio);
    const total = ctx.ocorrencias.length;

    return [
      total === 1
        ? `O horário ${primeira.hhmm} está fora da grade de atendimento deste ` +
          `profissional neste dia. O agendamento foi salvo, mas confira a Grade de Horários.`
        : `${fora.length} de ${total} ocorrências estão fora da grade de atendimento ` +
          `deste profissional. Foram salvas, mas confira a Grade de Horários.`,
    ];
  } catch {
    // Diagnóstico não pode derrubar a criação do agendamento
    return [];
  }
}
