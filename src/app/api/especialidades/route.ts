import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, hasPermission } from "@/lib/auth/server";

// Especialidades clínicas cadastradas pela própria clínica — complementam o enum
// EspecialidadeClinica, que é fixo no banco e não aceita valor novo em runtime.
// Escopo por tenant: a lista de uma clínica nunca aparece para outra.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: "Sem tenant" }, { status: 403 });
    if (!await hasPermission(user, "view_professionals"))
      return NextResponse.json({ success: false, error: "Sem permissão" }, { status: 403 });

    const especialidades = await prisma.especialidadeCustomizada.findMany({
      where: { tenantId: user.tenant.id, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ success: true, data: especialidades });
  } catch (error) {
    console.error("Erro ao buscar especialidades:", error);
    return NextResponse.json({ success: false, error: "Erro interno" }, { status: 500 });
  }
}
