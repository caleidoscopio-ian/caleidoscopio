import { prisma } from "@/lib/prisma";

// Resolve os IDs de profissional vinculados a uma filial — fonte de verdade
// única usada tanto pelo dropdown de profissionais (/api/terapeutas) quanto
// pelo filtro de agendamentos por filial (a filial "dona" de um agendamento é
// a do profissional, não a da sala onde ele acontece).
//
// Duas fontes, na mesma ordem de prioridade usada em /api/terapeutas:
// 1. UsuarioRole.filialId — perfil vinculado a um usuário do sistema (gerenciado em /usuarios)
// 2. ProfissionalFilial — vínculo direto, usado por profissionais sem conta de login
export async function resolverProfissionalIdsDaFilial(
  tenantId: string,
  filialId: string
): Promise<string[]> {
  const rolesNaFilial = await prisma.usuarioRole.findMany({
    where: { tenantId, ativo: true, filialId },
    select: { usuarioId: true },
  });
  const usuarioIdsDaFilial = rolesNaFilial.map((r) => r.usuarioId);

  const profissionais = await prisma.profissional.findMany({
    where: {
      tenantId,
      ativo: true,
      OR: [
        { usuarioId: { in: usuarioIdsDaFilial } },
        { filiais: { some: { filialId } } },
      ],
    },
    select: { id: true },
  });

  return profissionais.map((p) => p.id);
}
