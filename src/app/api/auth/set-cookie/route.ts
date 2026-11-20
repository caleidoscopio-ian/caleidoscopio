import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultRole } from '@/lib/auth/bootstrap-roles'
import { registrarErroApi } from "@/lib/erro-prisma";
import { managerClient } from "@/lib/manager-client";
import { sincronizarEmailsDoTenant } from "@/lib/sincronizar-usuario-manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body as { token?: unknown }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 400 }
      )
    }

    // Identidade SEMPRE do Manager, a partir do token — nunca do corpo da
    // requisição. Antes, userId/tenantId/ssoRole vinham do navegador sem
    // validação, e qualquer um podia criar UsuarioRole + profissional para um
    // id arbitrário, com o perfil que quisesse, só chamando esta rota.
    const usuarioToken = await managerClient.getSSOTokenUser(token)

    if (!usuarioToken) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    const tenantId = usuarioToken.tenant?.id

    // Bootstrap RBAC: garantir role + profissional no primeiro login
    if (tenantId) {
      try {
        await ensureDefaultRole(usuarioToken.userId, tenantId, usuarioToken.role, {
          name: usuarioToken.name,
          email: usuarioToken.email,
        })
      } catch (err) {
        registrarErroApi({ rota: "/api/auth/set-cookie", acao: "POST", tenantId, usuarioId: usuarioToken.userId }, err);
      }

      // Realinha os e-mails locais com o Manager (fonte da verdade) — cobre
      // alterações feitas direto no painel do Manager. Nunca bloqueia o login.
      await sincronizarEmailsDoTenant(tenantId, token)
    }

    const response = NextResponse.json({ success: true })

    // Definir cookie HttpOnly seguro
    response.cookies.set({
      name: 'caleidoscopio_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    })

    return response
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/auth/set-cookie", acao: "POST" }, error);return NextResponse.json(
      { error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}
