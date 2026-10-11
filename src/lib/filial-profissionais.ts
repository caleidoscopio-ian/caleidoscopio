import { prisma } from "@/lib/prisma";

// Resolve os IDs de profissional vinculados a uma ou mais filiais — fonte única
// usada pelo dropdown de profissionais (/api/terapeutas) e, por ora, pelo filtro
// de agendamentos por filial.
//
// ATENÇÃO (Módulo 26): este resolvedor responde "quais profissionais pertencem
// a esta filial", e NÃO "quais agendamentos são desta filial". Usá-lo para a
// segunda pergunta é o que fez 339 de 945 agendamentos serem atribuídos à
// unidade errada: os 4 profissionais que atendem têm todos perfil em Bragança
// mas trabalham em três unidades, então o filtro da agenda dizia que 944 de 945
// eram de Bragança enquanto a sala dizia 605/286/54.
//
// A partir da Fase 3 do Módulo 26 o filtro de agendamento passa a usar
// `agendamento.filialId` (a filial escolhida na marcação, validada contra a
// sala). Este resolvedor continua existindo para o que ele realmente responde:
// montar a lista de profissionais de uma unidade.
//
// Duas fontes, na mesma ordem de prioridade usada em /api/terapeutas:
// 1. UsuarioRole.filialId — perfil vinculado a um usuário do sistema (/usuarios)
// 2. ProfissionalFilial — vínculo direto; é também onde mora o vínculo
//    multi-filial da pessoa (ver @/lib/filial-pessoa)
export async function resolverProfissionalIdsDaFilial(
  tenantId: string,
  filial: string | string[]
): Promise<string[]> {
  const filialIds = (Array.isArray(filial) ? filial : [filial]).filter(Boolean);
  if (filialIds.length === 0) return [];

  const rolesNaFilial = await prisma.usuarioRole.findMany({
    where: { tenantId, ativo: true, filialId: { in: filialIds } },
    select: { usuarioId: true },
  });
  const usuarioIdsDaFilial = rolesNaFilial.map((r) => r.usuarioId);

  const profissionais = await prisma.profissional.findMany({
    where: {
      tenantId,
      ativo: true,
      OR: [
        { usuarioId: { in: usuarioIdsDaFilial } },
        { filiais: { some: { filialId: { in: filialIds } } } },
      ],
    },
    select: { id: true },
  });

  return profissionais.map((p) => p.id);
}
