import NextAuth, { DefaultSession } from 'next-auth'
import { UserRole, UserStatus } from '.'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    refreshToken?: string
    user: {
      id: string
      role: UserRole
      status?: UserStatus
      school_id: string | null
      school?: {
        name: string; group_name: string | null
        logo_url?: string | null; color_primary?: string; color_secondary?: string; color_accent?: string
      } | null
    } & DefaultSession['user']
  }
}
