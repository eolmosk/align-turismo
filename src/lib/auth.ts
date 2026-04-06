import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { supabaseAdmin } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid email profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false

      // Upsert user in Supabase on every login
      const { error } = await supabaseAdmin.from('users').upsert(
        {
          email: user.email,
          name: user.name,
          avatar_url: user.image,
          google_refresh_token: account?.refresh_token ?? undefined,
        },
        { onConflict: 'email', ignoreDuplicates: false }
      )

      if (error) {
        console.error('Error syncing user to Supabase:', error)
        return false
      }
      return true
    },

    async session({ session, token }) {
      // Fetch full user record from Supabase to attach school_id and role
      if (session.user?.email) {
        // Intentar con campos de branding; fallback sin ellos si la migración no corrió
        let dbUser: any = null
        const { data: full } = await supabaseAdmin
          .from('users')
          .select('id, role, school_id, status, schools(name, group_name, logo_url, color_primary, color_secondary, color_accent)')
          .eq('email', session.user.email)
          .single()
        if (full) {
          dbUser = full
        } else {
          const { data: basic } = await supabaseAdmin
            .from('users')
            .select('id, role, school_id, status, schools(name, group_name)')
            .eq('email', session.user.email)
            .single()
          dbUser = basic
        }

        if (dbUser) {
          session.user.id = dbUser.id
          session.user.role = dbUser.role
          session.user.school_id = dbUser.school_id
          session.user.status = dbUser.status
          session.user.school = dbUser.schools as any
        }
      }
      // Pass Google access token for Calendar / Drive calls
      session.accessToken = token.accessToken as string | undefined
      session.refreshToken = token.refreshToken as string | undefined
      return session
    },

    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        // Fetch status on first sign-in so middleware can gate access
        if (token.email) {
          const { data: dbUser } = await supabaseAdmin
            .from('users')
            .select('status')
            .eq('email', token.email)
            .single()
          token.status = dbUser?.status ?? 'pending'
        }
      }
      return token
    },
  },

  pages: {
    signIn: '/auth',
    error: '/auth',
  },

  session: { strategy: 'jwt' },
}
