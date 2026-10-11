// Carimbo histórico do agendamento (Módulo 25, corrigido no Módulo 26).
//
// Especialidade e valor eram derivados em tempo de consulta. Isso faz o passado
// mudar: se o terapeuta troca de especialidade, o histórico dele migra junto,
// retroativamente; se o convênio renegocia a tabela, o valor de meses fechados
// muda sozinho. Para relatório gerencial — e sobretudo para repasse — isso é
// inaceitável.
//
// Estes helpers resolvem os valores no momento certo:
//   filial + especialidade → na criação do agendamento
//   valor                  → quando o atendimento vira ATENDIDO (vira receita)
//
// ───── Correção do Módulo 26 ─────
//
// A primeira versão carimbava a filial do PROFISSIONAL (via UsuarioRole /
// ProfissionalFilial). Estava errado, e a medição mostrou por quê: a Elisangela
// tem perfil em Bragança e 137 de 151 atendimentos em Extrema. A filial do
// profissional é um vínculo administrativo, não um lugar — a pessoa pode atender
// em duas unidades na mesma semana.
//
// Agora a filial vem de FORA, já resolvida e validada contra a sala
// (`@/lib/validar-filial-agendamento`). A sala é a unidade física: uma sala está
// dentro de um prédio, e esse prédio é a filial.

import { prisma } from "@/lib/prisma";
import { calcularPrecoProcedimento } from "@/lib/preco-procedimento";

export interface CarimboCriacao {
  filialId: string | null;
  especialidade_snapshot: string | null;
}

/**
 * Carimbo aplicado na criação do agendamento.
 *
 * `filialId` é a unidade JÁ RESOLVIDA E VALIDADA contra a sala — nunca derivada
 * aqui do perfil do profissional (ver nota do Módulo 26 no topo do arquivo).
 *
 * Nunca lança: carimbo ausente vira null e o relatório cai na derivação antiga.
 */
export async function montarCarimboCriacao(
  tenantId: string,
  profissionalId: string,
  filialId: string | null
): Promise<CarimboCriacao> {
  try {
    const profissional = await prisma.profissional.findFirst({
      where: { id: profissionalId, tenantId },
      select: {
        especialidade: true,
        especialidadeCustomizada: { select: { nome: true } },
      },
    });

    // `especialidade` é o texto legado, já derivado dos campos estruturados e
    // mantido em sincronia pela API de terapeutas — inclusive com o nome da
    // especialidade customizada quando é "Outra".
    const especialidade =
      profissional?.especialidadeCustomizada?.nome ??
      profissional?.especialidade ??
      null;

    return { filialId, especialidade_snapshot: especialidade };
  } catch {
    // Falha ao carimbar não pode impedir o agendamento de ser criado
    return { filialId: null, especialidade_snapshot: null };
  }
}

/**
 * Valor efetivado do atendimento, resolvido na transição para ATENDIDO.
 * Devolve null quando não há preço — procedimento fora da tabela do convênio e
 * sem valor particular. Null é estado normal, não erro: travar o fluxo
 * operacional por falta de cadastro de preço sairia mais caro.
 */
export async function resolverValorCobrado(
  agendamentoId: string,
  tenantId: string
): Promise<number | null> {
  try {
    const ag = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, paciente: { tenantId } },
      select: {
        procedimentoId: true,
        valor_particular: true,
        paciente: { select: { convenioId: true } },
        procedimento: { select: { valor: true, valor_particular: true } },
      },
    });
    if (!ag) return null;

    const convenioId = ag.paciente?.convenioId ?? null;
    const entrada =
      convenioId && ag.procedimentoId
        ? await prisma.convenioTabela.findFirst({
            where: {
              tenantId,
              convenioId,
              procedimentoId: ag.procedimentoId,
              ativo: true,
            },
            select: { procedimentoId: true, valor_convenio: true },
          })
        : null;

    const preco = calcularPrecoProcedimento({
      procedimentoId: ag.procedimentoId,
      procedimento: ag.procedimento
        ? {
            valor: ag.procedimento.valor as unknown as number | null,
            valor_particular: ag.procedimento
              .valor_particular as unknown as number | null,
          }
        : null,
      temConvenio: !!convenioId,
      tabelaConvenio: entrada
        ? [
            {
              procedimentoId: entrada.procedimentoId,
              valor_convenio: entrada.valor_convenio as unknown as number | null,
            },
          ]
        : null,
      valorParticular: ag.valor_particular as unknown as number | null,
    });

    return preco.valor;
  } catch {
    return null;
  }
}
