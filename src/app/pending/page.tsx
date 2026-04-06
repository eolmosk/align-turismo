'use client'

import { signOut, useSession } from 'next-auth/react'

export default function PendingPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-warm-200 p-8">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-warm-900 mb-2">Cuenta pendiente de aprobación</h1>
          <p className="text-warm-500 text-sm mb-6">
            Tu cuenta fue creada correctamente. Un director o administrador debe aprobarte antes de que puedas acceder a la plataforma.
          </p>
          {session?.user?.email && (
            <p className="text-xs text-warm-400 mb-6">Sesión iniciada como <span className="font-medium">{session.user.email}</span></p>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/auth' })}
            className="text-sm text-warm-500 hover:text-warm-700 underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
