'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
const STEPS = [
  { id: 1, label: 'Tu organización' },
  { id: 2, label: 'Cómo funciona' },
]

// ─── Flujo de aceptación de invitación ───────────────────────────────────────

function AcceptInvitationFlow({ token }: { token: string }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
  }, [status, router])

  const handleAccept = async () => {
    setState('loading')
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      const data = await res.json()
      setErrorMsg(data.error ?? 'Error al aceptar la invitación')
      setState('error')
      return
    }
    setState('success')
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {state === 'success' ? (
          <div className="bg-white rounded-2xl border border-warm-200 p-8 text-center">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg font-medium text-warm-900 mb-1">¡Bienvenido!</h1>
            <p className="text-sm text-warm-500">Tu cuenta quedó activada. Redirigiendo al dashboard...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-warm-200 p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-warm-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-xl font-medium text-warm-900 mb-1">Te invitaron a una organización</h1>
              <p className="text-sm text-warm-500">
                Hola{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}. Aceptá la invitación para acceder.
              </p>
            </div>

            {state === 'error' && (
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-brand-700">{errorMsg}</p>
              </div>
            )}

            <button onClick={handleAccept} disabled={state === 'loading'}
              className="w-full bg-brand text-white text-sm py-3.5 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
              {state === 'loading' ? 'Procesando...' : 'Aceptar invitación'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Flujo de onboarding de gerente ──────────────────────────────────────────

function DirectorOnboardingFlow() {
  const { data: session } = useSession()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [orgName, setOrgName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [managerName, setManagerName] = useState(session?.user?.name ?? '')

  const handleStep1 = async () => {
    if (!orgName.trim()) { setError('El nombre de la organización es requerido.'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolName: orgName, groupName, directorName: managerName }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Hubo un error guardando la organización. Intentá de nuevo.')
      return
    }
    setStep(2)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="bg-white border-b border-warm-200 px-6 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className={`flex items-center gap-2 ${step >= s.id ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    step > s.id ? 'bg-brand text-white' :
                    step === s.id ? 'bg-brand text-white' :
                    'border border-warm-300 text-warm-400'
                  }`}>
                    {step > s.id
                      ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                      : s.id}
                  </div>
                  <span className={`text-xs ${step === s.id ? 'text-warm-900 font-medium' : 'text-warm-400'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-12 h-px mx-3 ${step > s.id ? 'bg-brand' : 'bg-warm-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {step === 1 && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-warm-900 mb-2">
                  Bienvenido{session?.user?.name ? `, ${session.user.name.split(' ')[0]}` : ''}
                </h1>
                <p className="text-warm-500">Primero configuremos tu organización. Solo tarda un minuto.</p>
              </div>
              <div className="bg-white rounded-2xl border border-warm-200 p-6 space-y-5">
                <div>
                  <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Tu nombre *</label>
                  <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)}
                    placeholder="Ej: Carlos López" className="w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Nombre de la organización *</label>
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="Ej: Hotel Patagonia, Agencia Rumbos" className="w-full text-sm" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">
                    Cadena o grupo <span className="text-warm-400 normal-case font-normal">(opcional)</span>
                  </label>
                  <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)}
                    placeholder="Ej: Grupo Austral, Cadena Sol" className="w-full text-sm" />
                  <p className="text-xs text-warm-400 mt-1.5">
                    Si tu organización pertenece a un grupo o cadena, completá esto para habilitar el panel multi-propiedad.
                  </p>
                </div>
              </div>
              {error && <p className="text-sm text-brand-700 mt-3">{error}</p>}
              <button onClick={handleStep1} disabled={saving}
                className="w-full mt-5 bg-brand text-white text-sm py-3.5 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : 'Continuar →'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-warm-900 mb-2">Así funciona la app</h1>
                <p className="text-warm-500">Tres cosas que vas a poder hacer desde hoy.</p>
              </div>
              <div className="space-y-3">
                {[
                  { num: '1', title: 'Registrás la reunión', desc: 'Escribís las notas, dictás por voz o grabás la reunión en vivo. La app acepta cualquier formato.', color: 'bg-brand-50 text-brand' },
                  { num: '2', title: 'La IA genera el seguimiento', desc: 'Automáticamente aparecen 3 preguntas clave para la próxima reunión, los compromisos detectados y un resumen ejecutivo.', color: 'bg-purple-50 text-purple-700' },
                  { num: '3', title: 'Te avisamos antes de la próxima', desc: 'Si agendás la próxima reunión, recibís un aviso en Google Calendar 15 minutos antes con toda la guía lista.', color: 'bg-brand-50 text-brand' },
                ].map(item => (
                  <div key={item.num} className="bg-white rounded-xl border border-warm-200 p-5 flex gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${item.color}`}>{item.num}</div>
                    <div>
                      <p className="text-sm font-medium text-warm-900 mb-1">{item.title}</p>
                      <p className="text-sm text-warm-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => router.push('/meeting/new?onboarding=1')}
                  className="flex-1 bg-brand text-white text-sm py-3.5 rounded-xl font-medium hover:bg-brand-600 transition-colors">
                  Crear mi primera reunión →
                </button>
                <button onClick={() => router.push('/dashboard')}
                  className="px-5 py-3.5 text-sm text-warm-500 hover:text-warm-700 transition-colors">
                  Saltar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Router: elige qué flujo mostrar ─────────────────────────────────────────

function OnboardingContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  if (token) return <AcceptInvitationFlow token={token} />
  return <DirectorOnboardingFlow />
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  )
}
