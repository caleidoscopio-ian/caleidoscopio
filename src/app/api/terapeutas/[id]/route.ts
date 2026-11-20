import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser, hasPermission } from '@/lib/auth/server'
import { registrarErroApi } from "@/lib/erro-prisma";
import { propagarIdentidadeAoManager } from "@/lib/sincronizar-usuario-manager";
import { normalizarEmailOpcional } from "@/lib/email";

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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/terapeutas/[id]", acao: "GET" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
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

    // Profissional com login vinculado: e-mail e nome vivem no Manager (fonte da
    // verdade). Grava lá PRIMEIRO; se o Manager recusar, nada é salvo aqui.
    // E-mail sempre em minúsculas (mesmo formato do login no Manager)
    let emailFinal: string | null = normalizarEmailOpcional(email)
    if (existing.usuarioId) {
      const emailMudou = emailFinal !== normalizarEmailOpcional(existing.email)
      const nomeMudou = name !== existing.nome

      if (emailMudou) {
        if (!emailFinal) {
          return NextResponse.json({ success: false, error: 'O e-mail de login não pode ficar em branco' }, { status: 400 })
        }
        // Trocar o e-mail troca a credencial de acesso — exige gestão de usuários
        if (!await hasPermission(user, 'edit_usuarios')) {
          return NextResponse.json({ success: false, error: 'Sem permissão para alterar o e-mail de login deste usuário' }, { status: 403 })
        }
      }

      const propagacao = await propagarIdentidadeAoManager(
        existing.usuarioId,
        { ...(emailMudou && emailFinal ? { email: emailFinal } : {}), ...(nomeMudou ? { name } : {}) },
        user.token
      )
      if (!propagacao.ok) {
        return NextResponse.json({ success: false, error: propagacao.error }, { status: propagacao.status })
      }
      if (emailMudou && propagacao.usuario) emailFinal = propagacao.usuario.email
    }

    const updated = await prisma.profissional.update({
      where: { id },
      data: {
        nome: name,
        cpf: cpf || null,
        telefone: phone || null,
        email: emailFinal,
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
    const { ref, classificacao } = registrarErroApi({ rota: "/api/terapeutas/[id]", acao: "PUT" }, error);return NextResponse.json(
      { success: false, error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
