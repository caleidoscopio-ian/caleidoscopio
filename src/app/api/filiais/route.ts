import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { isValidCNPJ } from '@/lib/masks'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'view_filiais')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const apenasAtivas = searchParams.get('ativas') === 'true'

    const filiais = await prisma.filial.findMany({
      where: {
        tenantId: user.tenant.id,
        ...(apenasAtivas ? { ativo: true } : {}),
        ...(search ? { nome: { contains: search, mode: 'insensitive' } } : {}),
      },
      include: {
        _count: {
          select: {
            salas: true,
            pacientes: true,
            profissionais: true,
            convenios: true,
            procedimentos: true,
          },
        },
      },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json({ success: true, data: filiais, total: filiais.length })
  } catch (error) {
    console.error('Erro ao buscar filiais:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'create_filiais')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const body = await request.json()
    const {
      nome, razao_social, cnpj, cnes, tipo_estabelecimento,
      cidade, endereco, cep, logradouro, numero, complemento, bairro, estado,
      telefone, email, cor,
    } = body

    if (!nome?.trim()) {
      return NextResponse.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 })
    }

    if (cnpj && !isValidCNPJ(cnpj)) {
      return NextResponse.json({ success: false, error: 'CNPJ inválido' }, { status: 400 })
    }

    // Verificar nome único por tenant
    const existente = await prisma.filial.findFirst({
      where: { tenantId: user.tenant.id, nome: { equals: nome.trim(), mode: 'insensitive' } },
    })
    if (existente) {
      return NextResponse.json({ success: false, error: 'Já existe uma filial com este nome' }, { status: 409 })
    }

    // Verificar CNPJ único por tenant (quando informado)
    if (cnpj) {
      const cnpjNumeros = cnpj.replace(/\D/g, '')
      const cnpjExistente = await prisma.filial.findFirst({
        where: { tenantId: user.tenant.id, cnpj: cnpjNumeros },
      })
      if (cnpjExistente) {
        return NextResponse.json({ success: false, error: 'Já existe uma filial com este CNPJ' }, { status: 409 })
      }
    }

    const filial = await prisma.filial.create({
      data: {
        tenantId: user.tenant.id,
        nome: nome.trim(),
        razao_social: razao_social?.trim() || null,
        cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
        cnes: cnes?.trim() || null,
        tipo_estabelecimento: tipo_estabelecimento?.trim() || null,
        cidade: cidade?.trim() || null,
        endereco: endereco?.trim() || null,
        cep: cep ? cep.replace(/\D/g, '') : null,
        logradouro: logradouro?.trim() || null,
        numero: numero?.trim() || null,
        complemento: complemento?.trim() || null,
        bairro: bairro?.trim() || null,
        estado: estado || null,
        telefone: telefone?.trim() || null,
        email: email?.trim() || null,
        cor: cor || null,
        ativo: true,
      },
      include: {
        _count: { select: { salas: true, pacientes: true, profissionais: true, convenios: true, procedimentos: true } },
      },
    })

    return NextResponse.json({ success: true, data: filial }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar filial:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'edit_filiais')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const body = await request.json()
    const {
      id, nome, razao_social, cnpj, cnes, tipo_estabelecimento,
      cidade, endereco, cep, logradouro, numero, complemento, bairro, estado,
      telefone, email, cor, ativo,
    } = body

    if (!id) return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 })
    if (!nome?.trim()) return NextResponse.json({ success: false, error: 'Nome é obrigatório' }, { status: 400 })

    if (cnpj && !isValidCNPJ(cnpj)) {
      return NextResponse.json({ success: false, error: 'CNPJ inválido' }, { status: 400 })
    }

    const existente = await prisma.filial.findFirst({ where: { id, tenantId: user.tenant.id } })
    if (!existente) return NextResponse.json({ success: false, error: 'Filial não encontrada' }, { status: 404 })

    // Verificar nome único (excluindo a própria filial)
    const conflito = await prisma.filial.findFirst({
      where: { tenantId: user.tenant.id, nome: { equals: nome.trim(), mode: 'insensitive' }, NOT: { id } },
    })
    if (conflito) return NextResponse.json({ success: false, error: 'Já existe uma filial com este nome' }, { status: 409 })

    // Verificar CNPJ único (excluindo a própria filial)
    if (cnpj) {
      const cnpjNumeros = cnpj.replace(/\D/g, '')
      const cnpjConflito = await prisma.filial.findFirst({
        where: { tenantId: user.tenant.id, cnpj: cnpjNumeros, NOT: { id } },
      })
      if (cnpjConflito) return NextResponse.json({ success: false, error: 'Já existe uma filial com este CNPJ' }, { status: 409 })
    }

    const filial = await prisma.filial.update({
      where: { id },
      data: {
        nome: nome.trim(),
        razao_social: razao_social?.trim() || null,
        cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
        cnes: cnes?.trim() || null,
        tipo_estabelecimento: tipo_estabelecimento?.trim() || null,
        cidade: cidade?.trim() || null,
        endereco: endereco?.trim() || null,
        cep: cep ? cep.replace(/\D/g, '') : null,
        logradouro: logradouro?.trim() || null,
        numero: numero?.trim() || null,
        complemento: complemento?.trim() || null,
        bairro: bairro?.trim() || null,
        estado: estado || null,
        telefone: telefone?.trim() || null,
        email: email?.trim() || null,
        cor: cor || null,
        ativo: ativo !== undefined ? ativo : existente.ativo,
      },
      include: {
        _count: { select: { salas: true, pacientes: true, profissionais: true, convenios: true, procedimentos: true } },
      },
    })

    return NextResponse.json({ success: true, data: filial })
  } catch (error) {
    console.error('Erro ao atualizar filial:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 })
    if (!user.tenant?.id) return NextResponse.json({ success: false, error: 'Usuário sem clínica associada' }, { status: 403 })
    if (!await hasPermission(user, 'delete_filiais')) return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ success: false, error: 'ID é obrigatório' }, { status: 400 })

    const filial = await prisma.filial.findFirst({
      where: { id, tenantId: user.tenant.id },
      include: { _count: { select: { salas: true, pacientes: true } } },
    })
    if (!filial) return NextResponse.json({ success: false, error: 'Filial não encontrada' }, { status: 404 })

    // Soft delete — desativar em vez de apagar se tiver dados vinculados
    if (filial._count.salas > 0 || filial._count.pacientes > 0) {
      await prisma.filial.update({ where: { id }, data: { ativo: false } })
      return NextResponse.json({ success: true, message: 'Filial desativada (possui dados vinculados)' })
    }

    await prisma.filial.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Filial removida com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir filial:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
