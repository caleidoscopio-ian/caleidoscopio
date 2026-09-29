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

    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'view_convenios')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: convenioId } = await params

    const convenio = await prisma.convenio.findFirst({
      where: { id: convenioId, tenantId: user.tenant.id },
    })
    if (!convenio) return NextResponse.json({ success: false, error: 'Convênio não encontrado' }, { status: 404 })

    const anexos = await prisma.convenioAnexo.findMany({
      where: { convenioId, tenantId: user.tenant.id }, // 🔒 CRÍTICO
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: anexos })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/convenios/[id]/anexos", acao: "GET" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_convenios')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: convenioId } = await params
    const body = await request.json()

    const convenio = await prisma.convenio.findFirst({
      where: { id: convenioId, tenantId: user.tenant.id },
    })
    if (!convenio) return NextResponse.json({ success: false, error: 'Convênio não encontrado' }, { status: 404 })

    const { tipo, titulo, descricao, arquivo_url, arquivo_nome, arquivo_tipo, arquivo_size, data_documento } = body

    if (!tipo || !titulo || !arquivo_url || !arquivo_nome || !arquivo_tipo || arquivo_size === undefined) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    const anexo = await prisma.convenioAnexo.create({
      data: {
        convenioId,
        tenantId: user.tenant.id,
        tipo,
        titulo,
        descricao: descricao || null,
        arquivo_url,
        arquivo_nome,
        arquivo_tipo,
        arquivo_size,
        data_documento: data_documento ? new Date(data_documento) : null,
      },
    })

    return NextResponse.json({ success: true, data: anexo }, { status: 201 })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/convenios/[id]/anexos", acao: "POST" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)

    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_convenios')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { id: convenioId } = await params
    const { searchParams } = new URL(request.url)
    const anexoId = searchParams.get('anexoId')

    if (!anexoId) return NextResponse.json({ success: false, error: 'ID do anexo é obrigatório' }, { status: 400 })

    const anexo = await prisma.convenioAnexo.findFirst({
      where: { id: anexoId, convenioId, tenantId: user.tenant.id },
    })
    if (!anexo) return NextResponse.json({ success: false, error: 'Anexo não encontrado' }, { status: 404 })

    await prisma.convenioAnexo.delete({ where: { id: anexoId } })

    return NextResponse.json({ success: true, message: 'Anexo excluído com sucesso' })
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/convenios/[id]/anexos", acao: "DELETE" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
