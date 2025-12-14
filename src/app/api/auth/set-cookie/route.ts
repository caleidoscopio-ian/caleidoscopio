import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token é obrigatório' },
        { status: 400 }
      )
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