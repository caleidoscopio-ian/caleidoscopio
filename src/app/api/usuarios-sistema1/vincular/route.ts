import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/server'
import { prisma } from '@/lib/prisma'

// POST - Vincular usuário existente do Sistema 1 a um profissional do Sistema 2
export async function POST(request: NextRequest) {
  try {
    console.log('🔗 API Vincular Usuário - Iniciando vinculação...')

    // Autenticar usuário
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error('❌ API Vincular - Falha na autenticação')
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    if (!user.tenant || !user.tenant.id) {
      return NextResponse.json(
        { success: false, error: 'Usuário não está associado a uma clínica' },
        { status: 403 }
      )
    }

    // Apenas ADMIN pode vincular
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem vincular usuários' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { usuarioId, profissionalId } = body

    // Validações
    if (!usuarioId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    if (!profissionalId) {
      return NextResponse.json(
        { error: 'ID do profissional é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o profissional existe e pertence ao tenant
    const profissional = await prisma.profissional.findFirst({
      where: {
        id: profissionalId,
        tenantId: user.tenant.id,
        ativo: true
      }
    })

    if (!profissional) {
      return NextResponse.json(
        { error: 'Profissional não encontrado ou não pertence a esta clínica' },
        { status: 404 }
      )
    }

    // Verificar se o profissional já está vinculado a outro usuário
    if (profissional.usuarioId && profissional.usuarioId !== usuarioId) {
      return NextResponse.json(
        { error: 'Este profissional já está vinculado a outro usuário' },
        { status: 400 }
      )
    }

    // Verificar se este usuário já está vinculado a outro profissional
    const profissionalExistente = await prisma.profissional.findFirst({
      where: {
        usuarioId: usuarioId,
        tenantId: user.tenant.id,
        ativo: true,
        id: { not: profissionalId }
      }
    })

    if (profissionalExistente) {
      return NextResponse.json(
        { error: 'Este usuário já está vinculado a outro profissional' },
        { status: 400 }
      )
    }

    console.log(`🔗 Vinculando usuário ${usuarioId} ao profissional ${profissionalId}`)

    // Atualizar profissional com o usuarioId
    const profissionalAtualizado = await prisma.profissional.update({
      where: { id: profissionalId },
      data: { usuarioId: usuarioId }
    })

    console.log(`✅ Vínculo estabelecido com sucesso`)

    return NextResponse.json({
      success: true,
      profissional: {
        id: profissionalAtualizado.id,
        nome: profissionalAtualizado.nome,
        especialidade: profissionalAtualizado.especialidade,
        usuarioId: profissionalAtualizado.usuarioId
      },
      message: 'Usuário vinculado ao profissional com sucesso'
    })

  } catch (error) {
    console.error('Erro ao vincular usuário:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao vincular usuário' },
      { status: 500 }
    )
  }
}
