'use client'
import { usePathname } from 'next/navigation'

export default function AppFooter() {
  const pathname = usePathname()
  // No mostrar en auth/onboarding
  if (pathname === '/auth' || pathname === '/onboarding') return null

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-transparent py-4 px-6 z-40">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-sm text-gray-300">
        <span>Desarrollado por</span>
        <img src="/align-logo.png" alt="Align" className="inline-block" style={{ height: 30 }} />
        <span>para</span>
        <span className="font-medium text-gray-400">FrameOps-Solutions</span>
      </div>
    </footer>
  )
}
