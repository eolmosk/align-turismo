'use client'
import { useEffect, useState } from 'react'

interface Member {
  id: string
  name: string | null
  email: string
  role?: string
}

interface Contact {
  id: string
  name: string
  email?: string | null
  role?: string | null
}

interface Props {
  currentUserId: string | null
  currentContactId: string | null
  onSelect: (value: { userId: string | null; contactId: string | null }) => void
  onClose: () => void
}

/**
 * Dropdown para asignar una acción a un usuario de la escuela o un contacto.
 * Muestra "Sin asignar" como opción para limpiar la asignación.
 */
export default function AssigneePicker({ currentUserId, currentContactId, onSelect, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/school/members').then((r) => r.json()),
      fetch('/api/contacts').then((r) => r.json()),
    ])
      .then(([m, c]) => {
        setMembers(Array.isArray(m) ? m : [])
        setContacts(Array.isArray(c) ? c : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filterText = search.toLowerCase().trim()
  const filteredMembers = filterText
    ? members.filter((m) => (m.name ?? m.email).toLowerCase().includes(filterText))
    : members
  const filteredContacts = filterText
    ? contacts.filter((c) => c.name.toLowerCase().includes(filterText))
    : contacts

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-xl border border-warm-200 shadow-xl w-full max-w-md max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-warm-100">
          <h3 className="text-sm font-medium text-warm-900 mb-2">Asignar responsable</h3>
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario o contacto..."
            className="w-full text-sm bg-warm-50 border border-warm-200 rounded-lg px-3 py-2"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <div className="w-5 h-5 border-2 border-warm-200 border-t-brand rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-warm-100">
              <button
                onClick={() => { onSelect({ userId: null, contactId: null }); onClose() }}
                className="w-full text-left px-4 py-3 hover:bg-warm-50 text-sm text-warm-500"
              >
                Sin asignar
              </button>

              {filteredMembers.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-medium text-warm-400 uppercase tracking-wide">
                    Usuarios de la escuela
                  </p>
                  {filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { onSelect({ userId: m.id, contactId: null }); onClose() }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-warm-50 flex items-center justify-between ${
                        currentUserId === m.id ? 'bg-brand-50' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-warm-900 truncate">{m.name ?? m.email}</p>
                        {m.name && <p className="text-xs text-warm-400 truncate">{m.email}</p>}
                      </div>
                      {currentUserId === m.id && <span className="text-xs text-brand flex-shrink-0">✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {filteredContacts.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-medium text-warm-400 uppercase tracking-wide">
                    Contactos
                  </p>
                  {filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { onSelect({ userId: null, contactId: c.id }); onClose() }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-warm-50 flex items-center justify-between ${
                        currentContactId === c.id ? 'bg-brand-50' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-warm-900 truncate">{c.name}</p>
                        {c.role && <p className="text-xs text-warm-400 truncate">{c.role}</p>}
                      </div>
                      {currentContactId === c.id && <span className="text-xs text-brand flex-shrink-0">✓</span>}
                    </button>
                  ))}
                </div>
              )}

              {!loading && filteredMembers.length === 0 && filteredContacts.length === 0 && (
                <p className="text-center py-8 text-sm text-warm-400">Sin resultados</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
