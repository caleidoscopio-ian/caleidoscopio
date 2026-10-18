// Semeia a grade de funcionamento das salas que JÁ existem no sistema
// (Módulo 27, decisão de 17/10/2026).
//
// Política combinada com a clínica:
//   - sala que já estava cadastrada  → seg a sex, 08:00–18:00
//   - sala criada daqui pra frente   → fica fora dos números de capacidade,
//     com aviso na tela, até alguém preencher
//
// Sem isso o dashboard de capacidade nasceria vazio, porque o model é novo e
// nenhuma sala tem grade. 08:00–18:00 é ponto de partida editável por sala,
// não uma verdade sobre a operação.
//
// Simulação por padrão. Só escreve com --aplicar. NUNCA apaga: sala que já tem
// algum bloco é deixada exatamente como está.
//
//   node tools/semear-grade-salas.mjs            # simula
//   node tools/semear-grade-salas.mjs --aplicar  # grava

import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");

const APLICAR = process.argv.includes("--aplicar");
const DIAS_UTEIS = [1, 2, 3, 4, 5]; // 0=Dom … 6=Sáb
const HORA_INICIO = "08:00";
const HORA_FIM = "18:00";

const prisma = new PrismaClient({ log: [] });

/** Neon hiberna: a primeira query pode falhar por timeout de conexão. */
async function comRetentativa(rotulo, fn, tentativas = 3) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (erro) {
      if (i === tentativas) throw erro;
      console.log(`   (${rotulo}: tentativa ${i} falhou, repetindo em 2s)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  console.log(APLICAR ? "== APLICANDO ==\n" : "== SIMULAÇÃO (use --aplicar para gravar) ==\n");

  const salas = await comRetentativa("salas", () =>
    prisma.sala.findMany({
      select: {
        id: true,
        nome: true,
        tenantId: true,
        ativo: true,
        filial: { select: { nome: true } },
        grades: { select: { id: true } },
      },
      orderBy: [{ tenantId: "asc" }, { nome: "asc" }],
    })
  );

  const antes = await prisma.gradeSala.count();

  const semGrade = salas.filter((s) => s.grades.length === 0);
  const comGrade = salas.filter((s) => s.grades.length > 0);

  console.log(`salas no sistema: ${salas.length}`);
  console.log(`  já têm grade (serão ignoradas): ${comGrade.length}`);
  console.log(`  receberão seg–sex ${HORA_INICIO}–${HORA_FIM}: ${semGrade.length}`);
  console.log(`  (dessas, ${semGrade.filter((s) => !s.ativo).length} estão inativas — recebem também, para já valerem se forem reativadas)`);
  console.log(`blocos de grade_sala antes: ${antes}`);
  console.log(`blocos a criar: ${semGrade.length * DIAS_UTEIS.length}\n`);

  const porTenant = new Map();
  for (const s of semGrade) {
    const n = porTenant.get(s.tenantId) ?? 0;
    porTenant.set(s.tenantId, n + 1);
  }
  for (const [tenantId, n] of porTenant) console.log(`  tenant …${tenantId.slice(-6)}: ${n} salas`);

  console.log("\namostra:");
  for (const s of semGrade.slice(0, 5)) {
    console.log(`  ${s.nome} (${s.filial?.nome ?? "sem filial"}) → seg–sex ${HORA_INICIO}–${HORA_FIM}`);
  }

  if (!APLICAR) {
    console.log("\nnada foi gravado.");
    await prisma.$disconnect();
    return;
  }

  const dados = semGrade.flatMap((s) =>
    DIAS_UTEIS.map((diaSemana) => ({
      tenantId: s.tenantId,
      salaId: s.id,
      diaSemana,
      hora_inicio: HORA_INICIO,
      hora_fim: HORA_FIM,
      ativo: true,
    }))
  );

  const criados = await comRetentativa("createMany", () =>
    prisma.gradeSala.createMany({ data: dados })
  );

  const depois = await prisma.gradeSala.count();
  console.log(`\ncriados: ${criados.count}`);
  console.log(`blocos de grade_sala depois: ${depois} (antes ${antes})`);

  // Confere que nenhuma sala ficou com grade duplicada
  const comDuplicata = await prisma.gradeSala.groupBy({
    by: ["salaId", "diaSemana", "hora_inicio"],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });
  console.log(`salas com bloco duplicado: ${comDuplicata.length}`);

  await prisma.$disconnect();
}

main().catch(async (erro) => {
  console.error(erro);
  await prisma.$disconnect();
  process.exit(1);
});
