// Script de SIMULAÇÃO do Módulo 23 (Conciliação de Glosas TISS)
// Cria atendimentos ATENDIDO com senhas e gera um XML TISS que casa com elas.
//
// Uso: node scripts/simular-glosas.mjs
//
// Resultado:
//   1. Insere/atualiza 8 agendamentos (senha SIMUL0001..SIMUL0008) no tenant principal
//   2. Gera o arquivo XML em Downloads para você subir na aba Conciliação de /glosas

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const prisma = new PrismaClient();
const TENANT = "cmixhuqfz0003xay4ru2cpotp"; // tenant principal (clinicaa)

// Plano da simulação — cada linha vira 1 atendimento + 1 guia no XML
// resultado esperado: CONCILIADO (glosa 0) | CONCILIADO_GLOSA (glosa>0) | NAO_ENCONTRADO (sem atendimento)
const PLANO = [
  { senha: "SIMUL0001", informado: 240, glosa: 0,   proc: "SESSAO INDIVIDUAL DE FONOAUDIOLOGIA", cod: "50000616", motivo: null },
  { senha: "SIMUL0002", informado: 80,  glosa: 0,   proc: "PSICOTERAPIA TEA",                    cod: "60010126", motivo: null },
  { senha: "SIMUL0003", informado: 160, glosa: 0,   proc: "PSICOMOTRICIDADE METODO ABA",         cod: "60010193", motivo: null },
  { senha: "SIMUL0004", informado: 320, glosa: 80,  proc: "PSICOTERAPIA TEA",                    cod: "60010126", motivo: { cod: "1052", desc: "SENHA DE AUTORIZACAO AUSENTE OU INVALIDA" } },
  { senha: "SIMUL0005", informado: 800, glosa: 800, proc: "PSICOTERAPIA TEA",                    cod: "60010126", motivo: { cod: "1807", desc: "PROCEDIMENTOS MEDICOS DUPLICADOS" } },
  { senha: "SIMUL0006", informado: 400, glosa: 0,   proc: "CONSULTA EM PSICOLOGIA",              cod: "50000462", motivo: null },
  { senha: "SIMUL0007", informado: 160, glosa: 160, proc: "SESSAO INDIVIDUAL DE FONOAUDIOLOGIA", cod: "50000616", motivo: { cod: "1707", desc: "PRAZO DE ENVIO DA GUIA EXPIRADO" } },
  { senha: "SIMUL0008", informado: 240, glosa: 0,   proc: "PSICOTERAPIA TEA",                    cod: "60010126", motivo: null },
];

// Guia extra que NÃO terá atendimento correspondente (demonstra "Não encontrado")
const SEM_ATENDIMENTO = { senha: "SIMUL9999", informado: 500, glosa: 0, proc: "CONSULTA EM PSICOLOGIA", cod: "50000462", motivo: null };

const fmt = (n) => n.toFixed(2);
const pad = (n) => String(n).padStart(9, "0");

function guiaXml(item, idx, dataReal) {
  const liberado = item.informado - item.glosa;
  const glosaBloco = item.motivo
    ? `
        <ans:relacaoGlosa>
          <ans:valorGlosa>${fmt(item.glosa)}</ans:valorGlosa>
          <ans:tipoGlosa>${item.motivo.cod}</ans:tipoGlosa>
          <ans:ansCodigo>${item.motivo.cod}</ans:ansCodigo>
          <ans:ansDescricao>${item.motivo.desc}</ans:ansDescricao>
        </ans:relacaoGlosa>`
    : "";
  return `
      <ans:relacaoGuias>
        <ans:numeroGuiaPrestador>${pad(1000 + idx)}</ans:numeroGuiaPrestador>
        <ans:numeroGuiaOperadora>${pad(9000 + idx)}</ans:numeroGuiaOperadora>
        <ans:senha>${item.senha}</ans:senha>
        <ans:numeroCarteira>0SIM${pad(idx)}</ans:numeroCarteira>
        <ans:dataInicioFat>${dataReal}</ans:dataInicioFat>
        <ans:situacaoGuia>1</ans:situacaoGuia>
        <ans:detalhesGuia>
          <ans:sequencialItem>1</ans:sequencialItem>
          <ans:dataRealizacao>${dataReal}</ans:dataRealizacao>
          <ans:procedimento>
            <ans:codigoProcedimento>${item.cod}</ans:codigoProcedimento>
            <ans:descricaoProcedimento>${item.proc}</ans:descricaoProcedimento>
          </ans:procedimento>
          <ans:valorInformado>${fmt(item.informado)}</ans:valorInformado>
          <ans:valorProcessado>${fmt(item.glosa)}</ans:valorProcessado>
          <ans:valorLiberado>${fmt(liberado)}</ans:valorLiberado>${glosaBloco}
        </ans:detalhesGuia>
        <ans:valorInformadoGuia>${fmt(item.informado)}</ans:valorInformadoGuia>
        <ans:valorProcessadoGuia>${fmt(item.glosa)}</ans:valorProcessadoGuia>
        <ans:valorLiberadoGuia>${fmt(liberado)}</ans:valorLiberadoGuia>
        <ans:valorGlosaGuia>${fmt(item.glosa)}</ans:valorGlosaGuia>
      </ans:relacaoGuias>`;
}

async function main() {
  // 1. Buscar dados base do tenant
  const [pacientes, profissionais, salas, procedimento] = await Promise.all([
    prisma.paciente.findMany({ where: { tenantId: TENANT }, select: { id: true, nome: true } }),
    prisma.profissional.findMany({ where: { tenantId: TENANT }, select: { id: true } }),
    prisma.sala.findMany({ where: { tenantId: TENANT }, select: { id: true } }),
    prisma.procedimento.findFirst({ where: { tenantId: TENANT }, select: { id: true } }),
  ]);

  if (!pacientes.length || !profissionais.length || !salas.length) {
    throw new Error("Tenant sem pacientes/profissionais/salas suficientes.");
  }

  // 2. Limpar simulação anterior (atendimentos + glosas + demonstrativos)
  const senhasSimul = PLANO.map((p) => p.senha);
  const agAntigos = await prisma.agendamento.findMany({
    where: { senha_autorizacao: { in: senhasSimul }, paciente: { tenantId: TENANT } },
    select: { id: true },
  });
  const idsAntigos = agAntigos.map((a) => a.id);
  if (idsAntigos.length) {
    await prisma.glosa.deleteMany({ where: { agendamentoId: { in: idsAntigos } } });
    await prisma.demonstrativoGuia.deleteMany({ where: { agendamentoId: { in: idsAntigos } } });
    await prisma.agendamento.deleteMany({ where: { id: { in: idsAntigos } } });
  }
  await prisma.demonstrativoImportacao.deleteMany({
    where: { tenantId: TENANT, numero_demonstrativo: "SIMUL-2026-001" },
  });

  // 3. Criar os atendimentos (ATENDIDO) com senha
  const base = new Date();
  base.setDate(base.getDate() - 7); // ~1 semana atrás
  const dataReal = base.toISOString().slice(0, 10);

  let i = 0;
  for (const item of PLANO) {
    const pac = pacientes[i % pacientes.length];
    const prof = profissionais[i % profissionais.length];
    const sala = salas[i % salas.length];
    const inicio = new Date(base);
    inicio.setHours(8 + i, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setMinutes(50);

    await prisma.agendamento.create({
      data: {
        pacienteId: pac.id,
        profissionalId: prof.id,
        salaId: sala.id,
        procedimentoId: procedimento?.id ?? null,
        data_hora: inicio,
        horario_fim: fim,
        status: "ATENDIDO",
        hora_inicio_real: inicio,
        hora_fim_real: fim,
        senha_autorizacao: item.senha,
        numero_guia: pad(1000 + i),
        observacoes: "Atendimento de simulação (Módulo 23)",
      },
    });
    console.log(`  ✓ Atendimento ${item.senha} — ${pac.nome} (informado R$${item.informado}, glosa R$${item.glosa})`);
    i++;
  }

  // 4. Gerar o XML TISS (formato Análise de Conta, igual Hapvida)
  const guias = PLANO.map((item, idx) => guiaXml(item, idx, dataReal)).join("");
  const guiaExtra = guiaXml(SEM_ATENDIMENTO, 99, dataReal);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>DEMONSTRATIVO_ANALISE_CONTA</ans:tipoTransacao>
      <ans:dataRegistroTransacao>${dataReal}</ans:dataRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem><ans:registroANS>348520</ans:registroANS></ans:origem>
  </ans:cabecalho>
  <ans:operadoraParaPrestador>
    <ans:demonstrativosRetorno>
      <ans:demonstrativoAnaliseConta>
        <ans:cabecalhoDemonstrativo>
          <ans:registroANS>348520</ans:registroANS>
          <ans:numeroDemonstrativo>SIMUL-2026-001</ans:numeroDemonstrativo>
          <ans:nomeOperadora>HAPVIDA MINAS GERAIS (SIMULACAO)</ans:nomeOperadora>
          <ans:dataEmissao>${dataReal}</ans:dataEmissao>
        </ans:cabecalhoDemonstrativo>
        <ans:dadosConta>
          <ans:dadosProtocolo>
            <ans:numeroProtocolo>SIMUL-PROTO-001</ans:numeroProtocolo>${guias}${guiaExtra}
          </ans:dadosProtocolo>
        </ans:dadosConta>
      </ans:demonstrativoAnaliseConta>
    </ans:demonstrativosRetorno>
  </ans:operadoraParaPrestador>
</ans:mensagemTISS>
`;

  const destino = join(homedir(), "Downloads", "SIMULACAO-glosa-hapvida.xml");
  writeFileSync(destino, xml, "utf8");

  // 5. Resumo
  const totalInformado = [...PLANO, SEM_ATENDIMENTO].reduce((s, p) => s + p.informado, 0);
  const totalGlosa = PLANO.reduce((s, p) => s + p.glosa, 0);
  const comGlosa = PLANO.filter((p) => p.glosa > 0).length;

  console.log("\n========================================");
  console.log("SIMULAÇÃO PRONTA");
  console.log("========================================");
  console.log(`Atendimentos criados:  ${PLANO.length} (senhas SIMUL0001..SIMUL0008)`);
  console.log(`Guias no XML:          ${PLANO.length + 1} (8 conciliáveis + 1 sem atendimento)`);
  console.log(`  - Conciliadas s/ glosa: ${PLANO.length - comGlosa}`);
  console.log(`  - Conciliadas c/ glosa: ${comGlosa} (total glosado R$${totalGlosa})`);
  console.log(`  - Não encontrada:       1 (senha ${SEM_ATENDIMENTO.senha})`);
  console.log(`Valor informado total: R$${totalInformado}`);
  console.log(`\nArquivo XML gerado em:\n  ${destino}`);
  console.log("\nPróximo passo: abra /glosas → aba Conciliação → suba esse XML.");
}

main()
  .catch((e) => { console.error("ERRO:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
