// Validação da filial de um agendamento (Módulo 26, Fase 1).
//
// Até aqui `POST /api/agendamentos` conferia apenas que a sala pertencia ao
// TENANT. Não havia validação de filial nenhuma — havia até um comentário no
// código afirmando que "um profissional não pode, na criação, usar sala de
// outra filial", o que não era verdade: a restrição só existia nos dropdowns.
// Resultado medido: 339 de 945 agendamentos com a filial do profissional
// divergindo da filial da sala.
//
// A regra agora é explícita e vale no servidor:
//
//   1. A sala precisa ser do tenant e estar ativa.
//   2. Se a filial foi informada, a sala precisa pertencer a ela.
//   3. A filial precisa estar dentro do escopo de quem está marcando.
//   4. Sem filial informada, ela é DERIVADA da sala — nunca do perfil do
//      profissional, que é um vínculo administrativo e não um lugar.
//
// A grade NÃO entra aqui: ela é aviso, não bloqueio, e vive em
// `@/lib/avisos-agendamento`. Este arquivo cuida do que BLOQUEIA.

import { prisma } from "@/lib/prisma";
import { filialPermitida, type EscopoFilial } from "@/lib/filial-pessoa";

export interface ResultadoValidacao {
  ok: boolean;
  /** filial resolvida para gravar no agendamento */
  filialId: string | null;
  /** mensagem para o usuário quando `ok` é false */
  erro?: string;
  detalhe?: string;
  status?: number;
}

export async function validarFilialDaSala(params: {
  tenantId: string;
  salaId: string;
  /** filial escolhida no formulário; null = derivar da sala */
  filialId?: string | null;
  escopo: EscopoFilial;
}): Promise<ResultadoValidacao> {
  const { tenantId, salaId, escopo } = params;
  const filialPedida = params.filialId ?? null;

  const sala = await prisma.sala.findFirst({
    where: { id: salaId, tenantId, ativo: true },
    select: {
      id: true,
      nome: true,
      filialId: true,
      filial: { select: { id: true, nome: true } },
    },
  });

  if (!sala) {
    return {
      ok: false,
      filialId: null,
      erro: "Sala não encontrada ou não pertence a esta clínica",
      status: 404,
    };
  }

  // Filial informada tem que casar com a da sala. É esta checagem que impede a
  // divergência que o relatório expôs.
  if (filialPedida && sala.filialId && sala.filialId !== filialPedida) {
    const nomeFilialPedida = await prisma.filial.findFirst({
      where: { id: filialPedida, tenantId },
      select: { nome: true },
    });
    return {
      ok: false,
      filialId: null,
      erro: "A sala escolhida não pertence à filial selecionada",
      detalhe:
        `A sala "${sala.nome}" fica em ${sala.filial?.nome ?? "outra unidade"}, ` +
        `mas o agendamento foi marcado para ${nomeFilialPedida?.nome ?? "outra filial"}. ` +
        `Escolha uma sala da filial selecionada.`,
      status: 400,
    };
  }

  // Filial informada sem existir no tenant
  if (filialPedida) {
    const existe = await prisma.filial.findFirst({
      where: { id: filialPedida, tenantId },
      select: { id: true },
    });
    if (!existe) {
      return {
        ok: false,
        filialId: null,
        erro: "Filial não encontrada nesta clínica",
        status: 400,
      };
    }
  }

  // Sem filial informada, deriva da sala — a sala É a unidade física
  const resolvida = filialPedida ?? sala.filialId ?? null;

  if (!filialPermitida(escopo, resolvida)) {
    return {
      ok: false,
      filialId: null,
      erro: "Você não pode agendar nesta filial",
      detalhe:
        "Seu perfil está vinculado a outras unidades. Peça a um administrador " +
        "para incluir esta filial no seu cadastro em Usuários.",
      status: 403,
    };
  }

  return { ok: true, filialId: resolvida };
}
