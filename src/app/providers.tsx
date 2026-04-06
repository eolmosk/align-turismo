'use client'
import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import SchoolTheme from '@/components/SchoolTheme'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SchoolTheme />
      {children}
    </NextAuthSessionProvider>
  )
}
