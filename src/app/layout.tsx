import type { Metadata, Viewport } from 'next'
import './globals.css'
import { SessionProvider } from './providers'
import AppFooter from '@/components/AppFooter'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'Align — Reuniones escolares',
  description: 'Gestión de reuniones escolares con IA',
  manifest: '/manifest.json',
  applicationName: 'Align',
  appleWebApp: {
    capable: true,
    title: 'Align',
    statusBarStyle: 'default',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=neue-montreal@300,400,500,700&display=swap" />
      </head>
      <body className="min-h-screen flex flex-col">
        <SessionProvider>
          {children}
          <AppFooter />
        </SessionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
