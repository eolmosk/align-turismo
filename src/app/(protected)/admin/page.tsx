'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { invalidateBrandCache } from '@/components/SchoolBranding'

const ADMIN_USER_ID = '757692ca-333e-469d-a9eb-d370db452cde'

interface School {
  id: string; name: string; group_name: string | null
  logo_url: string | null; color_primary: string; color_secondary: string; color_accent: string
  created_at: string
}

interface AdminUser {
  id: string; email: string; name: string | null; role: string; status: string
  school_id: string | null; onboarded: boolean; created_at: string
  schools: { school_id: string; school_name: string; role: string }[]
}

// Derivar tonos desde un color hex
function deriveTones(hex: string): Record<string, string> {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number, w: number, t: number) => Math.round(c * (1 - t) + w * t)
  const toHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
  return {
    '50': toHex(mix(r, 255, 0.92), mix(g, 255, 0.92), mix(b, 255, 0.92)),
    '100': toHex(mix(r, 255, 0.82), mix(g, 255, 0.82), mix(b, 255, 0.82)),
    '200': toHex(mix(r, 255, 0.6), mix(g, 255, 0.6), mix(b, 255, 0.6)),
    '300': toHex(mix(r, 255, 0.4), mix(g, 255, 0.4), mix(b, 255, 0.4)),
    '400': toHex(mix(r, 255, 0.15), mix(g, 255, 0.15), mix(b, 255, 0.15)),
    '500': hex,
    '600': toHex(mix(r, 0, 0.15), mix(g, 0, 0.15), mix(b, 0, 0.15)),
    '700': toHex(mix(r, 0, 0.3), mix(g, 0, 0.3), mix(b, 0, 0.3)),
  }
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [showTones, setShowTones] = useState(false)
  const tones = deriveTones(value || '#000000')
  return (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="text-sm border border-gray-200 rounded px-2 py-1 w-24 font-mono"
          placeholder="#000000"
        />
        <button
          type="button"
          onClick={() => setShowTones(!showTones)}
          className="text-[10px] text-gray-400 hover:text-gray-600 underline"
        >
          {showTones ? 'Ocultar tonos' : 'Ver tonos'}
        </button>
      </div>
      {showTones && (
        <div className="flex gap-1 mt-2">
          {Object.entries(tones).map(([key, hex]) => (
            <div key={key} className="text-center">
              <div className="w-8 h-8 rounded border border-gray-100" style={{ background: hex }} />
              <p className="text-[9px] text-gray-400 mt-0.5">{key}</p>
              <p className="text-[8px] text-gray-300 font-mono">{hex}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Escuelas Tab ───
function EscuelasTab({ schools, onReload }: { schools: School[]; onReload: () => void }) {
  const [editing, setEditing] = useState<School | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '', group_name: '', logo_url: '',
    color_primary: '#CD4700', color_secondary: '#7C7066', color_accent: '#E05A00',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const uploadLogo = async (file: File) => {
    if (!editing) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('school_id', editing.id)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    setUploading(false)
    if (res.ok) {
      const { logo_url } = await res.json()
      setForm({ ...form, logo_url })
      showToast('Logo subido')
      invalidateBrandCache()
      onReload()
    } else {
      showToast('Error subiendo el logo')
    }
  }

  const deleteSchool = async (s: School) => {
    if (!confirm(`¿Eliminar "${s.name}"? Esta acción no se puede deshacer. Se eliminarán todos los hilos, reuniones y datos asociados.`)) return
    const res = await fetch('/api/admin/schools', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id }),
    })
    if (res.ok) { showToast('Escuela eliminada'); onReload() }
    else showToast('Error eliminando la escuela')
  }

  const startEdit = (s: School) => {
    setEditing(s)
    setCreating(false)
    setForm({
      name: s.name, group_name: s.group_name || '',
      logo_url: s.logo_url || '',
      color_primary: s.color_primary || '#CD4700',
      color_secondary: s.color_secondary || '#7C7066',
      color_accent: s.color_accent || '#E05A00',
    })
  }

  const startCreate = () => {
    setEditing(null)
    setCreating(true)
    setForm({ name: '', group_name: '', logo_url: '', color_primary: '#CD4700', color_secondary: '#7C7066', color_accent: '#E05A00' })
  }

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const url = '/api/admin/schools'
    const method = editing ? 'PATCH' : 'POST'
    const body = editing ? { id: editing.id, ...form } : form
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      showToast(editing ? 'Escuela actualizada' : 'Escuela creada')
      setEditing(null)
      setCreating(false)
      onReload()
    } else {
      showToast('Error guardando')
    }
  }

  const isOpen = editing || creating

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm z-50">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">{schools.length} escuela{schools.length !== 1 ? 's' : ''} registrada{schools.length !== 1 ? 's' : ''}</p>
        <button onClick={startCreate} className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
          + Nueva escuela
        </button>
      </div>

      {/* Form crear/editar */}
      {isOpen && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">{editing ? 'Editar escuela' : 'Nueva escuela'}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nombre *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Grupo</label>
              <input value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Logo / escudo</label>
            <div className="flex items-center gap-3">
              {editing && (
                <label className={`text-sm border border-dashed border-gray-300 rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? 'Subiendo...' : 'Subir imagen'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f) }} />
                </label>
              )}
              <span className="text-xs text-gray-400">o</span>
              <input value={form.logo_url} onChange={e => setForm({ ...form, logo_url: e.target.value })}
                placeholder="URL: https://..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400" />
              {form.logo_url && (
                <img src={form.logo_url} alt="Preview" className="w-10 h-10 rounded-lg object-contain border border-gray-100" />
              )}
            </div>
            {!editing && <p className="text-[10px] text-gray-400 mt-1">Guardá la escuela primero, luego podés subir la imagen.</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <ColorField label="Color primario" value={form.color_primary} onChange={v => setForm({ ...form, color_primary: v })} />
            <ColorField label="Color secundario" value={form.color_secondary} onChange={v => setForm({ ...form, color_secondary: v })} />
            <ColorField label="Color acento" value={form.color_accent} onChange={v => setForm({ ...form, color_accent: v })} />
          </div>

          {/* Preview de la paleta */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Preview</p>
            <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-100" style={{ background: form.color_primary }}>
              {form.logo_url && <img src={form.logo_url} alt="" className="w-8 h-8 rounded object-contain" />}
              <span className="text-white font-semibold text-sm">{form.name || 'Nombre de la escuela'}</span>
              <div className="ml-auto flex gap-2">
                <span className="text-xs px-2 py-1 rounded" style={{ background: form.color_secondary, color: 'white' }}>Secundario</span>
                <span className="text-xs px-2 py-1 rounded" style={{ background: form.color_accent, color: 'white' }}>Acento</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(null); setCreating(false) }}
              className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700">Cancelar</button>
            <button onClick={save} disabled={saving || !form.name.trim()}
              className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de escuelas */}
      <div className="space-y-3">
        {schools.map(s => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-gray-300 transition-colors">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100"
              style={{ background: s.color_primary }}>
              {s.logo_url
                ? <img src={s.logo_url} alt="" className="w-full h-full object-contain" />
                : <span className="text-white font-bold text-sm">{s.name.charAt(0)}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
              {s.group_name && <p className="text-xs text-gray-400">{s.group_name}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-full border border-gray-100" style={{ background: s.color_primary }} title="Primario" />
                <div className="w-4 h-4 rounded-full border border-gray-100" style={{ background: s.color_secondary }} title="Secundario" />
                <div className="w-4 h-4 rounded-full border border-gray-100" style={{ background: s.color_accent }} title="Acento" />
              </div>
              <button onClick={() => startEdit(s)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                Editar
              </button>
              <button onClick={() => deleteSchool(s)} className="text-xs text-gray-300 hover:text-red-500 px-2 py-1 transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Usuarios Tab ───
function UsuariosTab({ users, schools, onReload }: { users: AdminUser[]; schools: School[]; onReload: () => void }) {
  const [assignUserId, setAssignUserId] = useState<string | null>(null)
  const [assignSchoolId, setAssignSchoolId] = useState('')
  const [assignRole, setAssignRole] = useState('docente')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const assignSchool = async () => {
    if (!assignUserId || !assignSchoolId) return
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: assignUserId, school_id: assignSchoolId, role: assignRole }),
    })
    setSaving(false)
    if (res.ok) { showToast('Usuario asignado'); setAssignUserId(null); onReload() }
    else showToast('Error asignando')
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm z-50">{toast}</div>
      )}

      <p className="text-sm text-gray-500 mb-6">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>

      <div className="space-y-3">
        {users.map(u => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-gray-500">{(u.name || u.email).charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{u.name || u.email}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  u.status === 'active' ? 'bg-green-50 text-green-700' :
                  u.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-red-50 text-red-700'
                }`}>{u.status}</span>
                <button onClick={() => { setAssignUserId(assignUserId === u.id ? null : u.id); setAssignSchoolId(''); setAssignRole('docente') }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">
                  {assignUserId === u.id ? 'Cerrar' : '+ Escuela'}
                </button>
              </div>
            </div>

            {/* Escuelas del usuario */}
            {u.schools.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-13">
                {u.schools.map(s => (
                  <span key={s.school_id} className="text-[10px] bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full border border-gray-100">
                    {s.school_name} ({s.role})
                  </span>
                ))}
              </div>
            )}

            {/* Formulario asignar escuela */}
            {assignUserId === u.id && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-gray-500 block mb-1">Escuela</label>
                  <select value={assignSchoolId} onChange={e => setAssignSchoolId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                    <option value="">Seleccionar...</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-medium text-gray-500 block mb-1">Rol</label>
                  <select value={assignRole} onChange={e => setAssignRole(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                    {['owner', 'director', 'vicedirector', 'coordinador', 'docente', 'administrativo'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <button onClick={assignSchool} disabled={saving || !assignSchoolId}
                  className="text-sm bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50">
                  {saving ? '...' : 'Asignar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Page ───
export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<'escuelas' | 'usuarios'>('escuelas')
  const [schools, setSchools] = useState<School[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id || session.user.id !== ADMIN_USER_ID) {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [session, status])

  const loadData = async () => {
    setLoading(true)
    const [schoolsRes, usersRes] = await Promise.all([
      fetch('/api/admin/schools'),
      fetch('/api/admin/users'),
    ])
    if (schoolsRes.ok) setSchools(await schoolsRes.json())
    if (usersRes.ok) setUsers(await usersRes.json())
    setLoading(false)
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  const tabs = [
    { id: 'escuelas' as const, label: 'Escuelas', count: schools.length },
    { id: 'usuarios' as const, label: 'Usuarios', count: users.length },
  ]

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-gray-900">Panel de administración</h1>
            <p className="text-[11px] sm:text-xs text-gray-400 truncate">Align &middot; Gestión de escuelas y usuarios</p>
          </div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg whitespace-nowrap flex-shrink-0">
            Volver
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.label}
              <span className="ml-1.5 text-xs text-gray-300">{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20">
        {tab === 'escuelas' && <EscuelasTab schools={schools} onReload={loadData} />}
        {tab === 'usuarios' && <UsuariosTab users={users} schools={schools} onReload={loadData} />}
      </main>
    </div>
  )
}
