// Em quais filiais a PESSOA pode operar (Módulo 26).
//
// Três eixos independentes governam filial no sistema, e confundi-los foi a
// causa de 36% dos agendamentos ficarem atribuídos à unidade errada:
//
//   ProfissionalFilial     → onde a pessoa OPERA        (este arquivo)
//   GradeAtendimento       → onde e quando ATENDE       (só clínico)
//   agendamento.filialId   → onde o atendimento ACONTECEU
//
// `UsuarioRole.filialId` guarda uma única filial e era usado como se fosse os
// três. Ele continua existindo como compatibilidade: quem ainda não tem vínculo
// em `ProfissionalFilial` cai nele.
//
// A distinção que importa aqui: **lista vazia não significa "nenhuma filial"**.
// Significa "sem restrição" — é o comportamento que o sistema já tinha quando
// `UsuarioRole.filialId` era null. Por isso o retorno é um objeto com
// `restrito`, e não um array solto: um `includes()` sobre array vazio daria
// "não pode nada" e travaria a clínica inteira.

import { prisma } from "@/lib/prisma";

export type OrigemEscopo = "profissional-filial" | "usuario-role" | "sem-restricao";

export interface EscopoFilial {
  /** false = pode operar em qualquer filial do tenant */
  restrito: boolean;
  /** filiais permitidas; só tem significado quando `restrito` é true */
  filialIds: string[];
  origem: OrigemEscopo;
}

export const SEM_RESTRICAO: EscopoFilial = {
  restrito: false,
  filialIds: [],
  origem: "sem-restricao",
};

/**
 * Filiais em que o usuário pode operar.
 *
 * Ordem de resolução:
 *   1. `ProfissionalFilial` do profissional ligado a este usuário (N filiais)
 *   2. `UsuarioRole.filialId` (1 filial) — compatibilidade
 *   3. sem restrição
 *
 * `isAdmin` curto-circuita: admin opera em qualquer unidade por definição.
 * Passado explicitamente para este módulo não depender da camada de auth.
 */
export async function escopoFilialDoUsuario(
  tenantId: string,
  usuarioId: string,
  isAdmin: boolean
): Promise<EscopoFilial> {
  if (isAdmin) return SEM_RESTRICAO;

  const profissional = await prisma.profissional.findFirst({
    where: { tenantId, usuarioId },
    select: { filiais: { select: { filialId: true } } },
  });

  const vinculos = profissional?.filiais.map((f) => f.filialId) ?? [];
  if (vinculos.length > 0) {
    return { restrito: true, filialIds: vinculos, origem: "profissional-filial" };
  }

  const role = await prisma.usuarioRole.findUnique({
    where: { usuarioId_tenantId: { usuarioId, tenantId } },
    select: { filialId: true, ativo: true },
  });

  if (role?.ativo && role.filialId) {
    return { restrito: true, filialIds: [role.filialId], origem: "usuario-role" };
  }

  return SEM_RESTRICAO;
}

/** A filial está dentro do escopo? Filial nula = "qualquer", então passa. */
export function filialPermitida(escopo: EscopoFilial, filialId: string | null): boolean {
  if (!escopo.restrito) return true;
  if (filialId === null) return true;
  return escopo.filialIds.includes(filialId);
}

/**
 * Interseção entre o que o usuário pode e o que foi pedido.
 * Devolve `null` quando não há restrição nenhuma a aplicar — nesse caso o
 * chamador não deve filtrar (filtrar por lista vazia esconderia tudo).
 */
export function intersecaoFilial(
  escopo: EscopoFilial,
  pedidas: string[] | null
): string[] | null {
  const pedido = pedidas && pedidas.length > 0 ? pedidas : null;

  if (!escopo.restrito) return pedido;
  if (!pedido) return escopo.filialIds;

  const permitidas = pedido.filter((f) => escopo.filialIds.includes(f));
  // Pediu só filial fora do escopo: devolve lista vazia de propósito, para o
  // chamador filtrar por "nenhuma" em vez de ignorar o escopo e mostrar tudo.
  return permitidas;
}

/** Nomes das filiais do escopo, para mensagens ao usuário */
export async function nomesDasFiliais(
  tenantId: string,
  filialIds: string[]
): Promise<Map<string, string>> {
  if (filialIds.length === 0) return new Map();
  const filiais = await prisma.filial.findMany({
    where: { tenantId, id: { in: filialIds } },
    select: { id: true, nome: true },
  });
  return new Map(filiais.map((f) => [f.id, f.nome]));
}
