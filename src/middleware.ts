import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: '/auth',
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/meeting/:path*',
    '/thread/:path*',
    '/users/:path*',
    '/api/meetings/:path*',
    '/api/threads/:path*',
    '/api/users/:path*',
    '/api/invitations/:path*',
    '/api/search/:path*',
    '/api/stats/:path*',
    '/api/onboarding/:path*',
    '/api/contacts/:path*',
    '/contacts/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/schools/:path*',
  ],
}
