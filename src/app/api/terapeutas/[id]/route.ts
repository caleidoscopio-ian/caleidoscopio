import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'

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

    if (!await hasPermission(user, 'view_professionals')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para visualizar profissionais' }, { status: 403 })
    }

    const { id } = await params

    const profissional = await prisma.profissional.findFirst({
      where: {
        id,
        tenantId: user.tenant.id, // 🔒 CRÍTICO: Filtrar por tenant
        ativo: true,
      },
      include: {
        _count: {
          select: {
            agendamentos: true,
            pacientes: true,
            prontuarios: true,
            regrasRepasse: { where: { ativo: true } },
          },
        },
      },
    })

    if (!profissional) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: profissional })
  } catch (error) {
    console.error('Erro ao buscar profissional:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(
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

    if (!await hasPermission(user, 'edit_professionals')) {
      return NextResponse.json({ success: false, error: 'Sem permissão para editar profissionais' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, cpf, phone, email, specialty, professionalRegistration, roomAccess } = body

    if (!name || !specialty) {
      return NextResponse.json({ success: false, error: 'Nome e especialidade são obrigatórios' }, { status: 400 })
    }

    const existing = await prisma.profissional.findFirst({
      where: { id, tenantId: user.tenant.id, ativo: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado' }, { status: 404 })
    }

    // Verificar CPF duplicado
    if (cpf && cpf !== existing.cpf) {
      const dup = await prisma.profissional.findFirst({
        where: { tenantId: user.tenant.id, cpf, ativo: true, id: { not: id } },
      })
      if (dup) {
        return NextResponse.json({ success: false, error: 'Já existe outro profissional com este CPF' }, { status: 409 })
      }
    }

    const updated = await prisma.profissional.update({
      where: { id },
      data: {
        nome: name,
        cpf: cpf || null,
        telefone: phone || null,
        email: email || null,
        especialidade: specialty,
        registro_profissional: professionalRegistration || null,
        salas_acesso: roomAccess || [],
      },
      include: {
        _count: {
          select: {
            agendamentos: true,
            pacientes: true,
            prontuarios: true,
            regrasRepasse: { where: { ativo: true } },
          },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Erro ao atualizar profissional:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
