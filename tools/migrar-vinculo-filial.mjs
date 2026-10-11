/**
 * Migração aditiva: UsuarioRole.filialId → ProfissionalFilial (Módulo 26).
 *
 * Até aqui a unidade da pessoa morava em `UsuarioRole.filialId`, que cabe UMA
 * filial. O Módulo 26 passa a usar `ProfissionalFilial` (N:N), porque a mesma
 * pessoa — uma secretária, por exemplo — pode trabalhar em várias unidades.
 *
 * Esta migração copia o vínculo existente para a tabela nova:
 *
 *   - NADA é apagado. `UsuarioRole.filialId` fica intacto e continua servindo
 *     de fallback para quem não tiver linha em ProfissionalFilial.
 *   - É idempotente: a chave primária é (profissionalId, filialId), então
 *     rodar duas vezes não duplica. Rodar de novo após a clínica cadastrar
 *     vínculos novos também não os desfaz.
 *   - Não sobrescreve quem já tem vínculo: se o profissional já tem linhas em
 *     ProfissionalFilial, ele é pulado (a clínica já configurou à mão).
 *
 *   node tools/migrar-vinculo-filial.mjs            # simulação, não escreve
 *   node tools/migrar-vinculo-filial.mjs --aplicar  # grava
 */

process.loadEnvFile(".env");
const { PrismaClient } = await import("@prisma/client");

const APLICAR = process.argv.includes("--aplicar");
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
    profissionalFilial: await prisma.profissionalFilial.count(),
    usuarioRole: await prisma.usuarioRole.count(),
    usuarioRoleComFilial: await prisma.usuarioRole.count({ where: { filialId: { not: null } } }),
    profissionais: await prisma.profissional.count(),
    agendamentos: await prisma.agendamento.count(),
  }));

async function main() {
  console.log(APLICAR ? "MODO: APLICAR (vai gravar)" : "MODO: SIMULAÇÃO (não grava nada)");

  const antes = await contar();
  console.log("\nANTES:", JSON.stringify(antes));

  const roles = await comRetry(() =>
    prisma.usuarioRole.findMany({
      where: { filialId: { not: null } },
      select: { usuarioId: true, tenantId: true, filialId: true, ativo: true },
    })
  );

  console.log(`\nUsuarioRole com filialId: ${roles.length}`);

  const aCriar = [];
  const pulados = [];

  for (const r of roles) {
    const profissional = await comRetry(() =>
      prisma.profissional.findFirst({
        where: { tenantId: r.tenantId, usuarioId: r.usuarioId },
        select: { id: true, nome: true, filiais: { select: { filialId: true } } },
      })
    );

    if (!profissional) {
      pulados.push({ motivo: "sem registro em profissional", usuarioId: r.usuarioId });
      continue;
    }
    if (profissional.filiais.length > 0) {
      pulados.push({ motivo: "já tem vínculo em ProfissionalFilial", nome: profissional.nome });
      continue;
    }
    if (!r.ativo) {
      pulados.push({ motivo: "UsuarioRole inativo", nome: profissional.nome });
      continue;
    }

    // A filial precisa existir e ser do mesmo tenant — um filialId órfão
    // criaria vínculo para uma unidade de outra clínica.
    const filial = await comRetry(() =>
      prisma.filial.findFirst({
        where: { id: r.filialId, tenantId: r.tenantId },
        select: { id: true, nome: true },
      })
    );
    if (!filial) {
      pulados.push({ motivo: "filial não existe neste tenant", nome: profissional.nome });
      continue;
    }

    aCriar.push({
      profissionalId: profissional.id,
      nome: profissional.nome,
      filialId: filial.id,
      filialNome: filial.nome,
    });
  }

  console.log(`\nA CRIAR (${aCriar.length}):`);
  for (const c of aCriar) console.log(`  ${c.nome} → ${c.filialNome} (principal)`);

  console.log(`\nPULADOS (${pulados.length}):`);
  for (const p of pulados) console.log(`  ${p.nome ?? p.usuarioId}: ${p.motivo}`);

  if (!APLICAR) {
    console.log("\nSimulação encerrada. Rode com --aplicar para gravar.");
    await prisma.$disconnect();
    return;
  }

  let criados = 0;
  for (const c of aCriar) {
    // upsert sobre a chave composta: rodar de novo não duplica nem sobrescreve
    await comRetry(() =>
      prisma.profissionalFilial.upsert({
        where: { profissionalId_filialId: { profissionalId: c.profissionalId, filialId: c.filialId } },
        create: { profissionalId: c.profissionalId, filialId: c.filialId, principal: true },
        update: {}, // já existe: não toca
      })
    );
    criados++;
  }

  const depois = await contar();
  console.log(`\ncriados/confirmados: ${criados}`);
  console.log("DEPOIS:", JSON.stringify(depois));

  // Nada além de ProfissionalFilial pode ter mudado
  const intactas = ["usuarioRole", "usuarioRoleComFilial", "profissionais", "agendamentos"];
  let ok = true;
  for (const k of intactas) {
    if (antes[k] !== depois[k]) {
      console.log(`FALHA: ${k} mudou de ${antes[k]} para ${depois[k]}`);
      ok = false;
    }
  }
  const esperado = antes.profissionalFilial + aCriar.length;
  if (depois.profissionalFilial !== esperado) {
    console.log(`FALHA: profissionalFilial = ${depois.profissionalFilial}, esperado ${esperado}`);
    ok = false;
  }

  console.log(ok ? "\nOK — nenhuma tabela além de ProfissionalFilial foi alterada." : "\nVERIFICAR");
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error("ERRO:", e);
  await prisma.$disconnect();
  process.exit(1);
});
