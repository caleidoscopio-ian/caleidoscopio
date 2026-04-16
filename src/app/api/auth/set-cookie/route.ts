import { NextRequest, NextResponse } from 'next/server'
import { ensureDefaultRole } from '@/lib/auth/bootstrap-roles'

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
        console.error('[RBAC Bootstrap] Erro no set-cookie (login continua):', err)
      }
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
    console.error('❌ Erro ao definir cookie:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}