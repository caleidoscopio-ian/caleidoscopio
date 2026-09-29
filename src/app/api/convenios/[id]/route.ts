import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { registrarErroApi } from "@/lib/erro-prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    }

    if (!user.tenant?.id) {
      return NextResponse.json({ success: false, error: 'Usuário não está associado a uma clínica' }, { status: 403 })
    }

    if (!await hasPermission(user, 'view_convenios')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para visualizar convênios' }, { status: 403 })
    }

    const { id } = await params

    const convenio = await prisma.convenio.findFirst({
      where: {
        id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
      },
      include: {
        _count: {
          select: {
            tabelas: { where: { ativo: true } },
            anexos: true,
            historicos: true,
          },
        },
        tabelas: {
          where: { ativo: true },
          orderBy: { nome_procedimento: 'asc' },
        },
        anexos: {
          orderBy: { createdAt: 'desc' },
        },
        historicos: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!convenio) {
      return NextResponse.json({ success: false, error: 'Convênio não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: convenio })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/convenios/[id]", acao: "GET" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
