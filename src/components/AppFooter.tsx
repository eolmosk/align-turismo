'use client'
import { usePathname } from 'next/navigation'

export default function AppFooter() {
  const pathname = usePathname()
  // No mostrar en landing, auth, onboarding
  if (pathname === '/' || pathname === '/auth' || pathname === '/onboarding') return null

  return (
    <footer className="mt-auto bg-white border-t border-warm-100 py-4 px-4">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm sm:text-base text-warm-500">
        <span>Desarrollado por</span>
        <span className="font-medium text-warm-700">FrameOps-Solutions</span>
        <span>para</span>
        <img src="/align-logo.png" alt="Align" className="inline-block align-middle" style={{ height: 28 }} />
      </div>
    </footer>
  )
}
