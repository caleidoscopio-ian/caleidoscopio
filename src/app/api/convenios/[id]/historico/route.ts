import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'

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

    const historicos = await prisma.convenioHistorico.findMany({
      where: {
        convenioId,
        tenantId: user.tenant.id, // 🔒 CRÍTICO
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: historicos })
  } catch (error) {
    console.error('Erro ao buscar histórico:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
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

    const { titulo, descricao, tipo } = body

    if (!titulo || !descricao) {
      return NextResponse.json({ success: false, error: 'Título e descrição são obrigatórios' }, { status: 400 })
    }

    const tiposValidos = ['NEGOCIACAO', 'REAJUSTE', 'OBSERVACAO']
    const tipoFinal = tipo && tiposValidos.includes(tipo) ? tipo : 'OBSERVACAO'

    const historico = await prisma.convenioHistorico.create({
      data: {
        convenioId,
        tenantId: user.tenant.id,
        tipo: tipoFinal,
        titulo,
        descricao,
        usuario_nome: user.name || user.email,
        usuario_id: user.id,
      },
    })

    return NextResponse.json({ success: true, data: historico }, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar histórico:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
