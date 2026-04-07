'use client'
import { usePathname } from 'next/navigation'

export default function AppFooter() {
  const pathname = usePathname()
  // No mostrar en landing, auth, onboarding
  if (pathname === '/' || pathname === '/auth' || pathname === '/onboarding') return null

  return (
    <footer className="mt-auto bg-white border-t border-warm-100 py-4 px-6">
      <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-sm text-warm-400">
        <span>Desarrollado por</span>
        <img src="/align-logo.png" alt="Align" className="inline-block" style={{ height: 30 }} />
        <span>para</span>
        <span className="font-medium text-gray-400">FrameOps-Solutions</span>
      </div>
    </footer>
  )
}
