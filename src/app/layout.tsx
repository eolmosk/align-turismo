import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from './providers'
import AppFooter from '@/components/AppFooter'

export const metadata: Metadata = {
  title: 'Gestor de reuniones',
  description: 'Sistema de gestión de minutas con IA para directores escolares',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=neue-montreal@300,400,500,700&display=swap" />
      </head>
      <body>
        <SessionProvider>
          {children}
          <AppFooter />
        </SessionProvider>
      </body>
    </html>
  )
}
