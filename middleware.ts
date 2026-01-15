import { authMiddleware } from '@/auth.edge'
import { NextResponse } from 'next/server'

export default authMiddleware((req) => {
    const { pathname } = req.nextUrl
    const isLoggedIn = !!req.auth

    // Public paths that don't require authentication
    const publicPaths = ['/login', '/api/auth', '/picture']
    const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

    // Redirect to login if not authenticated and trying to access protected route
    if (!isLoggedIn && !isPublicPath) {
        const loginUrl = new URL('/login', req.nextUrl.origin)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Redirect to dashboard if logged in and trying to access login page
    if (isLoggedIn && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
    }

    // Redirect root to dashboard
    if (pathname === '/') {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL('/dashboard', req.nextUrl.origin))
        } else {
            return NextResponse.redirect(new URL('/login', req.nextUrl.origin))
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
