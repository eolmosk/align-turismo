'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { User, UserRole } from '@/types'
import SchoolLogo from '@/components/SchoolLogo'

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  director: 'Director',
  vicedirector: 'Vice-director',
  coordinador: 'Coordinador',
  docente: 'Docente',
  administrativo: 'Administrativo',
  pending: 'Pendiente',
}

const ASSIGNABLE_ROLES: UserRole[] = ['director', 'vicedirector', 'coordinador', 'docente', 'administrativo']

interface Invitation {
  id: string
  email: string
  role: UserRole
  accepted: boolean
  created_at: string
  expires_at: string
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'invite'>('users')
  const [toast, setToast] = useState('')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('docente')
  const [inviteLink, setInviteLink] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/auth'); return }
    if (status === 'authenticated') {
      const role = session?.user?.role
      if (role !== 'owner' && role !== 'director') {
        router.push('/dashboard')
      }
    }
  }, [status, session, router])

  useEffect(() => {
    if (!session) return
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/invitations').then(r => r.json()),
    ]).then(([u, inv]) => {
      setUsers(Array.isArray(u) ? u : [])
      setInvitations(Array.isArray(inv) ? inv : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [session])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const updateUser = async (userId: string, patch: { role?: UserRole; status?: string }) => {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...patch }),
    })
    if (!res.ok) { showToast('Error actualizando el usuario. Intentá de nuevo.'); return }
    const updated = await res.json()
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u))
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setInviteError('El email es requerido.'); return }
    setInviting(true); setInviteError(''); setInviteLink('')
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    setInviting(false)
    if (!res.ok) { setInviteError('Error creando la invitación.'); return }
    const data = await res.json()
    setInviteLink(data.invite_url)
    setInvitations(prev => [data, ...prev])
    setInviteEmail('')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  const pendingUsers = users.filter(u => u.status === 'pending')
  const activeUsers = users.filter(u => u.status === 'active')

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 bg-brand text-white text-sm px-5 py-3 rounded-xl z-50 shadow-lg">
          {toast}
        </div>
      )}
      <header className="bg-white border-b border-warm-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2 sm:gap-4">
          <Link href="/dashboard" className="text-warm-400 hover:text-warm-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="hidden sm:block"><SchoolLogo /></div>
          <h1 className="text-sm sm:text-base font-medium text-warm-900">Gestión de usuarios</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-warm-100 p-1 rounded-lg w-fit">
          <button onClick={() => setTab('users')}
            className={`text-sm px-4 py-2 rounded-md transition-colors ${tab === 'users' ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}>
            Usuarios
            {pendingUsers.length > 0 && (
              <span className="ml-2 bg-brand text-white text-xs px-1.5 py-0.5 rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('invite')}
            className={`text-sm px-4 py-2 rounded-md transition-colors ${tab === 'invite' ? 'bg-white text-warm-900 shadow-sm' : 'text-warm-500 hover:text-warm-700'}`}>
            Invitar
          </button>
        </div>

        {tab === 'users' && (
          <div className="space-y-4">
            {/* Pendientes de aprobación */}
            {pendingUsers.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 bg-brand-50">
                  <h2 className="text-sm font-medium text-amber-900">
                    Solicitudes de acceso ({pendingUsers.length})
                  </h2>
                </div>
                <div className="divide-y divide-warm-100">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center text-sm font-medium text-warm-600 flex-shrink-0">
                        {(u.name ?? u.email ?? '?')[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-warm-900 truncate">{u.name ?? u.email}</p>
                        <p className="text-xs text-warm-500 truncate">{u.email}</p>
                        {u.requested_school_name && (
                          <p className="text-xs text-warm-400">Escuela: {u.requested_school_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <select
                          defaultValue="docente"
                          className="text-xs border border-warm-200 rounded-lg px-2 py-1.5"
                          onChange={e => updateUser(u.id, { role: e.target.value as UserRole })}
                        >
                          {ASSIGNABLE_ROLES.map(r => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => updateUser(u.id, { status: 'active' })}
                          className="text-xs bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors">
                          Aprobar
                        </button>
                        <button
                          onClick={() => updateUser(u.id, { status: 'rejected' })}
                          className="text-xs text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors">
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usuarios activos */}
            <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-warm-100">
                <h2 className="text-sm font-medium text-warm-900">Usuarios activos ({activeUsers.length})</h2>
              </div>
              {activeUsers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-warm-500">No hay usuarios activos todavía.</p>
                </div>
              ) : (
                <div className="divide-y divide-warm-100">
                  {activeUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center text-sm font-medium text-warm-600 flex-shrink-0">
                        {(u.name ?? u.email ?? '?')[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-warm-900 truncate">{u.name ?? u.email}</p>
                        <p className="text-xs text-warm-500 truncate">{u.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {u.id === session?.user?.id ? (
                          <span className="text-xs text-warm-400">{ROLE_LABELS[u.role]} (vos)</span>
                        ) : (
                          <select
                            value={u.role}
                            className="text-xs border border-warm-200 rounded-lg px-2 py-1.5"
                            onChange={e => updateUser(u.id, { role: e.target.value as UserRole })}
                          >
                            {ASSIGNABLE_ROLES.map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'invite' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-warm-200 p-5 space-y-4">
              <h2 className="text-sm font-medium text-warm-900">Generar link de invitación</h2>

              <div>
                <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="nombre@escuela.edu"
                  className="w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-warm-500 uppercase tracking-wide block mb-1.5">Rol</label>
                <div className="flex gap-2 flex-wrap">
                  {ASSIGNABLE_ROLES.map(r => (
                    <button key={r} onClick={() => setInviteRole(r)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${inviteRole === r ? 'bg-brand text-white border-brand' : 'border-warm-200 text-warm-600 hover:border-warm-300'}`}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              {inviteError && <p className="text-sm text-brand-700">{inviteError}</p>}

              <button onClick={handleInvite} disabled={inviting}
                className="w-full bg-brand text-white text-sm py-3 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
                {inviting ? 'Generando...' : 'Generar link de invitación'}
              </button>
            </div>

            {inviteLink && (
              <div className="bg-brand-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-medium text-brand-700 mb-2">Link generado — válido por 7 días</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-brand-700 bg-brand-50 rounded-lg px-3 py-2 break-all">
                    {inviteLink}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="text-xs text-brand border border-brand-200 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0">
                    Copiar
                  </button>
                </div>
              </div>
            )}

            {/* Invitaciones anteriores */}
            {invitations.length > 0 && (
              <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-warm-100">
                  <h3 className="text-sm font-medium text-warm-900">Invitaciones enviadas</h3>
                </div>
                <div className="divide-y divide-warm-100">
                  {invitations.map(inv => (
                    <div key={inv.id} className="flex items-center gap-4 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-warm-900 truncate">{inv.email}</p>
                        <p className="text-xs text-warm-500">{ROLE_LABELS[inv.role]}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        inv.accepted ? 'bg-brand-50 text-brand' : 'bg-warm-100 text-warm-500'
                      }`}>
                        {inv.accepted ? 'Aceptada' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
