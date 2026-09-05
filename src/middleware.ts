import { NextRequest, NextResponse } from 'next/server'

// Rotas que não precisam de autenticação
const publicRoutes = [
  '/',
  '/login',
  '/api/health',
]

// Rotas da API que não precisam de autenticação
const publicApiRoutes = [
  '/api/auth/login',
  '/api/auth/validate',
  '/api/auth/set-cookie',
  '/api/health',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rotas públicas
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Permitir rotas da API públicas
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Verificar token de autenticação
  const token = request.cookies.get('caleidoscopio_token')?.value ||
               request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    // Se for uma rota de API, retornar 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 401 }
      )
    }

    // Se for uma rota da interface, redirecionar para login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Para rotas protegidas, adicionar headers com informações do token
  const response = NextResponse.next()

  // Adicionar token aos headers da request (disponível nas API routes)
  response.headers.set('x-caleidoscopio-token', token)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - qualquer arquivo estático da pasta public/ (por extensão — antes só
     *   .png era excluído, então .jpg/.svg/etc. caíam no middleware e, sem
     *   estar autenticado, a requisição do <img> era redirecionada pro HTML
     *   de /login em vez de servir a imagem — dava "imagem quebrada")
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|avif|woff2?|ttf|css|js|map)$).*)',
  ],
}