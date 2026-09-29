import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultRole } from '@/lib/auth/bootstrap-roles'
import { registrarErroApi } from "@/lib/erro-prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, userId, tenantId, ssoRole, userName, userEmail } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 400 }
      )
    }

    // Bootstrap RBAC: garantir role + profissional no primeiro login
    if (userId && tenantId && ssoRole) {
      try {
        await ensureDefaultRole(userId, tenantId, ssoRole, { name: userName, email: userEmail })
      } catch (err) {
        registrarErroApi({ rota: "/api/auth/set-cookie", acao: "POST" }, err);}
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

    console.log('✅ Cookie caleidoscopio_token definido')

    return response
  } catch (error) {
    const { ref, classificacao } = registrarErroApi({ rota: "/api/auth/set-cookie", acao: "POST" }, error);return NextResponse.json(
      { error: classificacao.mensagem ?? 'Erro interno do servidor', details: classificacao.detalhe, ref },
      { status: classificacao.mensagem && classificacao.categoria !== "conexao" ? 400 : 500 }
    );
  }
}