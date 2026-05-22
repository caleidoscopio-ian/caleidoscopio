import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: filialId } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'view_filiais')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const filial = await prisma.filial.findFirst({ where: { id: filialId, tenantId: user.tenant.id } })
    if (!filial) return NextResponse.json({ success: false, error: 'Filial não encontrada' }, { status: 404 })

    const profissionais = await prisma.profissionalFilial.findMany({
      where: { filialId },
      include: {
        profissional: { select: { id: true, nome: true, especialidade: true, email: true, ativo: true } },
      },
      orderBy: [{ principal: 'desc' }, { profissional: { nome: 'asc' } }],
    })

    return NextResponse.json({ success: true, data: profissionais })
  } catch (error) {
    console.error('Erro ao listar profissionais da filial:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: filialId } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_filiais')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const filial = await prisma.filial.findFirst({ where: { id: filialId, tenantId: user.tenant.id } })
    if (!filial) return NextResponse.json({ success: false, error: 'Filial não encontrada' }, { status: 404 })

    const { profissionalId, principal = false } = await request.json()
    if (!profissionalId) return NextResponse.json({ success: false, error: 'profissionalId é obrigatório' }, { status: 400 })

    // Verificar que o profissional pertence ao mesmo tenant
    const prof = await prisma.profissional.findFirst({ where: { id: profissionalId, tenantId: user.tenant.id } })
    if (!prof) return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 })

    const vinculo = await prisma.profissionalFilial.upsert({
      where: { profissionalId_filialId: { profissionalId, filialId } },
      update: { principal },
      create: { profissionalId, filialId, principal },
      include: {
        profissional: { select: { id: true, nome: true, especialidade: true, email: true } },
      },
    })

    return NextResponse.json({ success: true, data: vinculo }, { status: 201 })
  } catch (error) {
    console.error('Erro ao vincular profissional à filial:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: filialId } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_filiais')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const profissionalId = searchParams.get('profissionalId')
    if (!profissionalId) return NextResponse.json({ success: false, error: 'profissionalId é obrigatório' }, { status: 400 })

    const vinculo = await prisma.profissionalFilial.findUnique({
      where: { profissionalId_filialId: { profissionalId, filialId } },
    })
    if (!vinculo) return NextResponse.json({ success: false, error: 'Vínculo não encontrado' }, { status: 404 })

    await prisma.profissionalFilial.delete({ where: { profissionalId_filialId: { profissionalId, filialId } } })
    return NextResponse.json({ success: true, message: 'Vínculo removido com sucesso' })
  } catch (error) {
    console.error('Erro ao desvincular profissional da filial:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
