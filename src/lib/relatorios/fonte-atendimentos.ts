// Fonte de linhas da Central de Relatórios: agendamentos (Módulo 25).
//
// Serve os relatórios 1 (atendimentos) e 6 (parceiro de negócio) — ambos olham
// os mesmos atendimentos, só mudam o agrupamento padrão.
//
// Server-only: usa Prisma. A agregação em cima destas linhas é pura e vive em
// `agregacao.ts`.
//
// Precedência dos dados:
//
//   filial        → agendamento.filialId (escolhido/validado) ▸ sala.filialId
//   especialidade → especialidade_snapshot (carimbo) ▸ profissional.especialidade
//   valor         → valor_cobrado (carimbo) ▸ tabela do convênio / valor particular
//
// Sobre a filial (Módulo 26): ela deixou de ser derivada e passou a ser um campo
// do agendamento, escolhido na marcação e validado contra a sala. O backfill
// preencheu os 1245 registros existentes a partir da sala, então a derivação
// abaixo só entra em cena se uma sala ficar sem filial — caso em que não há
// unidade a atribuir.
//
// A derivação NÃO usa a filial do profissional, de propósito: ela é um vínculo
// administrativo, não um lugar. A Elisangela tem perfil em Bragança e 137 de 151
// atendimentos em Extrema.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularPrecoProcedimento } from "@/lib/preco-procedimento";
import { chaveDia, chaveMes, chaveSemana } from "@/lib/datas-fuso";
import {
  formatarChaveDia,
  formatarChaveMes,
  formatarChaveSemana,
} from "@/lib/relatorios/formatacao";
import type { LinhaRelatorio } from "@/types/relatorio";

/** Teto de linhas trazidas para a memória de uma vez. Acima disso, pedimos
 *  período menor em vez de derrubar o processo. */
export const LIMITE_LINHAS = 20000;

export interface FiltrosAtendimento {
  tenantId: string;
  inicio: Date;
  fim: Date;
  status: string[];
  /**
   * Unidades a considerar. `null`/vazio = todas.
   *
   * É lista porque, desde o Módulo 26, a pessoa pode operar em mais de uma
   * filial — um usuário vinculado a duas unidades precisa ver as duas.
   */
  filiais?: string[] | null;
  profissionalId?: string | null;
  /** "particular" = pacientes sem convênio */
  convenioId?: string | null;
  especialidade?: string | null;
  procedimentoId?: string | null;
}

export const CONVENIO_PARTICULAR = "particular";

export interface ResultadoFonte {
  linhas: LinhaRelatorio[];
  avisos: string[];
  excedeuLimite: boolean;
  totalNoBanco: number;
}

/** Monta o `where` do agendamento. Sempre ancorado no tenant por duas pontas. */
function montarWhere(f: FiltrosAtendimento): Prisma.agendamentoWhereInput {
  const particular = f.convenioId === CONVENIO_PARTICULAR;
  return {
    paciente: {
      tenantId: f.tenantId,
      ...(particular ? { convenioId: null } : {}),
      ...(f.convenioId && !particular ? { convenioId: f.convenioId } : {}),
    },
    profissional: { tenantId: f.tenantId },
    data_hora: { gte: f.inicio, lte: f.fim },
    ...(f.status.length > 0
      ? { status: { in: f.status as Prisma.EnumStatusAgendamentoFilter["in"] } }
      : {}),
    ...(f.profissionalId ? { profissionalId: f.profissionalId } : {}),
    ...(f.procedimentoId ? { procedimentoId: f.procedimentoId } : {}),
    // ATENÇÃO à diferença entre `null` e `[]` — ela é de segurança:
    //
    //   null  = sem restrição de filial (não filtrar)
    //   []    = nenhuma filial permitida (não casar com nada)
    //
    // `intersecaoFilial` devolve `[]` quando o usuário pede uma unidade fora do
    // escopo dele. Tratar `[]` como "não filtrar" fazia um não-admin de Bragança
    // pedir "Extrema" e receber TODAS as unidades — mais do que ele pode ver.
    //
    // O `OR` com a sala é rede para registro cuja sala não tem unidade definida.
    ...(f.filiais
      ? {
          OR: [
            { filialId: { in: f.filiais } },
            { filialId: null, salaRelacao: { filialId: { in: f.filiais } } },
          ],
        }
      : {}),
  };
}

const toNumero = (v: Prisma.Decimal | number | string | null): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export async function carregarAtendimentos(f: FiltrosAtendimento): Promise<ResultadoFonte> {
  const where = montarWhere(f);
  const avisos: string[] = [];

  const totalNoBanco = await prisma.agendamento.count({ where });
  if (totalNoBanco > LIMITE_LINHAS) {
    return { linhas: [], avisos, excedeuLimite: true, totalNoBanco };
  }

  const registros = await prisma.agendamento.findMany({
    where,
    select: {
      id: true,
      data_hora: true,
      horario_fim: true,
      status: true,
      motivo_falta: true,
      procedimentoId: true,
      valor_particular: true,
      // carimbos da Fase 0
      filialId: true,
      especialidade_snapshot: true,
      valor_cobrado: true,
      paciente: {
        select: {
          id: true,
          nome: true,
          convenioId: true,
          convenio: { select: { id: true, razao_social: true, nome_fantasia: true } },
        },
      },
      profissional: { select: { id: true, nome: true, especialidade: true } },
      procedimento: {
        select: { id: true, nome: true, codigo: true, valor: true, valor_particular: true },
      },
      salaRelacao: {
        select: { id: true, nome: true, filialId: true, filial: { select: { id: true, nome: true } } },
      },
    },
    orderBy: { data_hora: "asc" },
  });

  // Tabela do convênio só é necessária para as linhas sem valor carimbado
  const paresSemCarimbo = new Set<string>();
  for (const r of registros) {
    if (toNumero(r.valor_cobrado) !== null) continue;
    const cId = r.paciente?.convenioId;
    if (cId && r.procedimentoId) paresSemCarimbo.add(`${cId}|${r.procedimentoId}`);
  }

  const tabela = new Map<string, number | null>();
  if (paresSemCarimbo.size > 0) {
    const convenioIds = [...new Set([...paresSemCarimbo].map((p) => p.split("|")[0]))];
    const procedimentoIds = [...new Set([...paresSemCarimbo].map((p) => p.split("|")[1]))];
    const entradas = await prisma.convenioTabela.findMany({
      where: {
        tenantId: f.tenantId,
        convenioId: { in: convenioIds },
        procedimentoId: { in: procedimentoIds },
        ativo: true,
      },
      select: { convenioId: true, procedimentoId: true, valor_convenio: true },
    });
    for (const e of entradas) {
      tabela.set(`${e.convenioId}|${e.procedimentoId}`, toNumero(e.valor_convenio));
    }
  }

  // Nomes das filiais carimbadas: filialId não tem relação com Filial (um
  // snapshot não pode ser apagado por onDelete), então o nome vem à parte.
  const filiaisCarimbadas = [
    ...new Set(registros.map((r) => r.filialId).filter((id): id is string => !!id)),
  ];
  const nomeFilial = new Map<string, string>();
  if (filiaisCarimbadas.length > 0) {
    const filiais = await prisma.filial.findMany({
      where: { tenantId: f.tenantId, id: { in: filiaisCarimbadas } },
      select: { id: true, nome: true },
    });
    for (const fl of filiais) nomeFilial.set(fl.id, fl.nome);
  }

  let semFilialGravada = 0;
  let semValor = 0;

  const linhas: LinhaRelatorio[] = registros.map((r) => {
    // ── filial: carimbo ▸ sala
    let filialId: string | null = r.filialId;
    let filialNome: string | null = filialId ? (nomeFilial.get(filialId) ?? null) : null;
    if (!filialId) {
      semFilialGravada++;
      filialId = r.salaRelacao?.filialId ?? null;
      filialNome = r.salaRelacao?.filial?.nome ?? null;
    }
    // Filial carimbada que não existe mais: o id fica, o nome é desconhecido
    if (filialId && !filialNome) filialNome = "Filial removida";

    // ── especialidade: carimbo ▸ profissional
    const especialidade = r.especialidade_snapshot ?? r.profissional?.especialidade ?? null;

    // ── valor: carimbo ▸ recálculo
    let valor = toNumero(r.valor_cobrado);
    if (valor === null) {
      const convenioId = r.paciente?.convenioId ?? null;
      const valorTabela =
        convenioId && r.procedimentoId ? tabela.get(`${convenioId}|${r.procedimentoId}`) : undefined;
      valor = calcularPrecoProcedimento({
        procedimentoId: r.procedimentoId,
        procedimento: r.procedimento
          ? {
              valor: toNumero(r.procedimento.valor),
              valor_particular: toNumero(r.procedimento.valor_particular),
            }
          : null,
        temConvenio: !!convenioId,
        tabelaConvenio:
          valorTabela !== undefined
            ? [{ procedimentoId: r.procedimentoId, valor_convenio: valorTabela }]
            : null,
        valorParticular: toNumero(r.valor_particular),
      }).valor;
    }
    if (valor === null) semValor++;

    const duracao = Math.max(
      0,
      Math.round((r.horario_fim.getTime() - r.data_hora.getTime()) / 60000)
    );

    const convenio = r.paciente?.convenio;
    const convenioNome = convenio ? convenio.nome_fantasia || convenio.razao_social : null;
    const mes = chaveMes(r.data_hora);

    return {
      id: r.id,
      dimensoes: {
        filial: { id: filialId, rotulo: filialNome ?? "Sem filial" },
        especialidade: { id: especialidade, rotulo: especialidade ?? "Sem especialidade" },
        profissional: {
          id: r.profissional?.id ?? null,
          rotulo: r.profissional?.nome ?? "Sem profissional",
        },
        // Particular é entrada sintética: convenioId nulo é um parceiro, não um
        // dado faltando (decisão 1 do plano).
        parceiro: {
          id: r.paciente?.convenioId ?? CONVENIO_PARTICULAR,
          rotulo: convenioNome ?? "Particular",
        },
        procedimento: {
          id: r.procedimento?.id ?? null,
          rotulo: r.procedimento
            ? r.procedimento.codigo
              ? `${r.procedimento.nome} (${r.procedimento.codigo})`
              : r.procedimento.nome
            : "Sem procedimento",
        },
        paciente: { id: r.paciente?.id ?? null, rotulo: r.paciente?.nome ?? "Sem paciente" },
        sala: { id: r.salaRelacao?.id ?? null, rotulo: r.salaRelacao?.nome ?? "Sem sala" },
        mes: { id: mes, rotulo: formatarChaveMes(mes) },
        // usadas só pela série temporal do gráfico
        dia: { id: chaveDia(r.data_hora), rotulo: formatarChaveDia(chaveDia(r.data_hora)) },
        semana: {
          id: chaveSemana(r.data_hora),
          rotulo: formatarChaveSemana(chaveSemana(r.data_hora)),
        },
      },
      quando: r.data_hora.toISOString(),
      valores: {
        valor_total: valor,
        duracao_total: duracao,
      },
      distintos: {
        paciente: r.paciente?.id ?? "",
        profissional: r.profissional?.id ?? "",
      },
      detalhe: {
        data: r.data_hora.toISOString(),
        paciente: r.paciente?.nome ?? null,
        profissional: r.profissional?.nome ?? null,
        procedimento: r.procedimento?.nome ?? null,
        parceiro: convenioNome ?? "Particular",
        sala: r.salaRelacao?.nome ?? null,
        filial: filialNome,
        status: r.status,
        motivo_falta: r.motivo_falta ?? null,
        duracao_minutos: duracao,
        valor,
        valor_carimbado: toNumero(r.valor_cobrado) !== null ? 1 : 0,
      },
    };
  });

  if (semFilialGravada > 0) {
    avisos.push(
      // "agendamentos" e não "atendimentos": a mesma fonte alimenta o relatório
      // de faltas, onde a linha pode ser uma falta ou um cancelamento.
      `${semFilialGravada} de ${linhas.length} agendamentos não têm filial gravada; ` +
        `para eles a filial foi derivada da sala. Confira se a sala usada está ` +
        `vinculada a uma unidade.`
    );
  }
  if (semValor > 0) {
    avisos.push(
      `${semValor} de ${linhas.length} agendamentos estão sem valor — procedimento fora da ` +
        `tabela do convênio e sem valor particular informado. Aparecem como "—", não como zero.`
    );
  }

  return { linhas, avisos, excedeuLimite: false, totalNoBanco };
}
