/**
 * Gera atendimentos na Clinica A para popular os relatórios (12/09 a 11/10/2026).
 *
 * Só CRIA — não altera nem apaga nada do que já existe.
 *
 * O que ele respeita, para o dado não contradizer as regras do sistema:
 *   - grade de cada profissional (dia da semana e faixa de horário)
 *   - sem choque de horário: por profissional, por sala e por paciente
 *   - filial vem da SALA (nunca do perfil do profissional)
 *   - preço pela tabela do convênio DO PACIENTE, ou valor particular
 *   - carimbos preenchidos: filialId, especialidade_snapshot, valor_cobrado
 *   - check-in completo nos ATENDIDO; motivo nas faltas
 *
 * Horas de parede são montadas com `instanteNoFuso` — nunca `new Date(a,m,d,h)`,
 * que usaria o fuso do processo (UTC em produção).
 *
 * Rodar (precisa de bundle por causa dos imports com alias):
 *   npx esbuild tools/gerar-atendimentos-clinica-a.ts --bundle --platform=node \
 *     --format=cjs --outfile=.tmp/gen.cjs --tsconfig=tsconfig.json --external:@prisma/client
 *   node .tmp/gen.cjs            # simulação
 *   node .tmp/gen.cjs --aplicar  # grava
 */

// O .env não é carregado fora do Next, e o PrismaClient lê DATABASE_URL no
// construtor — por isso antes de qualquer import que o instancie.
declare const process: {
  loadEnvFile: (p: string) => void;
  argv: string[];
  exit: (n: number) => void;
};
process.loadEnvFile(".env");

import { instanteNoFuso } from "@/lib/datas-fuso";
import { prisma } from "@/lib/prisma";
import { Prisma, StatusAgendamento } from "@prisma/client";
import fs from "node:fs";

const APLICAR = process.argv.includes("--aplicar");
const T = "cmo0h6yky000txal4htlrr3h2";

const DE = { ano: 2026, mes: 9, dia: 12 };
const ATE = { ano: 2026, mes: 10, dia: 11 };

/** Horários de início possíveis, de hora em hora dentro dos blocos da grade */
const HORARIOS = [8, 9, 10, 11, 13, 14, 15, 16];

/** Distribuição de desfecho — todos no passado, então todos fechados */
const DESFECHO: { status: StatusAgendamento; peso: number }[] = [
  { status: StatusAgendamento.ATENDIDO, peso: 72 },
  { status: StatusAgendamento.FALTOU, peso: 14 },
  { status: StatusAgendamento.CANCELADO, peso: 14 },
];

const MOTIVOS_FALTA = [
  "Desistiu de última hora",
  "Paciente adoeceu",
  "Não compareceu e não avisou",
  "Problema de transporte",
];

/** Gerador determinístico: a simulação e a aplicação produzem o mesmo resultado */
function aleatorio(semente: number) {
  let x = semente;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const rnd = aleatorio(20260912);
const escolher = <X>(lista: X[]): X => lista[Math.floor(rnd() * lista.length)];

interface Janela {
  diaSemana: number;
  inicio: number; // minutos
  fim: number;
}

const paraMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

async function main() {
  console.log(APLICAR ? "MODO: APLICAR (grava)" : "MODO: SIMULAÇÃO (não grava nada)");

  const antes = {
    agendamentos: await prisma.agendamento.count({ where: { paciente: { tenantId: T } } }),
    outros: await prisma.agendamento.count({ where: { paciente: { tenantId: { not: T } } } }),
    pacientes: await prisma.paciente.count({ where: { tenantId: T } }),
    salas: await prisma.sala.count({ where: { tenantId: T } }),
  };
  console.log("\nANTES:", JSON.stringify(antes));

  // ───────── fixtures
  const salas = await prisma.sala.findMany({
    where: { tenantId: T, ativo: true, filialId: { not: null } },
    select: { id: true, nome: true, filialId: true, filial: { select: { nome: true, ativo: true } } },
  });
  const salasAtivas = salas.filter((s) => s.filial?.ativo);

  const profs = await prisma.profissional.findMany({
    where: { tenantId: T, ativo: true, tipo_vinculo: "PROFISSIONAL_CLINICO" },
    select: {
      id: true,
      nome: true,
      especialidade: true,
      especialidadeCustomizada: { select: { nome: true } },
      grades: { where: { ativo: true }, select: { diaSemana: true, hora_inicio: true, hora_fim: true, filialId: true } },
    },
  });

  const pacientes = await prisma.paciente.findMany({
    where: { tenantId: T, ativo: true },
    select: { id: true, nome: true, convenioId: true },
  });

  const procedimentos = await prisma.procedimento.findMany({
    where: { tenantId: T, ativo: true },
    select: { id: true, nome: true, duracao_padrao: true, valor_particular: true },
  });

  const tabela = await prisma.convenioTabela.findMany({
    where: { tenantId: T, ativo: true },
    select: { convenioId: true, procedimentoId: true, valor_convenio: true },
  });
  const preco = new Map(tabela.map((t) => [`${t.convenioId}|${t.procedimentoId}`, Number(t.valor_convenio)]));

  console.log(
    `\nfixtures: ${salasAtivas.length} salas · ${profs.length} profissionais · ${pacientes.length} pacientes · ${procedimentos.length} procedimentos · ${preco.size} preços`
  );

  // janelas de grade por profissional
  const janelas = new Map<string, Janela[]>();
  for (const p of profs) {
    janelas.set(
      p.id,
      p.grades.map((g) => ({
        diaSemana: g.diaSemana,
        inicio: paraMinutos(g.hora_inicio),
        fim: paraMinutos(g.hora_fim),
      }))
    );
  }

  // ───────── ocupação já existente, para não criar choque
  const inicioPeriodo = instanteNoFuso(DE.ano, DE.mes, DE.dia, 0, 0);
  const fimPeriodo = instanteNoFuso(ATE.ano, ATE.mes, ATE.dia, 23, 59);
  const existentes = await prisma.agendamento.findMany({
    where: { paciente: { tenantId: T }, data_hora: { gte: inicioPeriodo, lte: fimPeriodo } },
    select: { data_hora: true, horario_fim: true, profissionalId: true, salaId: true, pacienteId: true, status: true },
  });
  console.log(`agendamentos já existentes no período: ${existentes.length}`);

  type Intervalo = [number, number];
  const ocupado = {
    prof: new Map<string, Intervalo[]>(),
    sala: new Map<string, Intervalo[]>(),
    pac: new Map<string, Intervalo[]>(),
  };
  const reservar = (mapa: Map<string, Intervalo[]>, chave: string, i: Intervalo) => {
    const lista = mapa.get(chave) ?? [];
    lista.push(i);
    mapa.set(chave, lista);
  };
  const livre = (mapa: Map<string, Intervalo[]>, chave: string, [ini, fim]: Intervalo) =>
    !(mapa.get(chave) ?? []).some(([a, b]) => ini < b && fim > a);

  for (const e of existentes) {
    if (e.status === StatusAgendamento.CANCELADO) continue;
    const i: Intervalo = [e.data_hora.getTime(), e.horario_fim.getTime()];
    reservar(ocupado.prof, e.profissionalId, i);
    reservar(ocupado.sala, e.salaId, i);
    reservar(ocupado.pac, e.pacienteId, i);
  }

  // ───────── geração
  const novos: Prisma.agendamentoUncheckedCreateInput[] = [];
  const dia = new Date(inicioPeriodo);
  const limite = instanteNoFuso(ATE.ano, ATE.mes, ATE.dia, 23, 59);

  let tentativas = 0;
  let recusasGrade = 0;
  let recusasChoque = 0;

  while (dia <= limite) {
    const { ano, mes, dia: d } = {
      ano: Number(dia.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 4)),
      mes: Number(dia.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(5, 7)),
      dia: Number(dia.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).slice(8, 10)),
    };
    const diaSemana = new Date(Date.UTC(ano, mes - 1, d)).getUTCDay();

    // fim de semana não tem grade em nenhum profissional
    if (diaSemana !== 0 && diaSemana !== 6) {
      for (const prof of profs) {
        const minhas = janelas.get(prof.id) ?? [];
        const doDia = minhas.filter((j) => j.diaSemana === diaSemana);
        if (doDia.length === 0) continue;

        // 2 a 4 atendimentos por profissional por dia
        const quantos = 2 + Math.floor(rnd() * 3);
        const horariosEmbaralhados = [...HORARIOS].sort(() => rnd() - 0.5);

        let criadosHoje = 0;
        for (const h of horariosEmbaralhados) {
          if (criadosHoje >= quantos) break;
          tentativas++;

          const proc = escolher(procedimentos);
          const dur = proc.duracao_padrao ?? 45;
          const ini = h * 60;
          const fim = ini + dur;

          // cabe inteiro em algum bloco da grade daquele dia?
          if (!doDia.some((j) => j.inicio <= ini && j.fim >= fim)) {
            recusasGrade++;
            continue;
          }

          const sala = escolher(salasAtivas);
          const pac = escolher(pacientes);
          const dtInicio = instanteNoFuso(ano, mes, d, h, 0);
          const dtFim = new Date(dtInicio.getTime() + dur * 60000);
          const intervalo: Intervalo = [dtInicio.getTime(), dtFim.getTime()];

          if (
            !livre(ocupado.prof, prof.id, intervalo) ||
            !livre(ocupado.sala, sala.id, intervalo) ||
            !livre(ocupado.pac, pac.id, intervalo)
          ) {
            recusasChoque++;
            continue;
          }

          // desfecho
          const sorteio = rnd() * 100;
          let acumulado = 0;
          // Anotação explícita: sem ela o TS infere o literal "ATENDIDO"
          // e a reatribuição no laço abaixo vira erro de tipo.
          let status: StatusAgendamento = StatusAgendamento.ATENDIDO;
          for (const op of DESFECHO) {
            acumulado += op.peso;
            if (sorteio <= acumulado) {
              status = op.status;
              break;
            }
          }

          // valor: particular tem valor combinado; convênio vem da tabela
          const ehParticular = !pac.convenioId;
          const valorParticular = ehParticular
            ? Number(proc.valor_particular ?? 200)
            : null;
          const valorConvenio = pac.convenioId
            ? (preco.get(`${pac.convenioId}|${proc.id}`) ?? null)
            : null;
          const valorEfetivo = valorParticular ?? valorConvenio;

          const especialidade =
            prof.especialidadeCustomizada?.nome ?? prof.especialidade ?? null;

          novos.push({
            pacienteId: pac.id,
            profissionalId: prof.id,
            salaId: sala.id,
            sala: sala.id, // campo legado
            procedimentoId: proc.id,
            data_hora: dtInicio,
            horario_fim: dtFim,
            duracao_minutos: dur,
            status,
            // carimbos
            filialId: sala.filialId,
            especialidade_snapshot: especialidade,
            valor_particular: valorParticular !== null ? new Prisma.Decimal(valorParticular) : null,
            valor_cobrado:
              status === StatusAgendamento.ATENDIDO && valorEfetivo !== null
                ? new Prisma.Decimal(valorEfetivo)
                : null,
            // ciclo operacional
            ...(status === StatusAgendamento.ATENDIDO
              ? {
                  hora_chegada: new Date(dtInicio.getTime() - 10 * 60000),
                  hora_inicio_real: dtInicio,
                  hora_fim_real: dtFim,
                }
              : {}),
            ...(status === StatusAgendamento.FALTOU
              ? { motivo_falta: escolher(MOTIVOS_FALTA) }
              : {}),
          });

          if (status !== StatusAgendamento.CANCELADO) {
            reservar(ocupado.prof, prof.id, intervalo);
            reservar(ocupado.sala, sala.id, intervalo);
            reservar(ocupado.pac, pac.id, intervalo);
          }
          criadosHoje++;
        }
      }
    }
    dia.setUTCDate(dia.getUTCDate() + 1);
  }

  // ───────── resumo
  const conta = <K>(fn: (x: (typeof novos)[number]) => K) => {
    const m = new Map<K, number>();
    for (const n of novos) m.set(fn(n), (m.get(fn(n)) ?? 0) + 1);
    return m;
  };
  const nomePorId = new Map([
    ...profs.map((x) => [x.id, x.nome] as const),
    ...pacientes.map((x) => [x.id, x.nome] as const),
    ...salasAtivas.map((x) => [x.id, `${x.nome} (${x.filial?.nome})`] as const),
    ...procedimentos.map((x) => [x.id, x.nome] as const),
  ]);
  const rot = (id: string | null | undefined) => (id ? (nomePorId.get(id) ?? id) : "—");

  console.log(`\nA CRIAR: ${novos.length} agendamentos`);
  console.log(`   tentativas=${tentativas} recusadas por grade=${recusasGrade} por choque=${recusasChoque}`);
  console.log("\n  por status:      " + [...conta((n) => n.status)].map(([k, v]) => `${k}=${v}`).join("  "));
  console.log("  por profissional: " + [...conta((n) => rot(n.profissionalId))].map(([k, v]) => `${k}=${v}`).join(" | "));
  console.log("  por sala:         " + [...conta((n) => rot(n.salaId))].map(([k, v]) => `${k}=${v}`).join(" | "));
  console.log("  por paciente:     " + [...conta((n) => rot(n.pacienteId))].map(([k, v]) => `${k}=${v}`).join(" | "));
  console.log("  por procedimento: " + [...conta((n) => rot(n.procedimentoId))].map(([k, v]) => `${k}=${v}`).join(" | "));
  console.log(
    "  por mês:          " +
      [...conta((n) => (n.data_hora as Date).toISOString().slice(0, 7))].sort().map(([k, v]) => `${k}=${v}`).join("  ")
  );
  const comValor = novos.filter((n) => n.valor_cobrado !== null).length;
  const atendidos = novos.filter((n) => n.status === StatusAgendamento.ATENDIDO).length;
  console.log(`\n  ATENDIDO: ${atendidos} | com valor_cobrado: ${comValor} | sem: ${atendidos - comValor}`);
  const soma = novos.reduce((s, n) => s + (n.valor_cobrado ? Number(n.valor_cobrado) : 0), 0);
  console.log(`  faturamento gerado: R$ ${soma.toFixed(2)}`);

  if (!APLICAR) {
    console.log("\nSimulação encerrada. Rode com --aplicar para gravar.");
    await prisma.$disconnect();
    return;
  }

  console.log("\nCRIANDO...");
  const ids: string[] = [];
  for (let i = 0; i < novos.length; i += 25) {
    const lote = novos.slice(i, i + 25);
    for (const n of lote) {
      const r = await prisma.agendamento.create({ data: n, select: { id: true } });
      ids.push(r.id);
    }
    console.log(`  ${Math.min(i + 25, novos.length)}/${novos.length}`);
  }

  fs.writeFileSync(
    "tools/gerados-clinica-a.json",
    JSON.stringify({ criadoEm: new Date().toISOString(), total: ids.length, ids }, null, 2)
  );
  console.log("  ids salvos em tools/gerados-clinica-a.json (para reverter, se precisar)");

  const depois = {
    agendamentos: await prisma.agendamento.count({ where: { paciente: { tenantId: T } } }),
    outros: await prisma.agendamento.count({ where: { paciente: { tenantId: { not: T } } } }),
    pacientes: await prisma.paciente.count({ where: { tenantId: T } }),
    salas: await prisma.sala.count({ where: { tenantId: T } }),
  };
  console.log("\nDEPOIS:", JSON.stringify(depois));

  let ok = true;
  if (depois.agendamentos !== antes.agendamentos + novos.length) {
    console.log(`FALHA: esperado ${antes.agendamentos + novos.length} agendamentos, veio ${depois.agendamentos}`);
    ok = false;
  }
  for (const k of ["outros", "pacientes", "salas"] as const) {
    if (antes[k] !== depois[k]) {
      console.log(`FALHA: ${k} mudou de ${antes[k]} para ${depois[k]}`);
      ok = false;
    }
  }
  console.log(ok ? "\nOK — só agendamentos da Clinica A foram criados." : "\nVERIFICAR");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});
