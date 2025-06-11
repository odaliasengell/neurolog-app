// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Verificar sesión de usuario
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Rutas protegidas que requieren autenticación
  const protectedPaths = ['/dashboard', '/children', '/logs', '/settings']
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  // Rutas de autenticación que no deben ser accesibles si ya está autenticado
  const authPaths = ['/auth/login', '/auth/register']
  const isAuthPath = authPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  // Redireccionar a login si intenta acceder a ruta protegida sin sesión
  if (isProtectedPath && !session) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('returnTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redireccionar al dashboard si intenta acceder a rutas de auth ya autenticado
  if (isAuthPath && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Verificar perfil de usuario para rutas que requieren roles específicos
  if (session && isProtectedPath) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', session.user.id)
        .single()

      // Verificar si el usuario está activo
      if (!profile?.is_active) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login?error=account_deactivated', req.url))
      }

      // Rutas específicas por rol (ejemplo)
      if (req.nextUrl.pathname.startsWith('/admin') && profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard?error=insufficient_permissions', req.url))
      }

    } catch (error) {
      console.error('Error verifying user profile:', error)
      return NextResponse.redirect(new URL('/auth/login?error=profile_error', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}