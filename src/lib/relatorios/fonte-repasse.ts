// Fonte de linhas do relatório de repasse (Módulo 25, Fase 2).
//
// Reaproveita `carregarAtendimentos`: as linhas de atendimento já trazem
// profissional, parceiro, procedimento, valor e duração — tudo que a regra de
// repasse precisa. Aqui só se acrescenta a resolução da regra e os três valores
// derivados (repasse, líquido, percentual).
//
// A dimensão `regra` é o ponto do relatório: agrupar por ela separa, numa
// coluna só, quem tem regra cadastrada de quem não tem. É assim que os
// profissionais sem regra aparecem em vez de desaparecerem num total.

import { prisma } from "@/lib/prisma";
import {
  calcularRepasse,
  resolverRegra,
  type RegraRepasseResolvivel,
  type TipoRepasse,
} from "@/lib/relatorios/repasse";
import {
  carregarAtendimentos,
  CONVENIO_PARTICULAR,
  type FiltrosAtendimento,
  type ResultadoFonte,
} from "@/lib/relatorios/fonte-atendimentos";

const toNumero = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function carregarRepasse(f: FiltrosAtendimento): Promise<ResultadoFonte> {
  const base = await carregarAtendimentos(f);
  if (base.excedeuLimite || base.linhas.length === 0) return base;

  const profissionaisEnvolvidos = [
    ...new Set(
      base.linhas.map((l) => l.dimensoes.profissional?.id).filter((id): id is string => !!id)
    ),
  ];

  const registros = await prisma.regraRepasse.findMany({
    where: {
      tenantId: f.tenantId,
      ativo: true,
      profissionalId: { in: profissionaisEnvolvidos },
    },
    select: {
      id: true,
      profissionalId: true,
      convenioId: true,
      procedimentoId: true,
      tipo: true,
      valor: true,
      descricao: true,
      vigencia_inicio: true,
      vigencia_fim: true,
      prioridade: true,
    },
  });

  // Indexadas por profissional: o resolvedor recebe só as regras de quem atendeu
  const porProfissional = new Map<string, RegraRepasseResolvivel[]>();
  for (const r of registros) {
    const lista = porProfissional.get(r.profissionalId) ?? [];
    lista.push({
      id: r.id,
      profissionalId: r.profissionalId,
      convenioId: r.convenioId,
      procedimentoId: r.procedimentoId,
      tipo: r.tipo as TipoRepasse,
      valor: toNumero(r.valor),
      descricao: r.descricao,
      vigencia_inicio: r.vigencia_inicio,
      vigencia_fim: r.vigencia_fim,
      prioridade: r.prioridade,
    });
    porProfissional.set(r.profissionalId, lista);
  }

  let semRegra = 0;
  let semBrutoParaPercentual = 0;
  let acimaDoBruto = 0;
  const profissionaisSemRegra = new Set<string>();

  const linhas = base.linhas.map((l) => {
    const profissionalId = l.dimensoes.profissional?.id ?? null;
    const parceiroId = l.dimensoes.parceiro?.id ?? null;
    const contexto = {
      // `detalhe.data` é o ISO do atendimento, gravado pela fonte de atendimentos
      data: new Date(String(l.detalhe?.data ?? "")),
      // particular é `convenioId = null` na regra; na dimensão ele vira um id
      // sintético, então precisa voltar a null aqui
      convenioId: parceiroId === CONVENIO_PARTICULAR ? null : parceiroId,
      procedimentoId: l.dimensoes.procedimento?.id ?? null,
      valorBruto: l.valores.valor_total ?? null,
      duracaoMinutos: toNumero(l.valores.duracao_total),
    };

    const regras = profissionalId ? (porProfissional.get(profissionalId) ?? []) : [];
    const regra = resolverRegra(regras, contexto);
    const r = calcularRepasse(regra, contexto);

    if (r.motivo === "sem-regra") {
      semRegra++;
      if (l.dimensoes.profissional?.rotulo) profissionaisSemRegra.add(l.dimensoes.profissional.rotulo);
    }
    if (r.motivo === "sem-valor-bruto") semBrutoParaPercentual++;
    if (r.repasseAcimaDoBruto) acimaDoBruto++;

    return {
      ...l,
      dimensoes: {
        ...l.dimensoes,
        regra: { id: r.regraId, rotulo: r.rotuloRegra },
      },
      valores: {
        ...l.valores,
        valor_repasse: r.valorRepasse,
        valor_liquido: r.valorLiquido,
      },
      detalhe: {
        ...l.detalhe,
        regra: r.rotuloRegra,
        valor_repasse: r.valorRepasse,
        valor_liquido: r.valorLiquido,
      },
    };
  });

  const avisos = [...base.avisos];

  if (semRegra > 0) {
    const nomes = [...profissionaisSemRegra].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const amostra = nomes.slice(0, 5).join(", ");
    avisos.push(
      `${semRegra} de ${linhas.length} atendimentos estão sem regra de repasse aplicável ` +
        `(${nomes.length} ${nomes.length === 1 ? "profissional" : "profissionais"}: ${amostra}` +
        `${nomes.length > 5 ? ` e mais ${nomes.length - 5}` : ""}). ` +
        `Cadastre a regra na ficha do profissional para que entrem no cálculo.`
    );
  }
  if (semBrutoParaPercentual > 0) {
    const um = semBrutoParaPercentual === 1;
    avisos.push(
      `${semBrutoParaPercentual} ${um ? "atendimento tem" : "atendimentos têm"} regra percentual ` +
        `mas ${um ? "não tem" : "não têm"} valor cobrado — não há sobre o que aplicar o ` +
        `percentual, então o repasse aparece como "—".`
    );
  }
  if (acimaDoBruto > 0) {
    avisos.push(
      `Atenção: ${acimaDoBruto} ${acimaDoBruto === 1 ? "atendimento tem" : "atendimentos têm"} ` +
        `repasse maior que o valor cobrado, o que deixa o líquido da clínica negativo. ` +
        `Confira a regra cadastrada.`
    );
  }

  return { ...base, linhas, avisos };
}
