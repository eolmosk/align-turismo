'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Link from 'next/link'
import { Contact } from '@/types'
import SchoolLogo from '@/components/SchoolLogo'

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  return lines.slice(1).map(line => {
    // Manejo básico de campos con comas dentro de comillas
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { values.push(current.trim()); current = '' }
      else current += ch
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { if (values[i] !== undefined) row[h] = values[i] })
    return row
  }).filter(row => Object.values(row).some(v => v.trim()))
}

const ROLE_COLOR: Record<string, string> = {}
function roleColor(role: string | null) {
  if (!role) return 'bg-warm-100 text-warm-600'
  const r = role.toLowerCase()
  if (r.includes('docente') || r.includes('profesor')) return 'bg-brand-50 text-brand'
  if (r.includes('padre') || r.includes('madre') || r.includes('tutor') || r.includes('familia')) return 'bg-brand-50 text-brand'
  if (r.includes('director') || r.includes('coord')) return 'bg-purple-50 text-purple-700'
  return 'bg-warm-100 text-warm-600'
}

export default function ContactsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')

  // CSV import
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [csvFileName, setCsvFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null)
  const [showImport, setShowImport] = useState(false)

  const [toast, setToast] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth')
  }, [status, router])

  const fetchContacts = async () => {
    const res = await fetch('/api/contacts')
    if (res.ok) setContacts(await res.json())
    setLoading(false)
  }

  useEffect(() => { if (session) fetchContacts() }, [session])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name}? Se desvinculará de todas las reuniones.`)) return
    const res = await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setContacts(prev => prev.filter(c => c.id !== id)); showToast('Contacto eliminado') }
    else showToast('Error eliminando el contacto')
  }

  const onDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (!file) return
    setCsvFileName(file.name)
    setImportResult(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] }, maxFiles: 1,
  })

  const handleImport = async () => {
    if (csvRows.length === 0) return
    setImporting(true)
    const res = await fetch('/api/contacts/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: csvRows }),
    })
    setImporting(false)
    if (!res.ok) { showToast('Error importando contactos'); return }
    const result = await res.json()
    setImportResult(result)
    setCsvRows([]); setCsvFileName('')
    fetchContacts()
  }

  const roles = Array.from(new Set(contacts.map(c => c.role).filter(Boolean))) as string[]

  const filtered = contacts.filter(c => {
    if (filterRole && c.role !== filterRole) return false
    if (search && !`${c.name} ${c.email ?? ''} ${c.role ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-white">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-brand text-white text-sm px-5 py-3 rounded-xl z-50 shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-warm-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link href="/dashboard" className="text-warm-400 hover:text-warm-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <SchoolLogo />
          <div className="flex-1">
            <h1 className="text-base font-medium text-warm-900">Contactos</h1>
            <p className="text-xs text-warm-500">{contacts.length} contacto{contacts.length !== 1 ? 's' : ''} · {session?.user?.school?.name}</p>
          </div>
          <button onClick={() => { setShowImport(!showImport); setImportResult(null) }}
            className="text-xs border border-warm-200 text-warm-600 px-3 py-2 rounded-lg hover:bg-warm-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Importar CSV
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Panel de importación CSV */}
        {showImport && (
          <div className="bg-white rounded-xl border border-warm-200 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-warm-900">Importar desde CSV</h2>
              <button onClick={() => setShowImport(false)} className="text-warm-400 hover:text-warm-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
              <p className="text-xs text-brand-700 font-medium mb-1">Formato esperado</p>
              <code className="text-xs text-brand block">name, email, phone, role</code>
              <p className="text-xs text-brand mt-1">
                Las columnas extra se guardan automáticamente. Si ya existe un contacto con el mismo email, se actualiza.
              </p>
            </div>

            <div {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-brand-400 bg-brand-50' : 'border-warm-200 hover:border-warm-300'}`}>
              <input {...getInputProps()} />
              <svg className="w-8 h-8 text-warm-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {csvFileName
                ? <p className="text-sm text-brand font-medium">{csvFileName} — {csvRows.length} filas</p>
                : <p className="text-sm text-warm-500">Arrastrá el CSV o hacé clic para seleccionar</p>}
            </div>

            {/* Preview */}
            {csvRows.length > 0 && (
              <div>
                <p className="text-xs text-warm-500 mb-2">{csvRows.length} contactos listos para importar (preview de los primeros 5):</p>
                <div className="bg-warm-50 rounded-lg overflow-hidden divide-y divide-warm-100">
                  {csvRows.slice(0, 5).map((row, i) => (
                    <div key={i} className="px-3 py-2 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-warm-200 flex items-center justify-center text-xs text-warm-500 flex-shrink-0">
                        {(row.name || row.nombre || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-warm-900 truncate">{row.name || row.nombre}</p>
                        {(row.email || row.correo) && <p className="text-xs text-warm-400">{row.email || row.correo}</p>}
                      </div>
                      {(row.role || row.rol) && (
                        <span className="text-xs text-warm-500">{row.role || row.rol}</span>
                      )}
                    </div>
                  ))}
                  {csvRows.length > 5 && (
                    <div className="px-3 py-2 text-xs text-warm-400">+{csvRows.length - 5} más...</div>
                  )}
                </div>
                <button onClick={handleImport} disabled={importing}
                  className="w-full mt-3 bg-brand text-white text-sm py-2.5 rounded-xl font-medium hover:bg-brand-600 transition-colors disabled:opacity-50">
                  {importing ? 'Importando...' : `Importar ${csvRows.length} contactos`}
                </button>
              </div>
            )}

            {/* Resultado */}
            {importResult && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg p-3">
                <p className="text-sm text-brand-700 font-medium">Importación completada</p>
                <p className="text-xs text-brand mt-0.5">
                  {importResult.inserted} nuevos · {importResult.updated} actualizados
                  {importResult.skipped > 0 && ` · ${importResult.skipped} sin nombre (omitidos)`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Búsqueda y filtros */}
        <div className="flex gap-2 flex-wrap">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o rol..."
            className="flex-1 min-w-48 text-sm bg-white border border-warm-200 rounded-xl px-4 py-2.5" />
          {roles.length > 0 && (
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="text-xs border border-warm-200 rounded-xl px-3 py-2.5 bg-white">
              <option value="">Todos los roles</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>

        {/* Lista de contactos */}
        <div className="bg-white rounded-xl border border-warm-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              {contacts.length === 0 ? (
                <>
                  <div className="w-12 h-12 bg-warm-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-warm-900 mb-1">No hay contactos todavía</p>
                  <p className="text-sm text-warm-500 mb-5">Importá un CSV o agregá contactos al registrar reuniones.</p>
                  <button onClick={() => setShowImport(true)}
                    className="text-sm bg-brand text-white px-5 py-2.5 rounded-lg hover:bg-brand-600 transition-colors">
                    Importar CSV
                  </button>
                </>
              ) : (
                <p className="text-sm text-warm-400 py-4">No hay contactos que coincidan con la búsqueda.</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-warm-100">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-warm-50 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0 text-sm font-medium text-warm-600">
                    {(c.name ?? '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-900 truncate">{c.name}</p>
                    <p className="text-xs text-warm-400 truncate">
                      {[c.email, c.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                    </p>
                  </div>
                  {c.role && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${roleColor(c.role)}`}>
                      {c.role}
                    </span>
                  )}
                  {c.source !== 'manual' && (
                    <span className="text-xs text-warm-300 flex-shrink-0">{c.source}</span>
                  )}
                  <button onClick={() => handleDelete(c.id, c.name)}
                    className="opacity-0 group-hover:opacity-100 text-warm-300 hover:text-brand-700 transition-all p-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
