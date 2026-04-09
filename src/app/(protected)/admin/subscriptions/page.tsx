'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PLANS, PlanId, SubStatus } from '@/lib/subscription'

interface Row {
  id: string
  name: string
  group_name: string | null
  created_at: string
  subscriptions: Array<{
    id: string
    plan: PlanId
    status: SubStatus
    trial_ends_at: string
    active_until: string | null
    notes: string | null
  }> | null
}

const OWNER_GLOBAL_ID = '757692ca-333e-469d-a9eb-d370db452cde'

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.id !== OWNER_GLOBAL_ID) return
    fetch('/api/admin/subscriptions')
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [session, status])

  if (status === 'loading') return <Main>Cargando…</Main>
  if (session?.user?.id !== OWNER_GLOBAL_ID) {
    return <Main>Sin permisos.</Main>
  }

  async function update(schoolId: string, patch: Record<string, any>) {
    setSaving(schoolId)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, ...patch }),
      })
      if (!res.ok) throw new Error('Error')
      // Refrescar
      const fresh = await fetch('/api/admin/subscriptions').then((r) => r.json())
      setRows(Array.isArray(fresh) ? fresh : [])
    } catch (e) {
      alert('Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Main>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-warm-500 hover:text-warm-700">← Admin</Link>
          <h1 className="text-2xl font-semibold text-warm-900 mt-2">Suscripciones</h1>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-warm-500">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-warm-500">Sin escuelas.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const sub = row.subscriptions?.[0]
            return (
              <div key={row.id} className="bg-white border border-warm-200 rounded-xl p-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="font-semibold text-warm-900">{row.name}</h3>
                    {row.group_name && <p className="text-xs text-warm-500">{row.group_name}</p>}
                    <p className="text-xs text-warm-400 mt-1">Creada: {new Date(row.created_at).toLocaleDateString()}</p>
                  </div>
                  {sub && <StatusPill status={sub.status} />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <label className="text-xs">
                    <span className="block text-warm-500 mb-1">Plan</span>
                    <select
                      value={sub?.plan ?? 'trial'}
                      onChange={(e) => update(row.id, { plan: e.target.value })}
                      className="w-full"
                    >
                      <option value="trial">trial</option>
                      {PLANS.map((p) => (
                        <option key={p.id} value={p.id}>{p.id}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs">
                    <span className="block text-warm-500 mb-1">Estado</span>
                    <select
                      value={sub?.status ?? 'trialing'}
                      onChange={(e) => update(row.id, { status: e.target.value })}
                      className="w-full"
                    >
                      <option value="trialing">trialing</option>
                      <option value="active">active</option>
                      <option value="expired">expired</option>
                      <option value="canceled">canceled</option>
                    </select>
                  </label>

                  <label className="text-xs">
                    <span className="block text-warm-500 mb-1">Trial vence</span>
                    <input
                      type="date"
                      defaultValue={sub?.trial_ends_at ? sub.trial_ends_at.slice(0, 10) : ''}
                      onBlur={(e) => {
                        const val = e.target.value
                        if (val) update(row.id, { trial_ends_at: new Date(val).toISOString() })
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="text-xs">
                    <span className="block text-warm-500 mb-1">Activo hasta</span>
                    <input
                      type="date"
                      defaultValue={sub?.active_until ? sub.active_until.slice(0, 10) : ''}
                      onBlur={(e) => {
                        const val = e.target.value
                        update(row.id, { active_until: val ? new Date(val).toISOString() : null })
                      }}
                      className="w-full"
                    />
                  </label>

                  <label className="text-xs sm:col-span-2">
                    <span className="block text-warm-500 mb-1">Notas</span>
                    <input
                      type="text"
                      defaultValue={sub?.notes ?? ''}
                      onBlur={(e) => update(row.id, { notes: e.target.value })}
                      placeholder="Pago recibido por transferencia 15/04…"
                      className="w-full"
                    />
                  </label>
                </div>

                {saving === row.id && <p className="text-xs text-warm-400 mt-2">Guardando…</p>}
              </div>
            )
          })}
        </div>
      )}
    </Main>
  )
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
}

function StatusPill({ status }: { status: SubStatus }) {
  const styles: Record<SubStatus, string> = {
    trialing: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-700',
    canceled: 'bg-warm-100 text-warm-700',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status]}`}>{status}</span>
}
