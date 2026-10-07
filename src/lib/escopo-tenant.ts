// Verificação de posse para registros que não carregam `tenantId` próprio.
//
// Alguns models da evolução ficam a 3 saltos do tenant:
//
//   InstrucaoFase/InstrucaoPontuacao
//     → AtividadeCloneInstrucao
//       → PacienteAtividadeClone
//         → PacienteCurriculum
//           → paciente.tenantId
//
// Quando o id vem direto da URL ou do corpo da requisição, consultar por ele
// sem conferir essa cadeia permite ler — e escrever — registro de outra
// clínica (IDOR). Estas funções centralizam a conferência.

import { prisma } from "@/lib/prisma";

/** Filtro Prisma: o clone de atividade pertence ao tenant */
export const filtroCloneDoTenant = (tenantId: string) => ({
  pacienteCurriculum: { paciente: { tenantId } },
});

/** Filtro Prisma: a instrução pertence ao tenant */
export const filtroInstrucaoDoTenant = (tenantId: string) => ({
  atividadeClone: filtroCloneDoTenant(tenantId),
});

/** true se o clone de atividade existe e é do tenant informado */
export async function cloneEhDoTenant(
  atividadeCloneId: string,
  tenantId: string
): Promise<boolean> {
  const achado = await prisma.pacienteAtividadeClone.findFirst({
    where: { id: atividadeCloneId, ...filtroCloneDoTenant(tenantId) },
    select: { id: true },
  });
  return achado !== null;
}

/** true se a instrução existe e é do tenant informado */
export async function instrucaoEhDoTenant(
  instrucaoId: string,
  tenantId: string
): Promise<boolean> {
  const achado = await prisma.atividadeCloneInstrucao.findFirst({
    where: { id: instrucaoId, ...filtroInstrucaoDoTenant(tenantId) },
    select: { id: true },
  });
  return achado !== null;
}
