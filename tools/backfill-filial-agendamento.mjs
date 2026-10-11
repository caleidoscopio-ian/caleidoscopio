/**
 * Backfill de `agendamento.filialId` a partir da sala (Módulo 26, Fase 2).
 *
 * Por que a sala: ela É a unidade física. Uma sala fica dentro de um prédio, e
 * esse prédio é a filial. A filial do PROFISSIONAL não serve — é um vínculo
 * administrativo, e a medição mostrou 339 de 945 agendamentos em que as duas
 * discordam (a Elisangela tem perfil em Bragança e 137 atendimentos em Extrema).
 *
 * Garantias:
 *   - Só preenche `filialId` quando ele está NULO. Carimbo existente não é tocado.
 *   - Nenhum outro campo é escrito. Nenhum registro é apagado.
 *   - Simulação por padrão; grava só com --aplicar.
 *   - Idempotente: rodar de novo não encontra nada para fazer.
 *   - Confere, ao final, que a contagem de agendamentos não mudou e que nenhum
 *     registro ficou com filial divergente da sala.
 *
 *   node tools/backfill-filial-agendamento.mjs            # simulação
 *   node tools/backfill-filial-agendamento.mjs --aplicar  # grava
 */

process.loadEnvFile(".env");
const { PrismaClient } = await import("@prisma/client");

const APLICAR = process.argv.includes("--aplicar");
const LOTE = 200;
const prisma = new PrismaClient();

async function comRetry(fn, tentativas = 4) {
  let ultimo;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      const msg = String(e);
      if (!msg.includes("reach database") && !msg.includes("Initialization")) throw e;
      console.log(`  (banco acordando, tentativa ${i + 2}/${tentativas})`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw ultimo;
}

const contar = () =>
  comRetry(async () => ({
    agendamentos: await prisma.agendamento.count(),
    comFilial: await prisma.agendamento.count({ where: { filialId: { not: null } } }),
    semFilial: await prisma.agendamento.count({ where: { filialId: null } }),
    pacientes: await prisma.paciente.count(),
    salas: await prisma.sala.count(),
    glosas: await prisma.glosa.count(),
  }));

async function main() {
  console.log(APLICAR ? "MODO: APLICAR (vai gravar)" : "MODO: SIMULAÇÃO (não grava nada)");

  const antes = await contar();
  console.log("\nANTES:", JSON.stringify(antes));

  // Candidatos: filial nula E sala com filial definida
  const candidatos = await comRetry(() =>
    prisma.agendamento.findMany({
      where: { filialId: null },
      select: {
        id: true,
        status: true,
        data_hora: true,
        salaRelacao: {
          select: { id: true, nome: true, filialId: true, filial: { select: { nome: true } } },
        },
        paciente: { select: { tenantId: true } },
      },
    })
  );

  const porFilial = new Map();
  const porStatus = new Map();
  const porTenant = new Map();
  const semSalaComFilial = [];
  const aAtualizar = [];

  for (const a of candidatos) {
    const filialId = a.salaRelacao?.filialId ?? null;
    if (!filialId) {
      semSalaComFilial.push(a.id);
      continue;
    }
    aAtualizar.push({ id: a.id, filialId });

    const nome = a.salaRelacao?.filial?.nome ?? filialId;
    porFilial.set(nome, (porFilial.get(nome) ?? 0) + 1);
    porStatus.set(a.status, (porStatus.get(a.status) ?? 0) + 1);
    const t = a.paciente?.tenantId ?? "sem-tenant";
    porTenant.set(t, (porTenant.get(t) ?? 0) + 1);
  }

  console.log(`\nSem filial gravada: ${candidatos.length}`);
  console.log(`  com sala que TEM filial  → serão preenchidos: ${aAtualizar.length}`);
  console.log(`  com sala SEM filial      → ficam nulos:       ${semSalaComFilial.length}`);

  console.log("\nDistribuição por filial (o que será gravado):");
  for (const [n, c] of [...porFilial].sort((a, b) => b[1] - a[1])) console.log(`  ${n}: ${c}`);

  console.log("\nPor status:");
  for (const [n, c] of [...porStatus].sort((a, b) => b[1] - a[1])) console.log(`  ${n}: ${c}`);

  console.log("\nPor clínica:");
  for (const [n, c] of [...porTenant].sort((a, b) => b[1] - a[1])) console.log(`  ${n}: ${c}`);

  const maisAntigo = candidatos.reduce(
    (m, a) => (!m || a.data_hora < m ? a.data_hora : m),
    null
  );
  const maisNovo = candidatos.reduce((m, a) => (!m || a.data_hora > m ? a.data_hora : m), null);
  console.log(
    `\nPeríodo afetado: ${maisAntigo?.toISOString().slice(0, 10)} a ${maisNovo?.toISOString().slice(0, 10)}`
  );

  // Já carimbados: confere se algum divergiria da sala (não deveria existir)
  const jaCarimbados = await comRetry(() =>
    prisma.agendamento.findMany({
      where: { filialId: { not: null } },
      select: { id: true, filialId: true, salaRelacao: { select: { filialId: true } } },
    })
  );
  const divergentes = jaCarimbados.filter(
    (a) => a.salaRelacao?.filialId && a.salaRelacao.filialId !== a.filialId
  );
  console.log(
    `\nJá tinham filial: ${jaCarimbados.length} (divergindo da sala: ${divergentes.length})`
  );
  if (divergentes.length > 0) {
    console.log("  ATENÇÃO: estes NÃO serão tocados, mas vale investigar:");
    for (const d of divergentes.slice(0, 10)) console.log(`    ${d.id}`);
  }

  if (!APLICAR) {
    console.log("\nSimulação encerrada. Rode com --aplicar para gravar.");
    await prisma.$disconnect();
    return;
  }

  // Grava agrupado por filial: um updateMany por filial, restrito a filialId
  // nulo. Se outra sessão carimbar no meio, o `filialId: null` do where impede
  // sobrescrever o que já foi gravado.
  const idsPorFilial = new Map();
  for (const a of aAtualizar) {
    const lista = idsPorFilial.get(a.filialId) ?? [];
    lista.push(a.id);
    idsPorFilial.set(a.filialId, lista);
  }

  let gravados = 0;
  for (const [filialId, ids] of idsPorFilial) {
    for (let i = 0; i < ids.length; i += LOTE) {
      const fatia = ids.slice(i, i + LOTE);
      const r = await comRetry(() =>
        prisma.agendamento.updateMany({
          where: { id: { in: fatia }, filialId: null },
          data: { filialId },
        })
      );
      gravados += r.count;
    }
    console.log(`  ${filialId}: ${ids.length} pedidos`);
  }

  const depois = await contar();
  console.log(`\ngravados: ${gravados}`);
  console.log("DEPOIS:", JSON.stringify(depois));

  let ok = true;
  if (antes.agendamentos !== depois.agendamentos) {
    console.log(`FALHA: total de agendamentos mudou (${antes.agendamentos} → ${depois.agendamentos})`);
    ok = false;
  }
  for (const k of ["pacientes", "salas", "glosas"]) {
    if (antes[k] !== depois[k]) {
      console.log(`FALHA: ${k} mudou de ${antes[k]} para ${depois[k]}`);
      ok = false;
    }
  }
  if (depois.comFilial !== antes.comFilial + gravados) {
    console.log(
      `FALHA: comFilial = ${depois.comFilial}, esperado ${antes.comFilial + gravados}`
    );
    ok = false;
  }

  // Nenhum registro pode ter ficado com filial diferente da sala
  const inconsistentes = await comRetry(() =>
    prisma.agendamento.findMany({
      where: { filialId: { not: null } },
      select: { id: true, filialId: true, salaRelacao: { select: { filialId: true } } },
    })
  );
  const ruins = inconsistentes.filter(
    (a) => a.salaRelacao?.filialId && a.salaRelacao.filialId !== a.filialId
  );
  if (ruins.length > divergentes.length) {
    console.log(`FALHA: divergências subiram de ${divergentes.length} para ${ruins.length}`);
    ok = false;
  } else {
    console.log(`coerência filial×sala: ${ruins.length} divergência(s) (era ${divergentes.length})`);
  }

  console.log(ok ? "\nOK — só `filialId` nulo foi preenchido." : "\nVERIFICAR");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});
