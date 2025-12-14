import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/server'
import { managerClient } from '@/lib/manager-client'
import { prisma } from '@/lib/prisma'

// GET - Buscar usuários do Sistema 1 com informações de vínculo do Sistema 2
export async function GET(request: NextRequest) {
  try {
    console.log('👥 API Usuários Sistema 1 - Buscando usuários...')

    // Autenticar usuário
    const user = await getAuthenticatedUser(request)

    if (!user) {
      console.error('❌ API Usuários Sistema 1 - Falha na autenticação')
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

    // Apenas ADMIN pode acessar
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem gerenciar usuários' },
        { status: 403 }
      )
    }

    console.log(`🔍 Listando profissionais do Sistema 2 para tenant: ${user.tenant.id}`)

    // Buscar todos os profissionais do Sistema 2
    const profissionais = await prisma.profissional.findMany({
      where: {
        tenantId: user.tenant.id,
        ativo: true
      },
      select: {
        id: true,
        usuarioId: true,
        nome: true,
        especialidade: true,
        email: true,
        cpf: true,
        telefone: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transformar profissionais em formato "usuário" para a interface
    const usuarios = profissionais.map(prof => ({
      id: prof.usuarioId || `pending-${prof.id}`,
      email: prof.email || '',
      name: prof.nome,
      role: prof.usuarioId ? 'USER' : 'PENDING',
      isActive: true,
      vinculado: !!prof.usuarioId,
      profissional: {
        id: prof.id,
        nome: prof.nome,
        especialidade: prof.especialidade
      }
    }))

    const vinculados = usuarios.filter(u => u.vinculado).length

    console.log(`✅ Encontrados ${usuarios.length} profissionais (${vinculados} com usuário vinculado)`)

    return NextResponse.json({
      success: true,
      usuarios,
      total: usuarios.length,
      vinculados
    })
  } catch (error) {
    console.error('Erro ao buscar usuários do Sistema 1:', error)

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}
