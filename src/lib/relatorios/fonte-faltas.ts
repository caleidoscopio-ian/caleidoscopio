// Fonte de linhas do relatório de faltas (Módulo 25, Fase 6).
//
// Diferente dos outros relatórios da central, este precisa de DOIS números para
// dizer qualquer coisa: faltas e o total de vezes em que o paciente era
// esperado. Uma clínica com 3 faltas em 300 atendimentos e outra com 3 em 6 não
// têm o mesmo problema. Por isso a fonte carrega ATENDIDO, FALTOU e CANCELADO
// juntos, e cada linha vira um conjunto de contadores 0/1 que o motor soma.
//
// Denominadores, que é a decisão que muda o número:
//
//   taxa de falta        = faltas / (atendidos + faltas)
//     Cancelamento não entra: o paciente avisou e o horário pôde ser
//     reaproveitado. Misturar as duas coisas afunda a taxa de falta e esconde o
//     problema que o relatório existe para mostrar.
//
//   taxa de cancelamento = cancelados / total agendado
//     Aqui o total é tudo, porque a pergunta é outra: quanto da agenda se
//     desfaz antes de acontecer.

import {
  carregarAtendimentos,
  type FiltrosAtendimento,
  type ResultadoFonte,
} from "@/lib/relatorios/fonte-atendimentos";

/** Status que representam um horário que já se resolveu de algum jeito */
export const STATUS_FALTAS = ["ATENDIDO", "FALTOU", "CANCELADO"] as const;

export async function carregarFaltas(f: FiltrosAtendimento): Promise<ResultadoFonte> {
  // O status vem travado pelo catálogo, mas garantir aqui evita que a fonte
  // produza taxa sobre um conjunto que não contém o denominador.
  const base = await carregarAtendimentos({ ...f, status: [...STATUS_FALTAS] });
  if (base.excedeuLimite) return base;

  let faltas = 0;
  let atendidos = 0;
  let cancelados = 0;
  let semMotivo = 0;

  const linhas = base.linhas.map((l) => {
    const status = String(l.detalhe?.status ?? "");
    const ehFalta = status === "FALTOU";
    const ehAtendido = status === "ATENDIDO";
    const ehCancelado = status === "CANCELADO";

    if (ehFalta) {
      faltas++;
      if (!l.detalhe?.motivo_falta) semMotivo++;
    }
    if (ehAtendido) atendidos++;
    if (ehCancelado) cancelados++;

    return {
      ...l,
      valores: {
        ...l.valores,
        // Contadores, não medições: sempre 0 ou 1, nunca null. "Zero faltas" é
        // informação; "—" aqui significaria que não sabemos, e sabemos.
        faltas: ehFalta ? 1 : 0,
        atendidos: ehAtendido ? 1 : 0,
        cancelados: ehCancelado ? 1 : 0,
        esperados: ehFalta || ehAtendido ? 1 : 0,
      },
    };
  });

  const avisos = base.avisos.filter(
    // O aviso de valor sem preço é sobre dinheiro; este relatório é sobre
    // presença, então ele só distrai aqui.
    (a) => !a.includes("sem valor")
  );

  const esperados = faltas + atendidos;

  if (linhas.length === 0) {
    avisos.push(
      "Nenhum agendamento com desfecho registrado no período. O relatório conta " +
        "apenas horários que já foram fechados como atendido, falta ou cancelamento."
    );
  } else if (faltas === 0 && esperados > 0) {
    avisos.push(
      `Nenhuma falta registrada em ${esperados} ${esperados === 1 ? "horário" : "horários"} ` +
        `esperados no período. Se houve falta que não foi marcada na recepção, ela não ` +
        `aparece aqui — o relatório lê o status do agendamento, não a ausência de evolução.`
    );
  }

  if (semMotivo > 0) {
    avisos.push(
      `${semMotivo} de ${faltas} faltas estão sem motivo registrado. O motivo é o que ` +
        `permite separar falta evitável de imprevisto.`
    );
  }

  if (cancelados > 0 && esperados === 0) {
    avisos.push(
      `O período tem ${cancelados} ${cancelados === 1 ? "cancelamento" : "cancelamentos"} e ` +
        `nenhum horário efetivamente esperado, então a taxa de falta aparece como "—": ` +
        `não há denominador.`
    );
  }

  return { ...base, linhas, avisos };
}
