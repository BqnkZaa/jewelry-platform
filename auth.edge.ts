import NextAuth from 'next-auth'
import type { NextAuthConfig } from 'next-auth'

// Edge-compatible config (no Prisma, no bcrypt)
// This is used by middleware only
export const authEdgeConfig: NextAuthConfig = {
    providers: [],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const pathname = nextUrl.pathname

            // Public paths that don't require authentication
            const publicPaths = ['/login', '/api/auth', '/picture']
            const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

            if (!isLoggedIn && !isPublicPath) {
                return false
            }

            return true
        },
        jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.department = user.department
            }
            return token
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
                session.user.department = token.department as string | null
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
}

export const { auth: authMiddleware } = NextAuth(authEdgeConfig)
